import React, {useEffect} from 'react';
import {Alert, Vibration} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RootState} from '../redux/store';
import {getMesDemandes} from '../api/settings';
import LoginScreen from '../pages/Login/index';
import BottomTabNavigator from './BottomTab';
import Step1_InfosPersonnelles from '../pages/Inscription/Step1_InfosPersonnelles';
import Step2_TypeService        from '../pages/Inscription/Step2_TypeService';
import Step3_PaysVilles         from '../pages/Inscription/Step3_PaysVilles';
import Step4_Preferences        from '../pages/Inscription/Step4_Preferences';
import Step5_Langues            from '../pages/Inscription/Step5_Langues';
import Step6_Paiement           from '../pages/Inscription/Step6_Paiement';
import Step7_Confirmation       from '../pages/Inscription/Step7_Confirmation';
import ForgotPasswordScreen from '../pages/Login/ForgotPassword';

const Stack = createNativeStackNavigator();

const alertesMission: {[key: string]: number} = {};
const alertes24h: {[key: string]: boolean} = {};

// Restaurant uniquement : l'alerte "mission demain" doit s'afficher une
// seule fois, y compris après un redémarrage de l'app. alertes24h seul
// (mémoire JS) est réinitialisé à chaque relance de l'app (l'app peut être
// tuée en arrière-plan par l'OS) — on persiste donc ce cas précis dans
// AsyncStorage, sans toucher au comportement des autres services.
const ALERTES_24H_RESTO_STORAGE_KEY = '@youzful_alertes_24h_resto';
let alertes24hRestoCharge = false;

const chargerAlertes24hResto = async () => {
  if (alertes24hRestoCharge) return;
  alertes24hRestoCharge = true;
  try {
    const raw = await AsyncStorage.getItem(ALERTES_24H_RESTO_STORAGE_KEY);
    if (raw) {
      const saved: {[key: string]: number} = JSON.parse(raw);
      const limite = Date.now() - 3 * 24 * 60 * 60 * 1000;
      Object.keys(saved).forEach(k => {
        if (saved[k] >= limite) {
          alertes24h[k] = true;
        }
      });
    }
  } catch (_) {}
};

const sauvegarderAlerte24hResto = async (key: string) => {
  try {
    const raw = await AsyncStorage.getItem(ALERTES_24H_RESTO_STORAGE_KEY);
    const saved: {[key: string]: number} = raw ? JSON.parse(raw) : {};
    saved[key] = Date.now();
    await AsyncStorage.setItem(ALERTES_24H_RESTO_STORAGE_KEY, JSON.stringify(saved));
  } catch (_) {}
};

