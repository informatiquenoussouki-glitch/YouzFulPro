import React, {useState, useEffect, useCallback, useRef, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Vibration,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {getMesDemandes} from '../../api/settings';
import {COLORS} from '../../helpers/config';
import {
  terminerDemandeAction,
  annulerDemandeAction,
  commencerDemandeAction,
  livrerDemandeAction,
  respondExtensionAction,
} from '../../redux/actions/pro.actions';



const FILTRES = ['all', 'accepte', 'en_cours', 'termine'];

const STATUT_CONFIG: {[key: string]: {color: string; bg: string}} = {
  accepte: {color: '#FFFFFF', bg: '#FF9800'},
  en_cours: {color: '#FFFFFF', bg: COLORS.primary},
  livraison: {color: '#FFFFFF', bg: '#3F51B5'},
  termine: {color: '#FFFFFF', bg: COLORS.textSecondary},
};

const SERVICE_ICONS: {[key: string]: string} = {
  babysitter: '👶',
  guide: '🗺️',
  transfert: '🚗',
  restaurant: '🍽️',
  activite: '🎢',
};

const alertesMissionRef: {[key: string]: number} = {};

// Module-level : persiste même si le composant se démonte/remonte
const extensionsData: {[key: string]: {
  prixInitial: number;
  tauxHoraire: number;
  dureeInitiale: number;
  extraDuree: number;
}} = {};
const alertesActivesSet = new Set<string>();

// Extrait les heures depuis le champ duree du guide : "3" → 3, "Demi-journée ~3h" → 3
const parseDureeHeures = (duree: any): number => {
  if (!duree) return 1;
  const n = parseFloat(String(duree));
  if (!isNaN(n)) return n;
  const m = String(duree).match(/~?\s*(\d+(?:[.,]\d+)?)\s*h/i);
  return m ? parseFloat(m[1].replace(',', '.')) : 1;
};

// La durée d'une activité (packages.duration) est stockée en MINUTES côté serveur
// (voir Dashboard/index.tsx : "{demande.duree} min"), contrairement aux autres
// services (guide, babysitter, transfert) dont la durée est en heures.
const getDureeHeures = (demande: any): number => {
  if (demande.type_service === 'activite') {
    const minutes = parseFloat(demande.duree);
    return !isNaN(minutes) && minutes > 0 ? minutes / 60 : 1;
  }
  return parseDureeHeures(demande.duree);
};

// Instant de départ de la mission = date + heure programmées de la demande
// (date_selected / time_selected pour une activité, date / heure pour les autres services).
const getMissionStart = (demande: any): number | null => {
  if (!demande.date || !demande.heure) return null;
  const h = String(demande.heure).substring(0, 5);
  const t = new Date(`${demande.date}T${h}:00`).getTime();
  return isNaN(t) ? null : t;
};

// true dès que l'heure de début + la durée (+ extensions éventuelles) est dépassée
const computeIsTermine = (
  demande: any,
  extensionsRef: React.MutableRefObject<typeof extensionsData>,
): boolean => {
  if (!demande.duree) return false;
  const missionStart = getMissionStart(demande);
  if (missionStart === null) return false;
  const ext = extensionsRef.current[`dur-${demande.id}`];
  const dureeInitiale = ext ? ext.dureeInitiale : getDureeHeures(demande);
  const extraDuree = ext ? ext.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
  return Date.now() >= missionStart + (dureeInitiale + extraDuree) * 3600000;
};

// CORRECTIF 1 : composant séparé pour le timer.
// Chaque carte gère son propre setInterval — le re-render chaque seconde
// est isolé ici et ne provoque plus de re-render sur toutes les autres cartes.
const TimerDisplay = memo(({
  demande,
  extensionsRef,
}: {
  demande: any;
  extensionsRef: React.MutableRefObject<typeof extensionsData>;
}) => {
  const {t} = useTranslation('demandes');
  const [tempsRestant, setTempsRestant] = useState('...');

  useEffect(() => {
    const tick = () => {
      if (!demande.duree) return;
      const missionStart = getMissionStart(demande);
      if (missionStart === null) return;
      const ext = extensionsRef.current[`dur-${demande.id}`];
      const dureeInitiale = ext ? ext.dureeInitiale : getDureeHeures(demande);
      const extraDuree = ext ? ext.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
      const dureeTotal = dureeInitiale + extraDuree;
      const reste = missionStart + dureeTotal * 3600000 - Date.now();
      if (reste <= 0) {
        setTempsRestant('Terminé');
      } else {
        const totalSec = Math.floor(reste / 1000);
        const h2 = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        setTempsRestant(
          h2 > 0
            ? `${h2}h ${String(m).padStart(2, '0')}m`
            : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
        );
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [demande.id, demande.date, demande.heure, demande.duree, extensionsRef]);

  const ext = extensionsRef.current[`dur-${demande.id}`];
  const isTermine = tempsRestant === 'Terminé';
  const extraDuree = ext ? ext.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
  const tauxAffiche =
    ext && (ext.tauxHoraire > 0 ? ext.tauxHoraire : ext.prixInitial / ext.dureeInitiale);
  const coutExtra =
    extraDuree > 0
      ? (ext
          ? Math.round(extraDuree * (tauxAffiche || 0) * 100) / 100
          : parseFloat(demande.cout_ajoute) || 0)
      : 0;

  return (
    <View style={styles.timerRow}>
      <Text style={[styles.timerText, isTermine && styles.timerTermine]}>
        {isTermine ? t('timer.missionFinished') : t('timer.remaining', {tempsRestant})}
      </Text>
      {extraDuree > 0 && (
        <Text style={styles.extensionText}>
          {t('timer.extensionAdded', {minutes: extraDuree * 60, cost: coutExtra})}
        </Text>
      )}
    </View>
  );
});

const DemandesScreen = () => {
  const {t} = useTranslation('demandes');
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const token = useSelector((state: RootState) => state.proReducer.token);
  const [filtre, setFiltre] = useState('all');
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [terminerLoading, setTerminerLoading] = useState<{[key: string]: boolean}>({});
  // CORRECTIF 2 : état de chargement pour le bouton Commencer (comme Terminer en avait déjà un)
  const [commencerLoading, setCommencerLoading] = useState<{[key: string]: boolean}>({});
  // État de chargement pour le bouton Livrer (restaurant : en_cours -> livraison)
  const [livrerLoading, setLivrerLoading] = useState<{[key: string]: boolean}>({});

  // Références vers les objets module-level
  const extensionsRef = useRef(extensionsData);
  const alertesActivesRef = useRef(alertesActivesSet);
  // CORRECTIF 4 : ref vers demandes pour les intervals d'alertes
  // Les intervals lisent toujours les demandes à jour sans être recréés à chaque changement
  const demandesRef = useRef(demandes);
  useEffect(() => {
    demandesRef.current = demandes;
  }, [demandes]);

  // Activités : évite de relancer plusieurs fois la clôture automatique pour la même mission
  const autoTerminesRef = useRef<Set<string>>(new Set());

  // Détection "le client a terminé la mission de son côté" : on garde en mémoire
  // le dernier statut connu de chaque demande (indépendamment du filtre affiché à l'écran)
  // pour repérer la transition en_cours -> termine et proposer la confirmation de paiement
  // une seule fois.
  const prevStatutPaiementRef = useRef<{[key: string]: string}>({});
  const paiementPromptedRef = useRef<Set<string>>(new Set());

  // Demande d'extension +30min envoyée par le CLIENT : évite de ré-afficher
  // l'alerte plusieurs fois tant que le prestataire n'a pas répondu.
  const extensionPromptedRef = useRef<Set<string>>(new Set());

  const fetchDemandes = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await getMesDemandes(token, filtre);
      setDemandes(response.data?.demandes || []);
    } catch (error) {
      console.log('Demandes error:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filtre]);

  // CORRECTIF 3 : suppression du useEffect dupliqué.
  // useFocusEffect se déclenche au montage ET à chaque retour sur l'écran,
  // donc le useEffect([fetchDemandes]) était un double appel inutile.
  useFocusEffect(
    useCallback(() => {
      fetchDemandes();
    }, [fetchDemandes]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDemandes();
    setRefreshing(false);
  }, [fetchDemandes]);

  // Alerte + vibration quand c'est l'heure de la mission, rappel toutes les 5 min
  // CORRECTIF 4 : interval créé une seule fois ([]). Il accède aux demandes via demandesRef
  // pour ne pas être recréé à chaque changement de demandes.
  useEffect(() => {
    const interval = setInterval(() => {
      demandesRef.current.forEach((demande: any) => {
        if (demande.statut !== 'accepte') return;
        // Restaurant : alerte "Mission prête" désactivée, non demandée pour ce service.
        if (demande.type_service === 'restaurant') return;

        const key = `${demande.type_service}-${demande.id}`;
        if (
          demande.statut === 'en_cours' ||
          demande.statut_prestataire === 'en_cours'
        ) {
          alertesMissionRef[key] = Infinity;
          return;
        }

        // Une seule alerte par mission : si déjà affichée, on ne la répète plus.
        if (alertesMissionRef[key]) return;

        const heureRaw = demande.heure || demande.time;
        if (!demande.date || !heureRaw) return;

        const heure = String(heureRaw).substring(0, 5);
        const missionTime = new Date(`${demande.date}T${heure}:00`);
        if (isNaN(missionTime.getTime())) return;

        const limiteTime = new Date(missionTime.getTime() + 15 * 60 * 1000);
        const now = new Date();

        if (now < missionTime || now > limiteTime) return;

        alertesMissionRef[key] = now.getTime();

        Vibration.vibrate(2000);

        Alert.alert(
          t('alerts.missionReadyTitle'),
          t('alerts.missionReadyMessage', {heure}),
        );
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // L'alerte 24h avant la mission est gérée globalement dans navigations/index.tsx
  // (toujours active, peu importe l'écran) — pas besoin de la dupliquer ici.

  // Réponse du prestataire à une demande d'extension +30min envoyée par le client.
  const handleRespondExtension = useCallback(
    async (demande: any, reponse: 'accept' | 'refuse') => {
      if (!token) return;
      const key = `${demande.type_service}-${demande.id}`;
      const result = await dispatch(
        respondExtensionAction(token, demande.id, reponse) as any,
      );

      if (result?.code !== 200) {
        // Échec réseau : on laisse la possibilité de re-proposer l'alerte au prochain polling.
        extensionPromptedRef.current.delete(key);
        Alert.alert(
          t('alerts.errorTitle'),
          result?.message || t('alerts.extensionRespondError'),
        );
        return;
      }

      fetchDemandes();
    },
    [token, dispatch, fetchDemandes, t],
  );

  // Détecte quand le CLIENT termine la mission depuis son app (statut_prestataire passe
  // à 'termine' sur la même table sans passer par le bouton "Terminer" de cette app).
  // Vérifie périodiquement en arrière-plan et affiche la popup de confirmation de paiement
  // une seule fois par mission dès que la transition en_cours -> termine est détectée.
  const checkPaiementClientTermine = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getMesDemandes(token, 'all');
      const toutes = response.data?.demandes || [];

      toutes.forEach((d: any) => {
        const key = `${d.type_service}-${d.id}`;
        const prevStatut = prevStatutPaiementRef.current[key];
        const statutActuel = d.statut || d.statut_prestataire;

        const concerneParPaiement =
          d.type_service === 'babysitter' ||
          d.type_service === 'transfert' ||
          d.type_service === 'guide';

        if (
          concerneParPaiement &&
          prevStatut === 'en_cours' &&
          statutActuel === 'termine' &&
          !paiementPromptedRef.current.has(key)
        ) {
          paiementPromptedRef.current.add(key);

          Alert.alert(
            t('alerts.paymentTitle'),
            t('alerts.paymentClientFinishedMessage'),
            [
              {
                text: t('alerts.yes'),
                onPress: () => {
                  dispatch(terminerDemandeAction(token, d.id, d.type_service, 0, 0, 1) as any)
                    .then(() => fetchDemandes());
                },
              },
              {
                text: t('alerts.no'),
                style: 'cancel',
                onPress: () => {
                  dispatch(terminerDemandeAction(token, d.id, d.type_service, 0, 0, 0) as any)
                    .then(() => fetchDemandes());
                },
              },
            ],
            {cancelable: false},
          );
        }

        prevStatutPaiementRef.current[key] = statutActuel;

        // Demande d'extension envoyée par le client (babysitter), pour la durée
        // qu'il a choisie (d.extension_temps_propose, en heures) : le prestataire
        // doit accepter ou refuser. Une seule alerte par demande tant qu'elle reste 'pending'.
        if (
          d.type_service === 'babysitter' &&
          d.extension_status === 'pending' &&
          !extensionPromptedRef.current.has(key)
        ) {
          extensionPromptedRef.current.add(key);
          Vibration.vibrate(1000);
          const minutesDemandees = Math.round((parseFloat(d.extension_temps_propose) || 0) * 60);
          Alert.alert(
            t('alerts.extensionRequestTitle'),
            t('alerts.extensionRequestMessage', {minutes: minutesDemandees}),
            [
              {
                text: t('alerts.refuse'),
                style: 'cancel',
                onPress: () => handleRespondExtension(d, 'refuse'),
              },
              {
                text: t('alerts.accept'),
                onPress: () => handleRespondExtension(d, 'accept'),
              },
            ],
            {cancelable: false},
          );
        } else if (d.extension_status !== 'pending') {
          extensionPromptedRef.current.delete(key);
        }
      });

      // Met à jour les demandes déjà affichées avec les données fraîches du serveur
      // (temps_ajoute / cout_ajoute notamment, quand le client prolonge la mission)
      // sans changer la liste affichée (respecte le filtre actif).
      setDemandes(prev =>
        prev.map(item => {
          const fresh = toutes.find(
            (d: any) => d.id === item.id && d.type_service === item.type_service,
          );
          return fresh ? {...item, ...fresh} : item;
        }),
      );
    } catch {
      // silencieux : on réessaiera au prochain passage
    }
  }, [token, dispatch, fetchDemandes, t, handleRespondExtension]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkPaiementClientTermine();
    }, 20000);

    return () => clearInterval(interval);
  }, [checkPaiementClientTermine]);

  /* COMMENTÉ — Alerte de fin de durée : propose de terminer ou prolonger de 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      demandes.forEach((demande: any) => {
        if (demande.statut !== 'en_cours') return;
        if (!demande.date || !demande.heure || !demande.duree) return;
        const key = `dur-${demande.id}`;
        if (alertesActivesRef.current.has(key)) return;
        if (!extensionsRef.current[key]) {
          extensionsRef.current[key] = {
            prixInitial: parseFloat(demande.prix_initial) || parseFloat(demande.prix_total) || 0,
            tauxHoraire: parseFloat(demande.tarif_horaire) || 0,
            dureeInitiale: parseDureeHeures(demande.duree),
            extraDuree: 0,
          };
        }
        const ext = extensionsRef.current[key];
        const h = (demande.heure || '00:00').substring(0, 5);
        const missionStart = new Date(`${demande.date}T${h}:00`).getTime();
        const dureeTotal = ext.dureeInitiale + ext.extraDuree;
        if (Date.now() < missionStart + dureeTotal * 3600000) return;

        const taux = ext.tauxHoraire > 0 ? ext.tauxHoraire : (ext.prixInitial / (ext.dureeInitiale || 1));
        const prochainPrix = Math.round((ext.prixInitial + (ext.extraDuree + 0.5) * taux) * 100) / 100;
        alertesActivesRef.current.add(key);
        Vibration.vibrate(1000);
        Alert.alert(
          'Mission terminée ?',
          `La durée prévue de ${dureeTotal}h est écoulée.\nVoulez-vous terminer la mission ?`,
          [
            {
              text: 'Oui, terminer',
              onPress: () => {
                if (demande.type_service === 'babysitter') {
                  Alert.alert(
                    'Paiement',
                    'Paiement avec espèce — Confirmé ?',
                    [
                      {text: 'Oui', onPress: () => handleTerminer(demande, 1)},
                      {text: 'Non', style: 'cancel', onPress: () => handleTerminer(demande, 0)},
                    ],
                  );
                } else {
                  handleTerminer(demande);
                }
              },
            },
            {
              text: `Non, +30 min (${prochainPrix} SAR)`,
              onPress: () => {
                const currentExt = extensionsRef.current[key];
                if (!currentExt) return;
                extensionsRef.current[key] = {
                  ...currentExt,
                  extraDuree: currentExt.extraDuree + 0.5,
                };
                alertesActivesRef.current.delete(key);
              },
            },
          ],
          {cancelable: false},
        );
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [demandes]);
  */

  const handlePress = (demande: any) => {
    const ext = extensionsRef.current[`dur-${demande.id}`] || null;
    navigation.navigate('DemandeDetail', {demande, extension: ext});
  };

  const handleCommencer = async (demande: any) => {
    if (!token) return;
    if (commencerLoading[demande.id]) return;

    // CORRECTIF 2 : spinner pendant l'attente serveur
    setCommencerLoading(prev => ({...prev, [demande.id]: true}));

    const result = await dispatch(
      commencerDemandeAction(token, demande.id, demande.type_service) as any,
    );

    setCommencerLoading(prev => ({...prev, [demande.id]: false}));

    if (result?.code !== 200) return;

    // Succès : bloque définitivement l'alerte de rappel + passe en_cours localement
    alertesMissionRef[`${demande.type_service}-${demande.id}`] = Infinity;
    setDemandes(prev =>
      prev.map(item =>
        item.id === demande.id ? {...item, statut: 'en_cours'} : item,
      ),
    );
  };

  
  // Restaurant uniquement : en_cours -> livraison (le bouton "Terminer" devient "Livrer")
  const handleLivrer = async (demande: any) => {
    if (!token) return;
    if (livrerLoading[demande.id]) return;

    setLivrerLoading(prev => ({...prev, [demande.id]: true}));

    const result = await dispatch(
      livrerDemandeAction(token, demande.id, demande.type_service) as any,
    );

    setLivrerLoading(prev => ({...prev, [demande.id]: false}));

    if (result?.code !== 200) {
      Alert.alert(t('alerts.errorTitle'), result?.message || t('alerts.livraisonError'));
      return;
    }

    setDemandes(prev =>
      prev.map(item =>
        item.id === demande.id ? {...item, statut: 'livraison'} : item,
      ),
    );
  };

  const handleTerminer = async (demande: any, etatpayement: number = 0) => {
    if (!token) return;
    if (terminerLoading[demande.id]) return;

    setTerminerLoading(prev => ({...prev, [demande.id]: true}));

    const key = `dur-${demande.id}`;
    const ext = extensionsRef.current[key];
    const tempsAjoute = ext ? ext.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
    const tauxTerminer = ext && (ext.tauxHoraire > 0 ? ext.tauxHoraire : (ext.prixInitial / ext.dureeInitiale));
    const coutAjoute = tempsAjoute > 0
      ? (ext
          ? Math.round(tempsAjoute * (tauxTerminer || 0) * 100) / 100
          : parseFloat(demande.cout_ajoute) || 0)
      : 0;

    console.log('[TERMINER] id=', demande.id, '| ext=', ext, '| tempsAjoute=', tempsAjoute, '| coutAjoute=', coutAjoute, '| etatpayement=', etatpayement);

    const result = await dispatch(
      terminerDemandeAction(token, demande.id, demande.type_service, tempsAjoute, coutAjoute, etatpayement) as any,
    );

    if (result?.code !== 200) {
      setTerminerLoading(prev => ({...prev, [demande.id]: false}));
      // Calcule isTermine depuis les dates (plus de dépendance au state tempsRestants)
      const extCheck = extensionsRef.current[key];
      const dureeInitiale = extCheck ? extCheck.dureeInitiale : getDureeHeures(demande);
      const extraDuree = extCheck ? extCheck.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
      const missionStart = getMissionStart(demande);
      const isTermine = missionStart !== null && Date.now() >= missionStart + (dureeInitiale + extraDuree) * 3600000;
      if (!isTermine) {
        Alert.alert(
          t('alerts.missionNotFinishedTitle'),
          result?.message || JSON.stringify(result),
        );
      }
      return;
    }

    setTerminerLoading(prev => ({...prev, [demande.id]: false}));
    setDemandes(prev =>
      prev.map(item =>
        item.id === demande.id ? {...item, statut: 'termine', etatpayement} : item,
      ),
    );

    // Paiement déjà confirmé via ce bouton : empêche la vérification automatique
    // (checkPaiementClientTermine) de reproposer la popup pour cette même mission.
    const paiementKey = `${demande.type_service}-${demande.id}`;
    paiementPromptedRef.current.add(paiementKey);
    prevStatutPaiementRef.current[paiementKey] = 'termine';
  };

  // Ref à jour vers handleTerminer pour l'auto-clôture des activités (évite de recréer l'interval à chaque render)
  const handleTerminerRef = useRef(handleTerminer);
  useEffect(() => {
    handleTerminerRef.current = handleTerminer;
  });

  // Activités : dès que la durée prévue est écoulée, affiche automatiquement la popup
  // de confirmation de paiement (comme pour babysitter/transfert/guide sur le bouton
  // Terminer), sans attendre que le prestataire appuie sur un bouton.
  useEffect(() => {
    const interval = setInterval(() => {
      demandesRef.current.forEach((demande: any) => {
        if (demande.type_service !== 'activite') return;
        if (demande.statut !== 'en_cours') return;
        if (autoTerminesRef.current.has(demande.id)) return;
        if (!computeIsTermine(demande, extensionsRef)) return;

        autoTerminesRef.current.add(demande.id);
        Vibration.vibrate(2000);
        Alert.alert(
          t('alerts.paymentTitle'),
          t('alerts.activityFinishedPaymentMessage'),
          [
            {text: t('alerts.yes'), onPress: () => handleTerminerRef.current(demande, 1)},
            {text: t('alerts.no'), style: 'cancel', onPress: () => handleTerminerRef.current(demande, 0)},
          ],
          {cancelable: false},
        );
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [t]);

  const handleAnnuler = async (demande: any) => {
    if (!token) return;

    Alert.alert(
      t('alerts.cancelMissionTitle'),
      t('alerts.cancelMissionMessage'),
      [
        {
          text: t('alerts.no'),
          style: 'cancel',
        },
        {
          text: t('alerts.yes'),
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(
              annulerDemandeAction(token, demande.id, demande.type_service) as any,
            );

            if (result?.code === 200) {
              setDemandes(prev => prev.filter(item => item.id !== demande.id));
            } else {
              Alert.alert(
                t('alerts.errorTitle'),
                result?.message || t('alerts.cancelError'),
              );
            }
          },
        },
      ],
    );
  };




  return (
    <SafeAreaView style={styles.container}>
<View style={styles.header}>
  <Text style={styles.title}>{t('header.title')}</Text>


</View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtresContainer}
        contentContainerStyle={styles.filtresContent}>
        {FILTRES.map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filtrePill,
              filtre === f && styles.filtrePillActive,
            ]}
            onPress={() => setFiltre(f)}>
            <Text
              style={[
                styles.filtreText,
                filtre === f && styles.filtreTextActive,
              ]}>
              {t(`filters.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {demandes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{t('empty.text')}</Text>
            </View>
          ) : (
            demandes.map((demande: any) => {
              const statut = STATUT_CONFIG[demande.statut] || {
                color: '#FFFFFF',
                bg: COLORS.textSecondary,
              };

              return (
                <View
                  key={demande.id}
                  style={[
                    styles.card,
                    demande.statut === 'termine' && styles.cardTerminee,
                  ]}>
                  <TouchableOpacity
                    style={styles.cardTop}
                    onPress={() => handlePress(demande)}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.serviceIcon}>
                        {SERVICE_ICONS[demande.type_service] || '📋'}
                      </Text>

                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>
                          {demande.type_service === 'restaurant'
                            ? (Array.isArray(demande.plats) && demande.plats.length > 0
                                ? demande.plats.map((p: any) => p.name).join(', ')
                                : demande.ville)
                            : demande.ville}
                        </Text>
                        <Text style={styles.cardDate}>
                          {demande.date || t('card.dateNotSet')} à{' '}
                          {demande.heure || t('card.timeNotSet')}
                        </Text>
                        {demande.type_service === 'restaurant' && (
                          <>
                            <Text style={styles.cardDate}>📍 {demande.ville}</Text>
                            {demande.adress ? (
                              <Text style={styles.cardDate}>🏠 {demande.adress}</Text>
                            ) : null}
                            {demande.client_prenom ? (
                              <Text style={styles.cardDate}>👤 {demande.client_prenom}</Text>
                            ) : null}
                            {demande.comment ? (
                              <Text style={styles.cardDate}>💬 {demande.comment}</Text>
                            ) : null}
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <Text style={styles.prix}>{demande.prix_total} SAR</Text>

                      <View style={[styles.badge, {backgroundColor: statut.bg}]}>
                        <Text style={[styles.badgeText, {color: statut.color}]}>
                          {t(`statutLabels.${demande.statut}`, {defaultValue: demande.statut})}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {demande.statut === 'accepte' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.annulerButton}
                        onPress={() => handleAnnuler(demande)}>
                        <Text style={styles.annulerText}>{t('actions.cancel')}</Text>
                      </TouchableOpacity>

                      {/* CORRECTIF 2 : spinner + disabled pendant l'appel serveur */}
                      <TouchableOpacity
                        style={[styles.commencerButton, commencerLoading[demande.id] && {opacity: 0.6}]}
                        disabled={!!commencerLoading[demande.id]}
                        onPress={() => handleCommencer(demande)}>
                        {commencerLoading[demande.id]
                          ? <ActivityIndicator color="#FFFFFF" size="small" />
                          : <Text style={styles.commencerText}>{t('actions.start')}</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {demande.statut === 'en_cours' && (
                    <>
                      {/* CORRECTIF 1 : TimerDisplay isolé — le re-render 1s ne touche plus les autres cartes */}
                      <TimerDisplay
                        demande={demande}
                        extensionsRef={extensionsRef}
                      />
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.annulerButton}
                          onPress={() => handleAnnuler(demande)}>
                          <Text style={styles.annulerText}>{t('actions.cancel')}</Text>
                        </TouchableOpacity>

                        {demande.type_service === 'restaurant' ? (
                          <TouchableOpacity
                            style={[styles.terminerButton, livrerLoading[demande.id] && {opacity: 0.6}]}
                            disabled={!!livrerLoading[demande.id]}
                            onPress={() => handleLivrer(demande)}>
                            {livrerLoading[demande.id]
                              ? <ActivityIndicator color="#FFFFFF" size="small" />
                              : <Text style={styles.terminerText}>{t('actions.deliver')}</Text>}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.terminerButton, terminerLoading[demande.id] && {opacity: 0.6}]}
                            disabled={!!terminerLoading[demande.id]}
                            onPress={() => {
                              // Calcule isTermine depuis les dates au moment du clic
                              const ext = extensionsRef.current[`dur-${demande.id}`];
                              const dureeInitiale = ext ? ext.dureeInitiale : getDureeHeures(demande);
                              const extraDuree = ext ? ext.extraDuree : (parseFloat(demande.temps_ajoute) || 0);
                              const missionStart = getMissionStart(demande);
                              const isTermine = missionStart !== null && Date.now() >= missionStart + (dureeInitiale + extraDuree) * 3600000;

                              const showPayment =
                                ((demande.type_service === 'babysitter' || demande.type_service === 'activite') && isTermine) ||
                                demande.type_service === 'transfert' ||
                                demande.type_service === 'guide';
                              if (showPayment) {
                                Alert.alert(
                                  t('alerts.paymentTitle'),
                                  t('alerts.cashPaymentMessage'),
                                  [
                                    {
                                      text: t('alerts.yes'),
                                      onPress: () => handleTerminer(demande, 1),
                                    },
                                    {
                                      text: t('alerts.no'),
                                      style: 'cancel',
                                      onPress: () => handleTerminer(demande, 0),
                                    },
                                  ],
                                );
                              } else {
                                handleTerminer(demande);
                              }
                            }}>
                            {terminerLoading[demande.id]
                              ? <ActivityIndicator color="#FFFFFF" size="small" />
                              : <Text style={styles.terminerText}>{t('actions.finish')}</Text>}
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}

                  {demande.statut === 'livraison' && demande.type_service === 'restaurant' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.terminerButton, {marginLeft: 0}, terminerLoading[demande.id] && {opacity: 0.6}]}
                        disabled={!!terminerLoading[demande.id]}
                        onPress={() => {
                          Alert.alert(
                            t('alerts.paymentTitle'),
                            t('alerts.cashPaymentMessage'),
                            [
                              {
                                text: t('alerts.yes'),
                                onPress: () => handleTerminer(demande, 1),
                              },
                              {
                                text: t('alerts.no'),
                                style: 'cancel',
                                onPress: () => handleTerminer(demande, 0),
                              },
                            ],
                          );
                        }}>
                        {terminerLoading[demande.id]
                          ? <ActivityIndicator color="#FFFFFF" size="small" />
                          : <Text style={styles.terminerText}>{t('actions.finish')}</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {demande.statut === 'termine' && demande.type_service === 'babysitter' && (() => {
                    const base = parseFloat(demande.totalprice ?? demande.prix_total ?? 0);
                    const extra = parseFloat(demande.cout_ajoute ?? 0);
                    const total = Math.round((base + extra) * 100) / 100;
                    const paye = Number(demande.etatpayement) === 1;
                    return (
                      <View style={styles.termineeRow}>
                        <View style={[styles.totalBadge, paye ? styles.totalBadgePaye : styles.totalBadgeNonPaye]}>
                          <Text style={[styles.totalBadgeText, paye ? styles.totalBadgeTextPaye : styles.totalBadgeTextNonPaye]}>
                            {total.toFixed(2)} SAR — {paye ? t('payment.paid') : t('payment.notPaid')}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {demande.statut === 'termine' && demande.type_service === 'transfert' && (() => {
                    const total = Math.round(parseFloat(demande.totalprice ?? demande.prix_total ?? 0) * 100) / 100;
                    const paye = Number(demande.etatpayement) === 1;
                    return (
                      <View style={styles.termineeRow}>
                        <View style={[styles.totalBadge, paye ? styles.totalBadgePaye : styles.totalBadgeNonPaye]}>
                          <Text style={[styles.totalBadgeText, paye ? styles.totalBadgeTextPaye : styles.totalBadgeTextNonPaye]}>
                            {total.toFixed(2)} SAR — {paye ? t('payment.paid') : t('payment.notPaid')}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {demande.statut === 'termine' && demande.type_service === 'guide' && (() => {
                    const total = Math.round(parseFloat(demande.totalprice ?? demande.prix_total ?? 0) * 100) / 100;
                    const paye = Number(demande.etatpayement) === 1;
                    return (
                      <View style={styles.termineeRow}>
                        <View style={[styles.totalBadge, paye ? styles.totalBadgePaye : styles.totalBadgeNonPaye]}>
                          <Text style={[styles.totalBadgeText, paye ? styles.totalBadgeTextPaye : styles.totalBadgeTextNonPaye]}>
                            {total.toFixed(2)} SAR — {paye ? t('payment.paid') : t('payment.notPaid')}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {demande.statut === 'termine' && demande.type_service === 'restaurant' && (() => {
                    const total = Math.round(parseFloat(demande.totalprice ?? demande.prix_total ?? 0) * 100) / 100;
                    const paye = Number(demande.etatpayement) === 1;
                    return (
                      <View style={styles.termineeRow}>
                        <View style={[styles.totalBadge, paye ? styles.totalBadgePaye : styles.totalBadgeNonPaye]}>
                          <Text style={[styles.totalBadgeText, paye ? styles.totalBadgeTextPaye : styles.totalBadgeTextNonPaye]}>
                            {total.toFixed(2)} SAR — {paye ? t('payment.paid') : t('payment.notPaid')}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {demande.statut === 'termine' && demande.type_service === 'activite' && (() => {
                    const total = Math.round(parseFloat(demande.totalprice ?? demande.prix_total ?? 0) * 100) / 100;
                    const paye = Number(demande.etatpayement) === 1;
                    return (
                      <View style={styles.termineeRow}>
                        <View style={[styles.totalBadge, paye ? styles.totalBadgePaye : styles.totalBadgeNonPaye]}>
                          <Text style={[styles.totalBadgeText, paye ? styles.totalBadgeTextPaye : styles.totalBadgeTextNonPaye]}>
                            {total.toFixed(2)} SAR — {paye ? t('payment.paid') : t('payment.notPaid')}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cardTerminee: {
    opacity: 0.45,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  filtresContainer: {
    maxHeight: 60,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  filtresContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  filtrePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.card,
  },

  filtrePillActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },

  filtreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  filtreTextActive: {
    color: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    padding: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  card: {
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

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  serviceIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  cardInfo: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  cardDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  cardRight: {
    alignItems: 'flex-end',
  },

  prix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },

  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  timerRow: {
    marginTop: 10,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  timerTermine: {
    color: '#D32F2F',
  },

  extensionText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },

  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },

  annulerButton: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },

  annulerText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  commencerButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },

  commencerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  terminerButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },

  terminerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  termineeRow: {
    marginTop: 12,
  },

  totalBadge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  totalBadgePaye: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },

  totalBadgeNonPaye: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },

  totalBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },

  totalBadgeTextPaye: {
    color: '#2E7D32',
  },

  totalBadgeTextNonPaye: {
    color: '#E65100',
  },
});

export default DemandesScreen;
