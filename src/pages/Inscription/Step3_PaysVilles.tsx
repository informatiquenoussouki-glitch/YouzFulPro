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
import {
  updateInscriptionForm,
  getPaysAction,
  getVillesAction,
} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const Step3_PaysVilles = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  
  const form   = useSelector((s: RootState) => s.proReducer.inscriptionForm);
  const pays   = useSelector((s: RootState) => s.proReducer.pays);
  const villes = useSelector((s: RootState) => s.proReducer.villes);

  const [paysId, setPaysId]         = useState<number|null>(form.pays_id);
  const [selectedVilles, setSelectedVilles] = useState<number[]>(form.villes || []);
  const [loadingVilles, setLoadingVilles]   = useState(false);
  const [error, setError]           = useState('');
  const [paysOpen, setPaysOpen]     = useState(false);

useEffect(() => {
  dispatch(getPaysAction() as any);
}, []);


useEffect(() => {
  console.log('PAYS REDUX = ', JSON.stringify(pays));
}, [pays]);

  useEffect(() => {
    if (paysId) {
      setLoadingVilles(true);
      setSelectedVilles([]);
      dispatch(getVillesAction(paysId) as any).finally(() => setLoadingVilles(false));
    }
  }, [paysId]);

  const toggleVille = (id: number) => {
    setSelectedVilles(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id],
    );
    setError('');
  };

  const selectedPays = pays.find((p: any) => p.id === paysId);

  const handleSuivant = () => {
    if (!paysId) { setError(t('inscription.step3.erreur_pays')); return; }
    if (selectedVilles.length === 0) {
      setError(t('inscription.step3.erreur_villes'));
      return;
    }
    dispatch(updateInscriptionForm({pays_id: paysId, villes: selectedVilles}) as any);
    navigation.navigate('Step4_Preferences');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={3} total={7} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.titre}>{t('inscription.step3.titre')}</Text>

        {/* Sélecteur pays */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('inscription.step3.pays')} *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setPaysOpen(!paysOpen)}>
            <Text style={selectedPays ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {selectedPays?.nom || t('inscription.step3.selectionner_pays')}
            </Text>
            <Text style={styles.dropdownArrow}>{paysOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {paysOpen ? (
            <View style={styles.dropdownList}>
              {pays.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.dropdownItem, paysId === p.id && styles.dropdownItemActive]}
                  onPress={() => {
                    setPaysId(p.id);
                    setPaysOpen(false);
                  }}>
                  <Text style={[
                    styles.dropdownItemText,
                    paysId === p.id && styles.dropdownItemTextActive,
                  ]}>
                    {p.nom} ({p.devise})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Villes */}
        {paysId ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step3.villes')} *</Text>
            {loadingVilles ? (
              <ActivityIndicator color={COLORS.primary} style={{marginTop: 8}} />
            ) : villes.length === 0 ? (
              <Text style={styles.emptyText}>{t('inscription.step3.aucune_ville')}</Text>
            ) : (
              villes.map((v: any) => {
                const checked = selectedVilles.includes(v.id);
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.checkRow}
                    onPress={() => toggleVille(v.id)}>
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkLabel}>{v.nom}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

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
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 24},
  field: {marginBottom: 24},
  label: {fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8},
  dropdown: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {fontSize: 16, color: COLORS.text},
  dropdownPlaceholder: {fontSize: 16, color: COLORS.textSecondary},
  dropdownArrow: {fontSize: 14, color: COLORS.textSecondary},
  dropdownList: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {backgroundColor: '#E8F5F0'},
  dropdownItemText: {fontSize: 15, color: COLORS.text},
  dropdownItemTextActive: {color: COLORS.primary, fontWeight: '600'},
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  checkboxActive: {borderColor: COLORS.primary, backgroundColor: COLORS.primary},
  checkmark: {color: '#FFF', fontSize: 13, fontWeight: 'bold'},
  checkLabel: {fontSize: 15, color: COLORS.text},
  emptyText: {color: COLORS.textSecondary, fontStyle: 'italic'},
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

export default Step3_PaysVilles;
