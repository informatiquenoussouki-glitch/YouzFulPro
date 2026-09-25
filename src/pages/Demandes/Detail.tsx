import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {accepterDemandeAction, refuserDemandeAction} from '../../redux/actions/pro.actions';
import {getDetailDemande, getMesDemandes} from '../../api/settings';
import {COLORS, BASE_URL} from '../../helpers/config';

const SERVICE_ICONS: {[key: string]: string} = {
  babysitter: '👶',
  guide: '🗺️',
  transfert: '🚗',
  restaurant: '🍽️',
  activite: '🎢',
};

const STATUT_COLORS: {[key: string]: string} = {
  en_attente: '#FF9800',
  accepte: '#FF9800',
  en_cours: COLORS.primary,
  termine: '#4CAF50',
  refuse: COLORS.danger,
  annule: COLORS.danger,
};

const InfoRow = ({
  label,
  value,
  highlight,
  last,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) => (
  <View style={[styles.row, last && styles.rowLast]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
  </View>
);

const DetailScreen = () => {
  const {t} = useTranslation('demandes');
  const route = useRoute<any>();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.proReducer.token);
  const [demande, setDemande] = useState<any>(route.params?.demande || null);
  const [loading, setLoading] = useState(false);
  const extension = route.params?.extension || null;

  useEffect(() => {
    if (route.params?.demande?.id && route.params?.demande?.type_service) {
      fetchDetail();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDetail = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await getDetailDemande(
        token,
        route.params.demande.id,
        route.params.demande.type_service,
      );
      console.log('DetailDemande debug:', JSON.stringify(response.data?.debug));
      setDemande(response.data?.demande || route.params.demande);
    } catch (error: any) {
      console.log('DetailDemande HTTP status:', error?.status);
      console.log('DetailDemande error message:', error?.message);
      console.log('DetailDemande error data:', JSON.stringify(error?.data ?? error));
      // garde les données initiales
    } finally {
      setLoading(false);
    }
  };

  const parseStart = (d: any) => {
    const h = (d.heure || '00:00').substring(0, 5);
    return new Date(`${d.date}T${h}:00`);
  };
  const parseEnd = (d: any) => {
    const start = parseStart(d);
    return new Date(start.getTime() + (parseFloat(d.duree) || 1) * 3600000);
  };

  // Extrait le nom du véhicule depuis typevisites : "Aéroport (sedan)" → "sedan"
  const extractVehicule = (tv: string) => {
    const match = (tv || '').match(/\(([^)]+)\)\s*$/);
    return match ? match[1].trim() : (tv || '').trim();
  };

  // Appel du client : uniquement pour le babysitting, une fois la mission acceptée
  // (statut différent de 'en_attente').
  const canCallClient =
    demande?.type_service === 'babysitter' &&
    demande?.statut !== 'en_attente' &&
    !!demande?.client_telephone;

  const handleCallClient = () => {
    if (!demande?.client_telephone) return;
    Linking.openURL(`tel:${demande.client_telephone}`);
  };

  const handleAccepter = async () => {
    if (!token || !demande) return;
    try {
      const response = await getMesDemandes(token, 'all');
      const toutes = response.data?.demandes || [];
      const now = new Date();
      const newStart = parseStart(demande);
      const newEnd = parseEnd(demande);

      if (demande.type_service === 'transfert') {
        // Transfert : chaque véhicule ne peut faire qu'1 mission à la fois
        const vehiculeNew = extractVehicule(demande.typevisites || '');
        const conflit = toutes.some((d: any) => {
          if (d.statut !== 'accepte' && d.statut !== 'en_cours') return false;
          if (!d.date || !d.heure) return false;
          if (extractVehicule(d.typevisites || '') !== vehiculeNew) return false;
          const dFin = new Date(parseStart(d).getTime() + 2 * 3600000); // 2h par défaut
          if (now > dFin) return false;
          return newStart < dFin && parseStart(d) < newEnd;
        });
        if (conflit) {
          Alert.alert(
            t('detail.alerts.vehicleUnavailableTitle'),
            t('detail.alerts.vehicleUnavailableMessage', {
              vehicule: vehiculeNew ? ' (' + vehiculeNew + ')' : '',
            }),
          );
          return;
        }
      } else {
        // Babysitter / Guide : max 3 missions simultanées
        const nbConflits = toutes.filter((d: any) => {
          if (d.statut !== 'accepte' && d.statut !== 'en_cours') return false;
          if (!d.date || !d.heure) return false;
          if (now > parseEnd(d)) return false;
          return newStart < parseEnd(d) && parseStart(d) < newEnd;
        }).length;
        if (nbConflits >= 3) {
          Alert.alert(
            t('detail.alerts.limitReachedTitle'),
            t('detail.alerts.limitReachedMessage'),
          );
          return;
        }
      }
    } catch {
      // réseau : on laisse passer, le serveur fera la vérification
    }
    const result = await dispatch(
      accepterDemandeAction(token, demande.id, demande.type_service) as any,
    );
    if (result?.success === false) {
      Alert.alert(t('detail.alerts.notAvailableTitle'), result.message || t('detail.alerts.acceptError'));
      return;
    }
    Alert.alert(t('detail.alerts.successTitle'), t('detail.alerts.successMessage'));
    navigation.goBack();
  };

  const handleRefuser = async () => {
    if (!token || !demande) return;
    Alert.alert(t('detail.alerts.confirmTitle'), t('detail.alerts.confirmRefuseMessage'), [
      {text: t('detail.alerts.cancel'), style: 'cancel'},
      {
        text: t('detail.alerts.refuse'),
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(
            refuserDemandeAction(token, demande.id, demande.type_service) as any,
          );
          if (result?.success !== false) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!demande) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{t('detail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  // Calcul des données financières
  const dureeInitiale = extension?.dureeInitiale ?? parseFloat(demande.duree) ?? 0;
  const prixInitial = extension?.prixInitial ?? parseFloat(demande.prix_initial) ?? parseFloat(demande.prix_total) ?? 0;
  const tempsAjoute = extension?.extraDuree ?? parseFloat(demande.temps_ajoute) ?? 0;
  const tauxHoraire = dureeInitiale > 0 ? prixInitial / dureeInitiale : 0;
  const coutAjoute = tempsAjoute > 0
    ? (extension
        ? Math.round(tempsAjoute * tauxHoraire * 100) / 100
        : parseFloat(demande.cout_ajoute) || Math.round(tempsAjoute * tauxHoraire * 100) / 100)
    : 0;
  const prixTotal = parseFloat(demande.prix_total) ?? 0;
  const dureeTotal = dureeInitiale + tempsAjoute;

  const statutColor = STATUT_COLORS[demande.statut] || COLORS.textSecondary;
  const isRestaurant = demande.type_service === 'restaurant';
  const plats: any[] = Array.isArray(demande.plats) ? demande.plats : [];
  const totalPlats = plats.reduce(
    (sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.qte, 10) || 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backLabel}>{t('detail.back')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('detail.title')}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* SERVICE + STATUT */}
        <View style={styles.card}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceLeft}>
              <Text style={styles.serviceIconText}>
                {SERVICE_ICONS[demande.type_service] || '📋'}
              </Text>
              <Text style={styles.serviceLabel}>
                {t(`serviceLabels.${demande.type_service}`, {defaultValue: demande.type_service})}
              </Text>
            </View>
            <View style={[styles.statutBadge, {backgroundColor: statutColor}]}>
              <Text style={styles.statutText}>
                {t(`detail.statutLabels.${demande.statut}`, {defaultValue: demande.statut})}
              </Text>
            </View>
          </View>
        </View>

        {/* INFORMATIONS GÉNÉRALES */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('detail.sections.informations')}</Text>
          <InfoRow label={t('detail.fields.numeroDemande')} value={String(demande.id)} />
          <InfoRow label={t('detail.fields.ville')} value={demande.ville || '—'} />
          {isRestaurant ? (
            <InfoRow label={t('detail.fields.adresse')} value={demande.adress || '—'} last={!demande.notes} />
          ) : (
            <>
              <InfoRow label={t('detail.fields.date')} value={demande.date || '—'} />
              <InfoRow label={t('detail.fields.heureDebut')} value={(demande.heure || '').substring(0, 5) || '—'} />
              <InfoRow label={t('detail.fields.dureePrevue')} value={`${dureeInitiale}h`} />
              {(demande.nbrenfants || demande.nb_personnes) ? (
                <InfoRow
                  label={t('detail.fields.personnes')}
                  value={String(demande.nbrenfants || demande.nb_personnes)}
                />
              ) : null}
            </>
          )}
          {demande.notes ? (
            <InfoRow label={t('detail.fields.notes')} value={demande.notes} last />
          ) : null}
        </View>

        {/* PLATS COMMANDÉS (restaurant uniquement) */}
        {isRestaurant && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('detail.sections.platsCommandes', {count: plats.length})}</Text>
            {plats.length === 0 ? (
              <Text style={styles.emptyPlatsText}>
                {t('detail.sections.noPlats')}
              </Text>
            ) : null}
            {plats.map((plat, index) => {
              const imageUri = plat.urlpic
                ? plat.urlpic.startsWith('http')
                  ? plat.urlpic
                  : `${BASE_URL}/${plat.urlpic}`
                : null;
              const unitPrice = parseFloat(plat.price) || 0;
              const qte = parseInt(plat.qte, 10) || 0;
              return (
                <View
                  key={index}
                  style={[styles.platRow, index === plats.length - 1 && styles.platRowLast]}>
                  {imageUri ? (
                    <Image source={{uri: imageUri}} style={styles.platImage} />
                  ) : (
                    <View style={styles.platImagePlaceholder}>
                      <Text style={styles.platImagePlaceholderText}>🍽️</Text>
                    </View>
                  )}
                  <View style={styles.platInfo}>
                    <Text style={styles.platName}>{plat.name}</Text>
                    {plat.ingredients ? (
                      <Text style={styles.platIngredients} numberOfLines={2}>
                        {plat.ingredients}
                      </Text>
                    ) : null}
                    <View style={styles.platMetaRow}>
                      <View style={styles.platQteBadge}>
                        <Text style={styles.platQteText}>x{qte}</Text>
                      </View>
                      <Text style={styles.platUnitPrice}>{unitPrice.toFixed(2)} {t('detail.unitPriceSuffix')}</Text>
                    </View>
                  </View>
                  <Text style={styles.platSubtotal}>{(unitPrice * qte).toFixed(2)} SAR</Text>
                </View>
              );
            })}
            <View style={styles.totalSeparator} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('detail.sections.totalPlats')}</Text>
              <Text style={styles.totalValue}>{totalPlats.toFixed(2)} SAR</Text>
            </View>
          </View>
        )}

        {/* CLIENT */}
        {(demande.client_prenom || demande.client_nom || demande.client_email) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('detail.sections.client')}</Text>
            {demande.client_prenom ? (
              <InfoRow label={t('detail.fields.prenom')} value={demande.client_prenom} />
            ) : null}
            {demande.client_nom ? (
              <InfoRow label={t('detail.fields.nom')} value={demande.client_nom} />
            ) : null}
            {demande.client_email ? (
              <InfoRow label={t('detail.fields.email')} value={demande.client_email} />
            ) : null}
            {canCallClient ? (
              <View style={[styles.row, styles.rowLast]}>
                <Text style={styles.rowLabel}>{t('detail.fields.telephone')}</Text>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallClient}
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.fields.telephone')}>
                  <Text style={styles.rowValue}>{demande.client_telephone}</Text>
                  <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* FACTURATION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('detail.sections.facturation')}</Text>
          <InfoRow label={t('detail.fields.prixBase')} value={`${prixInitial.toFixed(2)} SAR`} />
          <InfoRow label={t('detail.fields.dureeInitiale')} value={`${dureeInitiale}h`} />

          {tempsAjoute > 0 && (
            <>
              <View style={styles.divider} />
              <InfoRow
                label={t('detail.fields.tempsAjoute')}
                value={`+${tempsAjoute * 60} min`}
                highlight
              />
              <InfoRow
                label={t('detail.fields.coutAjoute')}
                value={`+${coutAjoute.toFixed(2)} SAR`}
                highlight
              />
              <InfoRow
                label={t('detail.fields.dureeTotale')}
                value={`${dureeTotal}h`}
              />
            </>
          )}

          <View style={styles.totalSeparator} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('detail.sections.total')}</Text>
            <Text style={styles.totalValue}>{prixTotal.toFixed(2)} SAR</Text>
          </View>
        </View>

        {/* ACTIONS */}
        {demande.statut === 'en_attente' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.accepterButton} onPress={handleAccepter}>
              <Text style={styles.accepterText}>{t('detail.actions.accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refuserButton} onPress={handleRefuser}>
              <Text style={styles.refuserText}>{t('detail.actions.refuse')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSide: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 158, 117, 0.1)',
  },
  backIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 4,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconText: {
    fontSize: 28,
    marginRight: 10,
  },
  serviceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statutBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowValueHighlight: {
    color: '#FF9800',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 10,
    marginBottom: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  platRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  platRowLast: {
    borderBottomWidth: 0,
  },
  platImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  platImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platImagePlaceholderText: {
    fontSize: 22,
  },
  platInfo: {
    flex: 1,
    marginRight: 8,
  },
  platName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  platIngredients: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  platMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  platQteBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  platQteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  platUnitPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  platSubtotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyPlatsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  actionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  accepterButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accepterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refuserButton: {
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  refuserText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DetailScreen;
