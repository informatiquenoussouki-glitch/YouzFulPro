import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {updateInscriptionForm, getLanguesAction} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const Step5_Langues = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form    = useSelector((s: RootState) => s.proReducer.inscriptionForm);
  const langues = useSelector((s: RootState) => s.proReducer.langues);

  const [selected, setSelected] = useState<number[]>(form.langues || []);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (langues.length === 0) {
      setLoading(true);
      dispatch(getLanguesAction() as any).finally(() => setLoading(false));
    }
  }, []);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
    setError('');
  };

  const handleSuivant = () => {
    if (selected.length === 0) {
      setError(t('inscription.step5.erreur'));
      return;
    }
    dispatch(updateInscriptionForm({langues: selected}) as any);
    navigation.navigate('Step6_Paiement');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={5} total={7} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.titre}>{t('inscription.step5.titre')}</Text>
        <Text style={styles.sousTitre}>{t('inscription.step5.sous_titre')}</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{marginTop: 32}} />
        ) : (
          langues.map((l: any) => {
            const checked = selected.includes(l.id);
            return (
              <TouchableOpacity
                key={l.id}
                style={styles.row}
                onPress={() => toggle(l.id)}>
                <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                  {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.rowLabel}>{l.nom}</Text>
              </TouchableOpacity>
            );
          })
        )}

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
  sousTitre: {fontSize: 15, color: COLORS.textSecondary, marginBottom: 24},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: '#FFF',
  },
  checkboxActive: {borderColor: COLORS.primary, backgroundColor: COLORS.primary},
  checkmark: {color: '#FFF', fontSize: 14, fontWeight: 'bold'},
  rowLabel: {fontSize: 16, color: COLORS.text},
  errorText: {color: COLORS.danger, fontSize: 14, marginTop: 16, marginBottom: 8},
  btnSuivant: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  btnSuivantText: {color: '#FFF', fontSize: 16, fontWeight: 'bold'},
  btnRetour: {borderRadius: 14, height: 44, justifyContent: 'center', alignItems: 'center'},
  btnRetourText: {color: COLORS.textSecondary, fontSize: 15},
});

export default Step5_Langues;
