import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {loadRevenus} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';

const PERIODES = [
  {labelKey: 'periodes.mois.label', lowerKey: 'periodes.mois.lower', value: 'mois'},
  {labelKey: 'periodes.semaine.label', lowerKey: 'periodes.semaine.lower', value: 'semaine'},
  {labelKey: 'periodes.annee.label', lowerKey: 'periodes.annee.lower', value: 'annee'},
];

const SERVICE_ICONS: {[key: string]: string} = {
  babysitter: '👶',
  guide: '🗺️',
  transfert: '🚗',
  restaurant: '🍽️',
  activite: '🎢',
};

const RevenusScreen = () => {
  const {t} = useTranslation('revenus');
  const dispatch = useDispatch();
  const {token, revenus} = useSelector((state: RootState) => state.proReducer);
  const [periode, setPeriode] = useState('mois');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchRevenus = async () => {
      if (!token) return;
      setLoading(true);
      try {
        await dispatch(loadRevenus(token, periode) as any);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchRevenus();
    return () => {
      cancelled = true;
    };
  }, [periode, token, dispatch]);

  const formatMontant = (montant: number) => {
    return montant?.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'SAR',
    }) || '0 SAR';
  };

  const historique = revenus?.historique || [];
  const totalCalcule = historique.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.montant) || 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* BANDEAU TOTAL + FILTRES */}
        <View style={styles.totalCard}>
          {/* Filtres à l'intérieur du bandeau */}
          <View style={styles.filtresRow}>
            {PERIODES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.filtrePill, periode === p.value && styles.filtrePillActive]}
                onPress={() => setPeriode(p.value)}>
                <Text
                  style={[
                    styles.filtreText,
                    periode === p.value && styles.filtreTextActive,
                  ]}>
                  {t(p.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.totalLabel}>
            {t('totalLabel', {period: t(PERIODES.find(p => p.value === periode)?.lowerKey || 'periodes.mois.lower')})}
          </Text>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="large" style={{marginTop: 8}} />
          ) : (
            <Text style={styles.totalAmount}>
              {formatMontant(totalCalcule || revenus?.total_mois || 0)}
            </Text>
          )}
        </View>

        {/* HISTORIQUE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('history.title')}</Text>
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : historique.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>{t('history.empty')}</Text>
            </View>
          ) : (
            historique.map((item: any, index: number) => (
              <View key={index} style={styles.paiementCard}>
                <View style={styles.paiementLeft}>
                  <Text style={styles.serviceIcon}>
                    {SERVICE_ICONS[item.type_service] || '💼'}
                  </Text>
                  <View>
                    <Text style={styles.clientName}>{item.client_prenom}</Text>
                    <Text style={styles.paiementDate}>{item.date}</Text>
                    <Text style={styles.paiementType}>{item.type_service}</Text>
                  </View>
                </View>
                <Text style={styles.montant}>+{item.montant} SAR</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    padding: 16,
  },
  totalCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filtresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  filtrePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filtrePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filtreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  filtreTextActive: {
    color: COLORS.secondary,
  },
  loader: {
    marginVertical: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paiementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  paiementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  paiementDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paiementType: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  montant: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
});

export default RevenusScreen;
