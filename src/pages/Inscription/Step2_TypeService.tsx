import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {updateInscriptionForm} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

type ServiceItem = {
  key: string;
  icon: string;
  labelKey: string;
};

const Step2_TypeService = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form = useSelector((s: RootState) => s.proReducer.inscriptionForm);
  const sexe = form.sexe;

  const [selected, setSelected] = useState(form.type_service);
  const [error, setError] = useState('');

  const services: ServiceItem[] = [
    ...(sexe !== 'H' ? [{key: 'babysitter', icon: '👶', labelKey: 'inscription.step2.babysitter'}] : []),

    {key: 'guide',      icon: '🗺️', labelKey: 'inscription.step2.guide'},
    {key: 'transfert',  icon: '🚗', labelKey: 'inscription.step2.transfert'},
    {key: 'restaurant', icon: '🍽️', labelKey: 'inscription.step2.restaurant'},
    {key: 'activite',   icon: '🎯', labelKey: 'inscription.step2.activite'},
  ];

  const handleSuivant = () => {
    if (!selected) {
      setError(t('inscription.step2.erreur_selection'));
      return;
    }
    dispatch(updateInscriptionForm({type_service: selected}) as any);
    navigation.navigate('Step3_PaysVilles');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={2} total={7} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.titre}>{t('inscription.step2.titre')}</Text>
        <Text style={styles.sousTitre}>{t('inscription.step2.sous_titre')}</Text>

        <View style={styles.grid}>
          {services.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.card, selected === s.key && styles.cardActive]}
              onPress={() => {setSelected(s.key); setError('');}}>
              <Text style={styles.cardIcon}>{s.icon}</Text>
              <Text style={[styles.cardLabel, selected === s.key && styles.cardLabelActive]}>
                {t(s.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.btnSuivant} onPress={handleSuivant}>
          <Text style={styles.btnSuivantText}>{t('inscription.suivant')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetourText}>{t('inscription.precedent')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 8},
  sousTitre: {fontSize: 15, color: COLORS.textSecondary, marginBottom: 28},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  card: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 16,
    marginRight: '6%',
  },
  cardActive: {borderColor: COLORS.primary, backgroundColor: '#E8F5F0'},
  cardIcon: {fontSize: 40, marginBottom: 12},
  cardLabel: {fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center'},
  cardLabelActive: {color: COLORS.primary},
  errorText: {color: COLORS.danger, fontSize: 14, marginBottom: 16, textAlign: 'center'},
  btnSuivant: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  btnSuivantText: {color: '#FFF', fontSize: 16, fontWeight: 'bold'},
  btnRetour: {
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRetourText: {color: COLORS.textSecondary, fontSize: 15},
});

export default Step2_TypeService;
