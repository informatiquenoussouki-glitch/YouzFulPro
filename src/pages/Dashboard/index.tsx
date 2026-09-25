import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
    Modal,
  Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {loadDashboard, loadNotation, accepterDemandeAction, refuserDemandeAction, commencerDemandeAction} from '../../redux/actions/pro.actions';
import {getMesDemandes} from '../../api/settings';
import {COLORS} from '../../helpers/config';
import CountdownTimer from './CountdownTimer';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import AsyncStorage from '@react-native-async-storage/async-storage';





const SERVICE_ICONS: {[key: string]: string} = {
  babysitter: '👶',
  guide: '🗺️',
  transfert: '🚗',
  restaurant: '🍽️',
  activite: '🎢',
};

const STATUT_COLORS: {[key: string]: string} = {
  en_cours: COLORS.warning,
  confirme: COLORS.primary,
  termine: COLORS.textSecondary,
};

const DashboardScreen = () => {
  const {t} = useTranslation('dashboard');
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const {token, prestataire, demandesEnAttente, demandesAcceptees, notation} = useSelector(
    (state: RootState) => state.proReducer,
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<number | null>(null);
  const [notificationsVisible, setNotificationsVisible] =
    React.useState(false);

const [notificationsLues, setNotificationsLues] =
  React.useState<string[]>([]);

const [notificationsChargees, setNotificationsChargees] =
  React.useState(false);

const [notificationsAffichees, setNotificationsAffichees] =
  React.useState<any[]>([]);


  const fetchData = useCallback(() => {
    if (token) {
      return Promise.all([
        dispatch(loadDashboard(token) as any),
        dispatch(loadNotation(token) as any),
      ]);
    }
  }, [dispatch, token]);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      try {
        await fetchData();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    init();

    pollId = setInterval(fetchData, 60000);

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        fetchData();
        if (!pollId) {
          pollId = setInterval(fetchData, 60000);
        }
      } else if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    });

    return () => {
      cancelled = true;
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
      subscription.remove();
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const parseDemandeStart = (d: any) => {
    const h = (d.heure || '00:00').substring(0, 5);
    return new Date(`${d.date}T${h}:00`);
  };
  const parseDemandeEnd = (d: any) => {
    const start = parseDemandeStart(d);
    return new Date(start.getTime() + (parseFloat(d.duree) || 1) * 3600000);
  };

  const compterMissionsEnConflit = async (nouvelleDemande: any): Promise<number> => {
    if (!token) return 0;
    try {
      const response = await getMesDemandes(token, 'all');
      const toutes = response.data?.demandes || [];
      const now = new Date();
      const newStart = parseDemandeStart(nouvelleDemande);
      const newEnd = parseDemandeEnd(nouvelleDemande);
      return toutes.filter((d: any) => {
        if (d.statut !== 'accepte' && d.statut !== 'en_cours') return false;
        if (!d.date || !d.heure) return false;
        if (now > parseDemandeEnd(d)) return false;
        return newStart < parseDemandeEnd(d) && parseDemandeStart(d) < newEnd;
      }).length;
    } catch {
      return 0;
    }
  };

  const handleAccepter = async (demande: any) => {
    if (!token) return;
    setActionLoading(demande.id);
    try {
      const nbConflits = await compterMissionsEnConflit(demande);
      if (nbConflits >= 3) {
        Alert.alert(
          t('alerts.limitReachedTitle'),
          t('alerts.limitReachedMessage'),
        );
        return;
      }
      const result = await dispatch(accepterDemandeAction(token, demande.id, demande.type_service) as any);
      if (result?.success === false) {
        Alert.alert(t('alerts.errorTitle'), result?.message || t('alerts.acceptError'));
        return;
      }
      await fetchData();
    } catch (e) {
      Alert.alert(t('alerts.errorTitle'), t('alerts.acceptError'));
    } finally {
      setActionLoading(null);
    }
  };

  // Restaurant uniquement : la commande n'a pas d'étape "accepter" séparée —
  // elle est déjà assignée à ce restaurant dès sa création. "Commencer" la
  // fait passer directement de en_attente à en_cours ; elle quitte alors le
  // Dashboard et apparaît dans "Mes Demandes" (filtre en_cours).
  const handleCommencer = async (demande: any) => {
    if (!token) return;
    setActionLoading(demande.id);
    try {
      const result = await dispatch(
        commencerDemandeAction(token, demande.id, demande.type_service) as any,
      );
      if (result?.code !== 200) {
        Alert.alert(t('alerts.errorTitle'), result?.message || t('alerts.startError'));
        return;
      }
      await fetchData();
    } catch (e) {
      Alert.alert(t('alerts.errorTitle'), t('alerts.startError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuser = async (demande: any) => {
    if (!token) return;
    setActionLoading(demande.id);
    try {
      await dispatch(refuserDemandeAction(token, demande.id, demande.type_service) as any);
      // Rafraîchissement immédiat après action
      await fetchData();
    } catch (e) {
      Alert.alert(t('alerts.errorTitle'), t('alerts.refuseError'));
    } finally {
      setActionLoading(null);
    }
  };


// Le filtrage par ville et v\u00e9hicule est g\u00e9r\u00e9 par le backend (Dashboard.php)
const demandesFiltrees = demandesEnAttente || [];
const notificationStorageKey =
  `notifications_lues_${prestataire?.id || 'prestataire'}`;

const getNotificationId = (demande: any) =>
  `${demande.type_service}-${demande.id}`;

const notificationsNonLues = demandesFiltrees.filter(
  (demande: any) =>
    !notificationsLues.includes(getNotificationId(demande)),
);

const nombreNotificationsNonLues = notificationsChargees
  ? notificationsNonLues.length
  : 0;

useEffect(() => {
  let actif = true;

  const chargerNotificationsLues = async () => {
    try {
      setNotificationsChargees(false);

      const valeur = await AsyncStorage.getItem(
        notificationStorageKey,
      );

      if (!actif) {
        return;
      }

      const ids = valeur ? JSON.parse(valeur) : [];

      setNotificationsLues(
        Array.isArray(ids) ? ids : [],
      );
    } catch (error) {
      if (actif) {
        setNotificationsLues([]);
      }
    } finally {
      if (actif) {
        setNotificationsChargees(true);
      }
    }
  };

  chargerNotificationsLues();

  return () => {
    actif = false;
  };
}, [notificationStorageKey]);


const ouvrirNotifications = async () => {
  // On conserve uniquement les notifications qui étaient encore non lues
  // au moment du clic. Elles restent visibles pendant toute l'ouverture
  // de la popup, même après la remise à zéro du badge.
  setNotificationsAffichees(notificationsNonLues);
  setNotificationsVisible(true);

  const idsActuels = notificationsNonLues.map(
    (demande: any) => getNotificationId(demande),
  );

  const nouvelleListe = Array.from(
    new Set([...notificationsLues, ...idsActuels]),
  );

  setNotificationsLues(nouvelleListe);

  try {
    await AsyncStorage.setItem(
      notificationStorageKey,
      JSON.stringify(nouvelleListe),
    );
  } catch (error) {
    console.log(
      'Erreur enregistrement notifications lues :',
      error,
    );
  }
};

if (loading) {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" style={styles.initialLoader} />
    </SafeAreaView>
  );
}



 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('greeting', {name: prestataire?.prenom || t('defaultProvider')})}
            </Text>
            <TouchableOpacity
              style={styles.ratingRow}
              onPress={() => navigation.navigate('Notation')}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.rating}>
                {(notation as any)?.note ? Number((notation as any).note).toFixed(1) : '0.0'} / 5
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <LanguageSwitcher />
<TouchableOpacity
  style={styles.notifIcon}
  activeOpacity={0.7}
onPress={ouvrirNotifications}
  accessibilityRole="button"
  accessibilityLabel="Afficher les notifications">
  <Text style={styles.notifText}>🔔</Text>

{nombreNotificationsNonLues > 0 && (
  <View style={styles.notifBadge}>
    <Text style={styles.notifBadgeText}>
      {nombreNotificationsNonLues > 99
        ? '99+'
        : nombreNotificationsNonLues}
    </Text>
  </View>
)}
</TouchableOpacity>
          </View>
        </View>

        {/* SECTION DEMANDES EN ATTENTE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('pendingSection.title', {count: demandesFiltrees.length})}
          </Text>

          {demandesFiltrees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>{t('pendingSection.emptyTitle')}</Text>
              <Text style={styles.emptySubtext}>{t('pendingSection.emptySubtitle')}</Text>
            </View>
          ) : (
            demandesFiltrees.map((demande: any) => (
              <View key={demande.id} style={styles.demandeCard}>
                <View style={styles.demandeHeader}>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceIcon}>
                      {SERVICE_ICONS[demande.type_service] || '📋'}
                    </Text>
                    {demande.type_service === 'restaurant' ? (
                      <Text style={styles.platsLabel}>
                        {Array.isArray(demande.plats) && demande.plats.length > 0
                          ? demande.plats.map((p: any) => p.name).join(', ')
                          : t('serviceLabels.restaurant')}
                      </Text>
                    ) : demande.type_service === 'activite' ? (
                      <Text style={styles.platsLabel}>
                        {demande.activite_nom || t('serviceLabels.activite')}
                      </Text>
                    ) : (
                      <Text style={styles.serviceLabel}>
                        {t(`serviceLabels.${demande.type_service}`, {defaultValue: demande.type_service})}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.prix}>{demande.prix_total} SAR</Text>
                </View>

             <View style={styles.demandeInfo}>
  <Text style={styles.infoRow}>📍 {demande.ville}</Text>
  {demande.type_service === 'restaurant' ? (
    <Text style={styles.infoRow}>
      {t('info.prepareFor', {date: demande.date, heure: demande.heure || t('info.unspecifiedTime')})}
    </Text>
  ) : (
    <>
      <Text style={styles.infoRow}>{t('info.date', {date: demande.date})}</Text>
      <Text style={styles.infoRow}>{t('info.startTime', {heure: demande.heure || t('info.noTimeSpecified')})}</Text>
    </>
  )}
  <Text style={styles.infoRow}>
    {demande.duree
      ? demande.type_service === 'activite'
        ? t('info.durationMinutes', {duree: demande.duree})
        : t('info.durationHours', {duree: demande.duree})
      : t('info.durationNotSpecified')}
  </Text>
  <Text style={styles.infoRow}>{t('info.people', {count: demande.nbrenfants || demande.nb_personnes || 1})}</Text>
  {demande.client_prenom ? (
    <Text style={styles.infoRow}>{t('info.client', {name: demande.client_prenom})}</Text>
  ) : null}

  {demande.type_service === 'transfert' && (
    <>
      {demande.typevisites ? (
        <Text style={[styles.infoRow, styles.infoTransfert]}>
          {t('info.trip', {typevisites: demande.typevisites})}
        </Text>
      ) : null}
      {demande.vehicule ? (
        <Text style={[styles.infoRow, styles.infoTransfert]}>
          {t('info.vehicle', {vehicule: demande.vehicule})}
        </Text>
      ) : null}
    </>
  )}
</View>
                {demande.expires_at && (
                  <CountdownTimer expiresAt={demande.expires_at} />
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.refuserButton, actionLoading === demande.id && styles.buttonDisabled]}
                    onPress={() => handleRefuser(demande)}
                    disabled={actionLoading !== null}>
                    {actionLoading === demande.id ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Text style={styles.refuserText}>{t('actions.refuse')}</Text>
                    )}
                  </TouchableOpacity>
                  {demande.type_service === 'restaurant' ? (
                    <TouchableOpacity
                      style={[styles.accepterButton, actionLoading === demande.id && styles.buttonDisabled]}
                      onPress={() => handleCommencer(demande)}
                      disabled={actionLoading !== null}>
                      {actionLoading === demande.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.accepterText}>{t('actions.start')}</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.accepterButton, actionLoading === demande.id && styles.buttonDisabled]}
                      onPress={() => handleAccepter(demande)}
                      disabled={actionLoading !== null}>
                      {actionLoading === demande.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.accepterText}>{t('actions.accept')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* SECTION MISSIONS DU JOUR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('missionsSection.title', {count: demandesAcceptees?.length || 0})}
          </Text>

          {!demandesAcceptees || demandesAcceptees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('missionsSection.empty')}</Text>
            </View>
          ) : (
            demandesAcceptees.map((mission: any) => (
              <View key={mission.id} style={styles.missionCard}>
                <View style={styles.missionRow}>
                  <Text style={styles.serviceIcon}>
                    {SERVICE_ICONS[mission.type_service] || '📋'}
                  </Text>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>
                      {t(`serviceLabels.${mission.type_service}`, {defaultValue: mission.type_service})} — {mission.ville}
                    </Text>
                    <Text style={styles.missionTime}>
  {mission.date} à {mission.heure}
</Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      {backgroundColor: STATUT_COLORS[mission.statut] || COLORS.textSecondary},
                    ]}>
                    <Text style={styles.statutText}>{mission.statut}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNotificationsVisible(false)}>

        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNotificationsVisible(false)}>

          <Pressable
            style={styles.notificationsModal}
            onPress={event => event.stopPropagation()}>

            <View style={styles.notificationsHeader}>
              <View style={styles.notificationsTitleRow}>
                <Text style={styles.notificationsTitle}>
                  Notifications
                </Text>

                {notificationsAffichees.length > 0 && (
                  <View style={styles.notificationsCount}>
                    <Text style={styles.notificationsCountText}>
                      {notificationsAffichees.length}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNotificationsVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {notificationsAffichees.length === 0 ? (
              <View style={styles.notificationsEmpty}>
                <Text style={styles.notificationsEmptyIcon}>🔔</Text>
                <Text style={styles.notificationsEmptyTitle}>
                  Aucune notification non lue
                </Text>
                <Text style={styles.notificationsEmptyText}>
                  Les prochaines nouvelles demandes apparaîtront ici.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}>
              {notificationsAffichees.map((demande: any) => {
  const estNonLue = true;

  return (
    <View
                    key={`${demande.type_service}-${demande.id}`}
                    style={styles.notificationItem}>

                    <View style={styles.notificationIconContainer}>
                      <Text style={styles.notificationServiceIcon}>
                        {SERVICE_ICONS[demande.type_service] || '📋'}
                      </Text>
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTopRow}>
                        <Text
                          style={styles.notificationService}
                          numberOfLines={1}>
                          {demande.type_service === 'restaurant' &&
                          Array.isArray(demande.plats) &&
                          demande.plats.length > 0
                            ? demande.plats
                                .map((plat: any) => plat.name)
                                .join(', ')
                            : demande.type_service === 'activite'
                            ? demande.activite_nom || 'Activité'
                            : t(
                                `serviceLabels.${demande.type_service}`,
                                {
                                  defaultValue:
                                    demande.type_service,
                                },
                              )}
                        </Text>

            {estNonLue && (
                          <View style={styles.newNotificationBadge}>
                            <Text style={styles.newNotificationText}>
                              Nouvelle
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.notificationDetails}>
                        📍 {demande.ville || 'Ville non indiquée'}
                      </Text>

                      <Text style={styles.notificationDetails}>
                        📅 {demande.date || 'Date non indiquée'}
                        {demande.heure
                          ? ` à ${demande.heure.substring(0, 5)}`
                          : ''}
                      </Text>

                      {demande.client_prenom ? (
                        <Text style={styles.notificationDetails}>
                          👤 {demande.client_prenom}
                        </Text>
                      ) : null}

                      <Text style={styles.notificationPrice}>
                        {demande.prix_total || 0} SAR
                      </Text>
                    </View>
                  </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setNotificationsVisible(false)}>
              <Text style={styles.closeModalButtonText}>
                Fermer
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const notificationStyles: {[key: string]: any} = {
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  justifyContent: 'center',
  paddingHorizontal: 18,
},

notificationsModal: {
  width: '100%',
  maxHeight: '80%',
  backgroundColor: COLORS.card,
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 5,
  },
  shadowOpacity: 0.25,
  shadowRadius: 10,
},

notificationsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
},

notificationsTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

notificationsTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: COLORS.textPrimary,
},

notificationsCount: {
  minWidth: 24,
  height: 24,
  paddingHorizontal: 6,
  borderRadius: 12,
  backgroundColor: COLORS.danger,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},

notificationsCountText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 'bold',
},

closeButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: COLORS.background,
  alignItems: 'center',
  justifyContent: 'center',
},

closeButtonText: {
  color: COLORS.textPrimary,
  fontSize: 18,
  fontWeight: 'bold',
},

notificationsList: {
  paddingHorizontal: 16,
},

notificationItem: {
  flexDirection: 'row',
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
},

notificationIconContainer: {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: COLORS.background,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

notificationServiceIcon: {
  fontSize: 23,
},

notificationContent: {
  flex: 1,
},

notificationTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 5,
},

notificationService: {
  flex: 1,
  fontSize: 15,
  fontWeight: 'bold',
  color: COLORS.textPrimary,
  marginRight: 8,
},

newNotificationBadge: {
  backgroundColor: '#E8F5E9',
  borderRadius: 8,
  paddingHorizontal: 7,
  paddingVertical: 3,
},

newNotificationText: {
  color: '#2E7D32',
  fontSize: 10,
  fontWeight: 'bold',
},

notificationDetails: {
  fontSize: 13,
  color: COLORS.textSecondary,
  marginBottom: 3,
},

notificationPrice: {
  color: COLORS.primary,
  fontSize: 15,
  fontWeight: 'bold',
  marginTop: 3,
},

notificationsEmpty: {
  paddingHorizontal: 24,
  paddingVertical: 42,
  alignItems: 'center',
},

notificationsEmptyIcon: {
  fontSize: 45,
  marginBottom: 12,
},

notificationsEmptyTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: COLORS.textPrimary,
  marginBottom: 6,
},

notificationsEmptyText: {
  fontSize: 13,
  color: COLORS.textSecondary,
  textAlign: 'center',
},

closeModalButton: {
  backgroundColor: COLORS.primary,
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 16,
  paddingVertical: 13,
  borderRadius: 12,
  alignItems: 'center',
},

closeModalButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 'bold',
},
};

const styles = StyleSheet.create({
  ...notificationStyles,
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  initialLoader: {
      flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  star: {
    fontSize: 16,
    color: '#FFB300',
    marginRight: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifIcon: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
  },
  notifText: {
    fontSize: 24,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  demandeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  demandeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  platsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  prix: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  demandeInfo: {
    marginBottom: 12,
  },
  infoRow: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoTransfert: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  refuserButton: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  refuserText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: 15,
  },
  accepterButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  accepterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  missionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionInfo: {
    flex: 1,
    marginLeft: 8,
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  missionTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statutBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
});
export default DashboardScreen;
