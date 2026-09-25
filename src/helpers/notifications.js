import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import {setFcmToken} from '../redux/actions/pro.actions';
import {registerFCMToken} from '../api/settings';

const MESSAGES_CHANNEL_ID = 'messages_admin';
const MISSIONS_CHANNEL_ID = 'missions_channel';

const ensureMessagesChannel = async () => {
  await notifee.createChannel({
    id: MESSAGES_CHANNEL_ID,
    name: 'Messages de l\'administration',
    importance: AndroidImportance.HIGH,
  });
};

/**
 * Channel dédié aux notifications de mission (début de mission, rappel 24h,
 * demande de prolongation) envoyées par le serveur via FCM — son + vibration
 * explicites pour qu'elles se fassent remarquer même app fermée.
 */
const ensureMissionsChannel = async () => {
  await notifee.createChannel({
    id: MISSIONS_CHANNEL_ID,
    name: 'Missions',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
  });
};

/**
 * Affiche une bannière de notification pendant que l'app est ouverte
 * (foreground), quel que soit l'écran affiché — icône + sujet du message.
 */
const afficherNotificationMessage = async remoteMessage => {
  try {
    console.log('[FCM] afficherNotificationMessage: début');
    await ensureMessagesChannel();
    console.log('[FCM] afficherNotificationMessage: channel OK');
    const titre = remoteMessage?.notification?.title || "L'administration YouzFul";
    const sujet = remoteMessage?.notification?.body || remoteMessage?.data?.sujet || 'Nouveau message';

    const settings = await notifee.requestPermission();
    console.log('[FCM] notifee.requestPermission:', JSON.stringify(settings));

    const id = await notifee.displayNotification({
      title: titre,
      body: sujet,
      data: remoteMessage?.data,
      android: {
        channelId: MESSAGES_CHANNEL_ID,
        smallIcon: 'ic_notification',
        pressAction: {id: 'default'},
      },
    });
    console.log('[FCM] afficherNotificationMessage: affichée, id=', id);
  } catch (error) {
    console.log('[FCM] afficherNotificationMessage ERREUR:', error?.message || error);
  }
};

/**
 * Navigate vers le bon écran depuis une notification.
 * Utilise la navigationRef pour fonctionner hors composant React.
 */
const navigateFromNotification = (remoteMessage, navigationRef) => {
  if (!navigationRef || !navigationRef.isReady()) return;
  const type = remoteMessage?.data?.type;
  try {
    switch (type) {
      case 'nouvelle_demande':
        navigationRef.navigate('Demandes');
        break;
      case 'detail_demande':
        navigationRef.navigate('DemandeDetail', {
          demande: {
            id: remoteMessage.data?.id,
            type_service: remoteMessage.data?.type_service,
          },
        });
        break;
      case 'message_admin':
        navigationRef.navigate('Main', {
          screen: 'ProfilTab',
          params: {screen: 'ContactAdmin'},
        });
        break;
      case 'mission_start':
      case 'mission_reminder_24h':
      case 'extension_request':
        navigationRef.navigate('Demandes');
        break;
      case 'nouvelle_commande_restaurant':
        // Une commande restaurant "en_attente" vit dans le Dashboard (bouton
        // Commencer), pas dans Demandes — contrairement aux autres services.
        navigationRef.navigate('Dashboard');
        break;
      default:
        navigationRef.navigate('Dashboard');
    }
  } catch (e) {
    console.log('[FCM] Erreur navigation notification:', e);
  }
};

/**
 * Configure Firebase Messaging :
 * - Demande la permission
 * - Obtient et enregistre le token FCM
 * - Met en place les listeners foreground + tap notification
 *
 * @param {object} store - Redux store
 * @param {object} navigationRef - createNavigationContainerRef() de App.tsx
 */
export const setupFCM = async (store, navigationRef) => {
  try {
    await ensureMissionsChannel();

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        store.dispatch(setFcmToken(fcmToken));
        const state = store.getState();
        if (state.proReducer.token) {
          await registerFCMToken(state.proReducer.token, fcmToken).catch(() => {});
        }
        console.log('[FCM] Token obtenu:', fcmToken.substring(0, 20) + '...');
      }
    }

    // Renouvellement automatique du token
    messaging().onTokenRefresh(async newToken => {
      store.dispatch(setFcmToken(newToken));
      const state = store.getState();
      if (state.proReducer.token) {
        await registerFCMToken(state.proReducer.token, newToken).catch(() => {});
      }
    });

    // Notification reçue en FOREGROUND (app ouverte, n'importe quel écran) :
    // pas d'affichage automatique par l'OS dans ce cas, on l'affiche nous-mêmes.
    messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Foreground:', remoteMessage?.notification?.title, '| data:', JSON.stringify(remoteMessage?.data));
      if (remoteMessage?.data?.type === 'message_admin') {
        await afficherNotificationMessage(remoteMessage);
      } else {
        console.log('[FCM] Ignoré (type non reconnu):', remoteMessage?.data?.type);
      }
    });

    // Tap sur la bannière affichée nous-mêmes pendant que l'app est ouverte
    notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        navigateFromNotification({data: detail.notification?.data}, navigationRef);
      }
    });

    // Tap sur notification depuis BACKGROUND (app en arrière-plan)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCM] Notification tapée (background):', remoteMessage?.data?.type);
      navigateFromNotification(remoteMessage, navigationRef);
    });
  } catch (error) {
    console.log('[FCM] Setup error:', error);
  }
};

/**
 * Vérifie si l'app a été ouverte depuis une notification (état KILLED).
 * Doit être appelé APRÈS que la navigation est prête (NavigationContainer onReady).
 */
export const checkInitialNotification = async navigationRef => {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('[FCM] App ouverte depuis notification killed:', remoteMessage?.data?.type);
      navigateFromNotification(remoteMessage, navigationRef);
    }
  } catch (error) {
    console.log('[FCM] checkInitialNotification error:', error);
  }
};
