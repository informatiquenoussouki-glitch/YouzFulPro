import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {updateInscriptionForm} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const Step6_Paiement = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form = useSelector((s: RootState) => s.proReducer.inscriptionForm);

  const [modePaiement, setModePaiement] = useState<'cash'|'virement'>(
    (form.mode_paiement as 'cash'|'virement') || 'cash',
  );
  const [iban, setIban]           = useState(form.iban || '');
  const [cgu, setCgu]             = useState(form.cgu_accepte || false);
  const [error, setError]         = useState('');

  const handleSuivant = () => {
    if (!cgu) {
      setError(t('inscription.step6.erreur_cgu'));
      return;
    }
    dispatch(updateInscriptionForm({
      mode_paiement: modePaiement,
      iban: modePaiement === 'virement' ? iban : '',
      cgu_accepte: cgu,
    }) as any);
    navigation.navigate('Step7_Confirmation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={6} total={7} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}>

        <Text style={styles.titre}>{t('inscription.step6.titre')}</Text>

        {/* Mode de paiement */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('inscription.step6.mode')}</Text>
          <View style={styles.paiementRow}>
            <TouchableOpacity
              style={[styles.paiementBtn, modePaiement === 'cash' && styles.paiementBtnActive]}
              onPress={() => setModePaiement('cash')}>
              <Text style={styles.paiementIcon}>{'💵'}</Text>
              <Text style={[styles.paiementText, modePaiement === 'cash' && styles.paiementTextActive]}>
                {t('inscription.step6.cash')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paiementBtn, modePaiement === 'virement' && styles.paiementBtnActive]}
              onPress={() => setModePaiement('virement')}>
              <Text style={styles.paiementIcon}>{'🏦'}</Text>
              <Text style={[styles.paiementText, modePaiement === 'virement' && styles.paiementTextActive]}>
                {t('inscription.step6.virement')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* IBAN (si virement) */}
        {modePaiement === 'virement' ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t('inscription.step6.iban')}</Text>
            <TextInput
              style={styles.input}
              value={iban}
              onChangeText={setIban}
              placeholder={t('inscription.step6.iban_placeholder') as string}
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
            />
          </View>
        ) : null}

        {/* CGU */}
        <View style={styles.cguRow}>
          <TouchableOpacity
            style={[styles.checkbox, cgu && styles.checkboxActive]}
            onPress={() => {setCgu(!cgu); setError('');}}>
            {cgu ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
          </TouchableOpacity>
          <View style={styles.cguTextRow}>
            <Text style={styles.cguText}>{t('inscription.step6.cgu')} </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://youz-ful.com/cgu')}>
              <Text style={styles.cguLink}>{t('inscription.step6.voir_cgu')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.btnSuivant} onPress={handleSuivant}>
          <Text style={styles.btnSuivantText}>{t('inscription.suivant')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetourText}>{t('inscription.precedent')}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1},
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 24},
  section: {marginBottom: 24},
  label: {fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12},
  paiementRow: {flexDirection: 'row'},
  paiementBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  paiementBtnActive: {borderColor: COLORS.primary, backgroundColor: '#E8F5F0'},
  paiementIcon: {fontSize: 32, marginBottom: 8},
  paiementText: {fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center'},
  paiementTextActive: {color: COLORS.primary},
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  cguRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24},
  cguTextRow: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 12},
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginTop: 2,
  },
  checkboxActive: {borderColor: COLORS.primary, backgroundColor: COLORS.primary},
  checkmark: {color: '#FFF', fontSize: 14, fontWeight: 'bold'},
  cguText: {fontSize: 14, color: COLORS.text},
  cguLink: {fontSize: 14, color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline'},
  errorText: {color: COLORS.danger, fontSize: 14, marginBottom: 16},
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
  btnRetour: {borderRadius: 14, height: 44, justifyContent: 'center', alignItems: 'center'},
  btnRetourText: {color: COLORS.textSecondary, fontSize: 15},
});

export default Step6_Paiement;
