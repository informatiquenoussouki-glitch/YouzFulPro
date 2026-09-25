import React, {useEffect} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {loadNotation} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';

const StarRating = ({note}: {note: number}) => {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={[styles.starIcon, s <= note ? styles.starFilled : styles.starEmpty]}>
          ★
        </Text>
      ))}
    </View>
  );
};

const NotationScreen = () => {
  const {t} = useTranslation('notation');
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {token, notation} = useSelector((state: RootState) => state.proReducer);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    fetchNotation();
  }, []);

  const fetchNotation = async () => {
    if (!token) return;
    setLoading(true);
    await dispatch(loadNotation(token) as any);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const avis = (notation as any)?.avis || [];
  const nbAvis = (notation as any)?.nb_avis || 0;
  const nbPositifs = (notation as any)?.nb_positifs || 0;
  const nbMoyens = (notation as any)?.nb_moyens || 0;
  const nbNegatifs = (notation as any)?.nb_negatifs || 0;
  const position = notation?.position || 0;
  const totalPrestataires = (notation as any)?.total_prestataires || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backLabel}>{t('header.back')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('header.title')}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* NOTE PRINCIPALE */}
        <View style={styles.noteCard}>
          <Text style={styles.noteBig}>
            {notation?.note ? Number(notation.note).toFixed(1) : '—'}
          </Text>
          <Text style={styles.noteSur}>/5</Text>
          <StarRating note={Math.round(notation?.note || 0)} />
          <Text style={styles.nbAvis}>{t('nbAvis', {count: nbAvis})}</Text>

          {/* REPARTITION POSITIF / MOYEN / NEGATIF */}
          <View style={styles.repartitionRow}>
            <View style={styles.repartitionItem}>
              <Text style={[styles.repartitionValue, styles.repartitionPositif]}>{nbPositifs}</Text>
              <Text style={styles.repartitionLabel}>{t('repartition.positifs')}</Text>
              <Text style={styles.repartitionSub}>4-5 ★</Text>
            </View>
            <View style={styles.repartitionSeparator} />
            <View style={styles.repartitionItem}>
              <Text style={[styles.repartitionValue, styles.repartitionMoyen]}>{nbMoyens}</Text>
              <Text style={styles.repartitionLabel}>{t('repartition.moyens')}</Text>
              <Text style={styles.repartitionSub}>3 ★</Text>
            </View>
            <View style={styles.repartitionSeparator} />
            <View style={styles.repartitionItem}>
              <Text style={[styles.repartitionValue, styles.repartitionNegatif]}>{nbNegatifs}</Text>
              <Text style={styles.repartitionLabel}>{t('repartition.negatifs')}</Text>
              <Text style={styles.repartitionSub}>1-2 ★</Text>
            </View>
          </View>

          {position > 0 && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>
                {t('position.label', {
                  position,
                  suffix: t(position === 1 ? 'position.suffixFirst' : 'position.suffixOther'),
                  totalSuffix: totalPrestataires > 0 ? t('position.totalSuffix', {total: totalPrestataires}) : '',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* CONSEILS */}
        <View style={styles.conseilsCard}>
          <Text style={styles.conseilsTitle}>{t('conseils.title')}</Text>
          <View style={styles.conseilItem}>
            <Text style={styles.conseilIcon}>⚡</Text>
            <Text style={styles.conseilText}>
              {t('conseils.respond')}
            </Text>
          </View>
          <View style={styles.conseilItem}>
            <Text style={styles.conseilIcon}>⭐</Text>
            <Text style={styles.conseilText}>
              {t('conseils.rating')}
            </Text>
          </View>
          <View style={styles.conseilItem}>
            <Text style={styles.conseilIcon}>📅</Text>
            <Text style={styles.conseilText}>
              {t('conseils.dispo')}
            </Text>
          </View>
        </View>

        {/* AVIS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reviews.title', {count: nbAvis})}</Text>
          {avis.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>{t('reviews.empty')}</Text>
            </View>
          ) : (
            avis.map((avis_item: any, index: number) => (
              <View key={index} style={styles.avisCard}>
                <View style={styles.avisHeader}>
                  <View>
                    <Text style={styles.clientName}>{avis_item.client_prenom}</Text>
                    <Text style={styles.avisDate}>{avis_item.date}</Text>
                  </View>
                  <StarRating note={avis_item.note} />
                </View>
                {avis_item.commentaire ? (
                  <Text style={styles.commentaire}>{avis_item.commentaire}</Text>
                ) : null}
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
  loader: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  noteCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  noteBig: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 72,
  },
  noteSur: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starIcon: {
    fontSize: 28,
    marginHorizontal: 2,
  },
  starFilled: {
    color: '#FFB300',
  },
  starEmpty: {
    color: 'rgba(255,255,255,0.3)',
  },
  nbAvis: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  positionBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  repartitionRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
    width: '100%',
  },
  repartitionItem: {
    flex: 1,
    alignItems: 'center',
  },
  repartitionSeparator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4,
  },
  repartitionValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  repartitionPositif: {
    color: '#4CAF50',
  },
  repartitionMoyen: {
    color: '#FFC107',
  },
  repartitionNegatif: {
    color: '#EF5350',
  },
  repartitionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  repartitionSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  conseilsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  conseilsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  conseilItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conseilIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  conseilText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  avisCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  avisDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  commentaire: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
});

export default NotationScreen;
