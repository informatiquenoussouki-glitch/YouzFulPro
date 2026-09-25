import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {
  updateInscriptionForm,
  getTypevisitesAction,
  // Nouveau : action qui charge les véhicules depuis typevisie_transfert
  getTypevisitesTransfertAction,
  getSpecialitesRestoAction,
  addSpecialiteRestoAction,
  getActivitesInscriptionAction,
} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const DISPOS = ['matin', 'jour', 'soir'] as const;
// Supprimé : les types de transfert codés en dur
// Remplacé par des données dynamiques venant de typevisie_transfert

const DISPO_LABEL_KEYS: Record<string, string> = {
  matin: 'inscription.step4.matin',
  jour: 'inscription.step4.jour',
  soir: 'inscription.step4.soir',
};
// Supprimé : TRANSFERT_LABELS codé en dur
// Les labels viennent maintenant de la base de données (champ 'nom' de typevisie_transfert)

const CheckboxRow = ({label, checked, onPress}: {label: string; checked: boolean; onPress: () => void}) => (
  <TouchableOpacity style={styles.checkRow} onPress={onPress}>
    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
    </View>
    <Text style={styles.checkLabel}>{label}</Text>
  </TouchableOpacity>
);

const ToggleRow = ({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) => (
  <TouchableOpacity
    style={[styles.toggleBtn, active && styles.toggleBtnActive]}
    onPress={onPress}>
    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Step4_Preferences = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form          = useSelector((s: RootState) => s.proReducer.inscriptionForm);
  const typevisites            = useSelector((s: RootState) => s.proReducer.typevisites);
  // Nouveau : on lit les véhicules stockés dans Redux (chargés depuis typevisie_transfert)
  // ?? [] évite que la valeur soit undefined si Redux Persist n'a pas encore le nouveau champ
  const typevisitesTransfert   = useSelector((s: RootState) => s.proReducer.typevisites_transfert ?? []);
  const specialites            = useSelector((s: RootState) => s.proReducer.specialites_resto);
  const activitesVille         = useSelector((s: RootState) => s.proReducer.activites_ville ?? []);
  const typeService   = form.type_service;

  const prefExisting  = form.preferences || {};

  // État guide
  const [guideTypevisites, setGuideTypevisites] = useState<number[]>(prefExisting?.guide?.typevisites || []);
  const [guideVoiture, setGuideVoiture]         = useState<boolean>(prefExisting?.guide?.avec_voiture || false);
  const [guideTemp, setGuideTemp]               = useState<string[]>(prefExisting?.guide?.temp ? prefExisting.guide.temp.split(',') : []);

  // État babysitter
  const [babyTemp, setBabyTemp] = useState<string[]>(prefExisting?.babysitter?.temp ? prefExisting.babysitter.temp.split(',') : []);

  // État transfert : IDs numériques des véhicules sélectionnés (ex: [1, 3])
  const [transfertTypes, setTransfertTypes] = useState<number[]>(prefExisting?.transfert?.typetransferts || []);
  const [transfertTemp, setTransfertTemp]   = useState<string[]>(prefExisting?.transfert?.temp ? prefExisting.transfert.temp.split(',') : []);
  const [rayonKm, setRayonKm]               = useState(String(form.rayon_km || 0));

  // État restaurant
  const [nomResto, setNomResto]               = useState(prefExisting?.restaurant?.nom_restaurant || '');
  const [restoSpecialites, setRestoSpecialites] = useState<number[]>(prefExisting?.restaurant?.specialites || []);
  const [newSpecialite, setNewSpecialite]     = useState('');
  const [addingSpec, setAddingSpec]           = useState(false);
  const [logoResto, setLogoResto]             = useState<any>(prefExisting?.restaurant?.logo ? {uri: prefExisting.restaurant.logo} : null);

  // État activité (excursions/activités déjà existantes dans les villes choisies)
  const [activiteSelected, setActiviteSelected] = useState<number[]>(prefExisting?.activite?.activites || []);
  const [loadingActivites, setLoadingActivites] = useState(false);

  const [error, setError] = useState('');
  // true pendant que l'API GetTypevisitesTransfert.php charge, false quand terminé
  const [loadingVehicules, setLoadingVehicules] = useState(false);

  useEffect(() => {
    if (typeService === 'guide') {
      // Guide : charge les types de visites (table typevisie)
      if (typevisites.length === 0) dispatch(getTypevisitesAction() as any);
    }
    if (typeService === 'transfert') {
      // Transfert : charge les véhicules depuis typevisie_transfert
      // On met loadingVehicules à true, puis à false une fois l'appel terminé (succès ou échec)
      setLoadingVehicules(true);
      dispatch(getTypevisitesTransfertAction() as any).finally(() => setLoadingVehicules(false));
    }
    if (typeService === 'restaurant') {
      if (specialites.length === 0) dispatch(getSpecialitesRestoAction() as any);
    }
    if (typeService === 'activite') {
      // Activité : charge tout le catalogue d'activités disponibles
      setLoadingActivites(true);
      dispatch(getActivitesInscriptionAction() as any).finally(() => setLoadingActivites(false));
    }
  }, [typeService]);

  const toggleDispo = (setter: (fn: (prev: string[]) => string[]) => void, key: string) => {
    setter(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  // Coche/décoche un véhicule par son ID (nombre entier)
  const toggleTransfert = (id: number) => {
    setTransfertTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleTV = (id: number) => {
    setGuideTypevisites(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleSpecialite = (id: number) => {
    setRestoSpecialites(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleActivite = (id: number) => {
    setActiviteSelected(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleChooseLogo = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800},
      (response) => {
        if (response.assets && response.assets[0]?.uri) {
          setLogoResto(response.assets[0]);
        }
      },
    );
  };

  const handleAddSpecialite = async () => {
    const nom = newSpecialite.trim();
    if (!nom) return;
    setAddingSpec(true);
    const result = await dispatch(addSpecialiteRestoAction(nom) as any);
    setAddingSpec(false);
    if (result?.success && result?.specialite) {
      setRestoSpecialites(prev => [...prev, result.specialite.id]);
      setNewSpecialite('');
    } else {
      Alert.alert(t('inscription.step1.erreur_titre'), t('inscription.step4.erreur_ajout_specialite'));
    }
  };

  const handleSuivant = () => {
    let preferences: any = {};

    switch (typeService) {
      case 'guide':
        preferences.guide = {
          typevisites: guideTypevisites,
          avec_voiture: guideVoiture,
          temp: guideTemp.join(','),
        };
        break;
      case 'babysitter':
        preferences.babysitter = {temp: babyTemp.join(',')};
        break;
      case 'transfert':
        if (transfertTypes.length === 0) { setError(t('inscription.step4.erreur_transfert')); return; }
        preferences.transfert = {
          typetransferts: transfertTypes,
          temp: transfertTemp.join(','),
        };
        break;
      case 'restaurant':
        if (!nomResto.trim()) { setError(t('inscription.step4.erreur_nom_resto')); return; }
        if (restoSpecialites.length === 0) { setError(t('inscription.step4.erreur_specialite')); return; }
        preferences.restaurant = {
          nom_restaurant: nomResto.trim(),
          specialites: restoSpecialites,
          logo: logoResto,
        };
        break;
      case 'activite':
        if (activiteSelected.length === 0) { setError(t('inscription.step4.erreur_activite')); return; }
        preferences.activite = {
          activites: activiteSelected,
        };
        break;
    }

    dispatch(updateInscriptionForm({
      preferences,
      rayon_km: parseInt(rayonKm, 10) || 0,
    }) as any);

    navigation.navigate('Step5_Langues');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={4} total={7} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}>

        <Text style={styles.titre}>{t('inscription.step4.titre')}</Text>

        {/* ── GUIDE ── */}
        {typeService === 'guide' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.typevisites')}</Text>
              {typevisites.length === 0
                ? <ActivityIndicator color={COLORS.primary} />
                : typevisites.map((tv: any) => (
                    <CheckboxRow
                      key={tv.id}
                      label={tv.nom}
                      checked={guideTypevisites.includes(tv.id)}
                      onPress={() => toggleTV(tv.id)}
                    />
                  ))
              }
            </View>

            <View style={styles.section}>
              <CheckboxRow
                label={t('inscription.step4.avec_voiture')}
                checked={guideVoiture}
                onPress={() => setGuideVoiture(!guideVoiture)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.disponibilite')}</Text>
              <View style={styles.toggleRow}>
                {DISPOS.map(d => (
                  <ToggleRow
                    key={d}
                    label={t(DISPO_LABEL_KEYS[d])}
                    active={guideTemp.includes(d)}
                    onPress={() => toggleDispo(setGuideTemp, d)}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* ── BABY-SITTER ── */}
        {typeService === 'babysitter' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('inscription.step4.disponibilite')}</Text>
            <View style={styles.toggleRow}>
              {DISPOS.map(d => (
                <ToggleRow
                  key={d}
                  label={t(DISPO_LABEL_KEYS[d])}
                  active={babyTemp.includes(d)}
                  onPress={() => toggleDispo(setBabyTemp, d)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── CHAUFFEUR / TRANSFERT ── */}
        {typeService === 'transfert' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.types_vehicules')}</Text>
              {/* Affiche spinner pendant le chargement, liste ou message sinon */}
              {loadingVehicules
                ? <ActivityIndicator color={COLORS.primary} />
                : typevisitesTransfert.length === 0
                  ? <Text style={{color: COLORS.textSecondary}}>{t('inscription.step4.aucun_vehicule')}</Text>
                  : typevisitesTransfert.map((v: any) => (
                      <CheckboxRow
                        key={v.id}
                        label={v.vehicule}
                        checked={transfertTypes.includes(v.id)}
                        onPress={() => toggleTransfert(v.id)}
                      />
                    ))
              }
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.rayon_km')}</Text>
              <TextInput
                style={styles.input}
                value={rayonKm}
                onChangeText={setRayonKm}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.disponibilite')}</Text>
              <View style={styles.toggleRow}>
                {DISPOS.map(d => (
                  <ToggleRow
                    key={d}
                    label={t(DISPO_LABEL_KEYS[d])}
                    active={transfertTemp.includes(d)}
                    onPress={() => toggleDispo(setTransfertTemp, d)}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* ── RESTAURANT ── */}
        {typeService === 'restaurant' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>{t('inscription.step4.nom_restaurant')} *</Text>
              <TextInput
                style={styles.input}
                value={nomResto}
                onChangeText={setNomResto}
                placeholder="Le Marrakech"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('inscription.step4.logo_restaurant')}</Text>
              <TouchableOpacity style={styles.photoBtn} onPress={handleChooseLogo}>
                {logoResto?.uri ? (
                  <Image source={{uri: logoResto.uri}} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>{t('inscription.step4.choisir_logo')}</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.specialites')}</Text>
              {specialites.length === 0
                ? <ActivityIndicator color={COLORS.primary} />
                : specialites.map((sp: any) => (
                    <CheckboxRow
                      key={sp.id}
                      label={sp.nom}
                      checked={restoSpecialites.includes(sp.id)}
                      onPress={() => toggleSpecialite(sp.id)}
                    />
                  ))
              }
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('inscription.step4.ajouter_specialite')}</Text>
              <View style={styles.rowInput}>
                <TextInput
                  style={styles.inputFlex}
                  value={newSpecialite}
                  onChangeText={setNewSpecialite}
                  placeholder={t('inscription.step4.nom_specialite') as string}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddSpecialite}
                  disabled={addingSpec || !newSpecialite.trim()}>
                  {addingSpec
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.addBtnText}>{t('inscription.step4.ajouter')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {/* ── ACTIVITÉS & EXCURSIONS ── */}
        {typeService === 'activite' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('inscription.step4.activites_proposees')}</Text>
            {loadingActivites ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : activitesVille.length === 0 ? (
              <Text style={{color: COLORS.textSecondary}}>
                {t('inscription.step4.aucune_activite')}
              </Text>
            ) : (
              activitesVille.map((a: any) => (
                <CheckboxRow
                  key={a.id}
                  label={a.name}
                  checked={activiteSelected.includes(a.id)}
                  onPress={() => toggleActivite(a.id)}
                />
              ))
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1},
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 24},
  section: {marginBottom: 24},
  sectionTitle: {fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12},
  label: {fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8},
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
  inputFlex: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginRight: 8,
  },
  rowInput: {flexDirection: 'row', alignItems: 'center'},
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
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
  toggleRow: {flexDirection: 'row'},
  toggleBtn: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    backgroundColor: COLORS.card,
  },
  toggleBtnActive: {borderColor: COLORS.primary, backgroundColor: '#E8F5F0'},
  toggleText: {fontSize: 14, fontWeight: '600', color: COLORS.textSecondary},
  toggleTextActive: {color: COLORS.primary},
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {color: '#FFF', fontSize: 14, fontWeight: '700'},
  photoBtn: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoBtnText: {color: COLORS.primary, fontSize: 15, fontWeight: '600'},
  photoPreview: {width: '100%', height: '100%'},
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

export default Step4_Preferences;