const RootNavigator = () => {
  const {t} = useTranslation();
  const token = useSelector((state: RootState) => state.proReducer.token);

  useEffect(() => {
    if (!token) return;

    const check = async () => {
      await chargerAlertes24hResto();
      try {
        const res = await getMesDemandes(token, 'accepte');
        const list: any[] = res.data?.demandes || [];
        const now = Date.now();

        list.forEach((demande: any) => {
          const heureRaw = demande.heure || demande.time;
          if (!demande.date || !heureRaw) return;
          const heure = String(heureRaw).substring(0, 5);

          const missionTime = new Date(`${demande.date}T${heure}:00`).getTime();
          if (!missionTime || isNaN(missionTime)) return;

          // Restaurant : l'alerte "Mission prête" (mission prévue... commence maintenant)
          // est désactivée, non demandée pour ce service.
          if (demande.type_service !== 'restaurant') {
            const keyM = `${demande.type_service}-${demande.id}`;
            // Mission déjà commencée (ou terminée) par le prestataire : on ne
            // rappelle plus jamais, même si l'heure reste dans la fenêtre de 15 min.
            if (demande.statut === 'en_cours' || demande.statut === 'termine') {
              alertesMission[keyM] = Infinity;
            } else if (
              alertesMission[keyM] !== Infinity &&
              now >= missionTime &&
              now <= missionTime + 15 * 60 * 1000
            ) {
              const last = alertesMission[keyM] || 0;
              if (now - last >= 5 * 60 * 1000) {
                alertesMission[keyM] = now;
                Vibration.vibrate(last === 0 ? [0, 500, 200, 500, 200, 500] : 2000);
                Alert.alert(t('navigation.alertes.mission_prete_titre'), t('navigation.alertes.mission_prete_message', {heure}));
              }
            }
          }

          const key24 = `24h-${demande.type_service}-${demande.id}`;
          if (!alertes24h[key24]) {
            if (demande.type_service === 'restaurant') {
              // Restaurant uniquement — garde explicite en tout premier : comparaison
              // de chaînes de dates (pas d'objet Date), sans ambiguïté possible.
              // Si la mission est datée d'aujourd'hui, on IGNORE tout le bloc, point final.
              const nowD0 = new Date();
              const todayStr = `${nowD0.getFullYear()}-${String(nowD0.getMonth() + 1).padStart(2, '0')}-${String(nowD0.getDate()).padStart(2, '0')}`;
              const missionDateStr = String(demande.date).slice(0, 10);

              if (missionDateStr === todayStr) {
                // Mission d'aujourd'hui : jamais d'alerte "Mission demain".
              } else {
                const missionDateObj = new Date(`${demande.date}T00:00:00`);
                const demainDate = new Date();
                demainDate.setHours(0, 0, 0, 0);
                demainDate.setDate(demainDate.getDate() + 1);
                const estDemain =
                  !isNaN(missionDateObj.getTime()) &&
                  missionDateObj.getFullYear() === demainDate.getFullYear() &&
                  missionDateObj.getMonth() === demainDate.getMonth() &&
                  missionDateObj.getDate() === demainDate.getDate();

                if (estDemain) {
                  const [hMission, mMission] = heure.split(':').map(Number);
                  const nowD = new Date();
                  const nowTotalMin = nowD.getHours() * 60 + nowD.getMinutes();
                  const missionTotalMin = (hMission || 0) * 60 + (mMission || 0);
                  // Déclenche quand l'heure actuelle atteint l'heure de la mission
                  // (24h pile avant), tolérance de 2 min pour le cycle de vérif. de 30s.
                  if (Math.abs(nowTotalMin - missionTotalMin) <= 2) {
                    alertes24h[key24] = true;
                    sauvegarderAlerte24hResto(key24);
                    Vibration.vibrate(2000);
                    if (Array.isArray(demande.plats) && demande.plats.length > 0) {
                      const platsNoms = demande.plats.map((p: any) => p.name).join(', ');
                      Alert.alert(
                        t('navigation.alertes.mission_demain_titre'),
                        t('navigation.alertes.mission_demain_message_plats', {heure, plats: platsNoms}),
                      );
                    } else {
                      Alert.alert(t('navigation.alertes.mission_demain_titre'), t('navigation.alertes.mission_demain_message', {heure}));
                    }
                  }
                }
              }
            } else {
              // Autres services (guide, babysitter, transfert) : logique inchangée.
              const tempsRestant = missionTime - now;
              const VINGT_QUATRE_H = 24 * 60 * 60 * 1000;
              const FENETRE_24H = 10 * 60 * 1000;
              if (
                tempsRestant > VINGT_QUATRE_H - FENETRE_24H &&
                tempsRestant <= VINGT_QUATRE_H
              ) {
                alertes24h[key24] = true;
                Vibration.vibrate(2000);
                Alert.alert(t('navigation.alertes.mission_demain_titre'), t('navigation.alertes.mission_demain_message', {heure}));
              }
            }
          }
        });
      } catch (_) {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [token, t]);

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!token ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Step1_InfosPersonnelles" component={Step1_InfosPersonnelles} />
          <Stack.Screen name="Step2_TypeService"       component={Step2_TypeService} />
          <Stack.Screen name="Step3_PaysVilles"        component={Step3_PaysVilles} />
          <Stack.Screen name="Step4_Preferences"       component={Step4_Preferences} />
          <Stack.Screen name="Step5_Langues"           component={Step5_Langues} />
          <Stack.Screen name="Step6_Paiement"          component={Step6_Paiement} />
          <Stack.Screen name="Step7_Confirmation"      component={Step7_Confirmation} />
        </>
      ) : (
        <Stack.Screen name="Main" component={BottomTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
