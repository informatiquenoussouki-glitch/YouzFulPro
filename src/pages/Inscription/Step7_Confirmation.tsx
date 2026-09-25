import React, {useState} from 'react';
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
import {registerAction, resetInscriptionForm} from '../../redux/actions/pro.actions';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const SERVICE_ICONS: Record<string, string> = {
  guide: '🗺️',
  babysitter: '👶',
  transfert: '🚗',
  restaurant: '🍽️',
  activite: '🎯',
};

const SERVICE_LABEL_KEYS: Record<string, string> = {
  guide: 'inscription.step2.guide',
  babysitter: 'inscription.step2.babysitter',
  transfert: 'inscription.step2.transfert',
  restaurant: 'inscription.step2.restaurant',
  activite: 'inscription.step2.activite',
};

const Step7_Confirmation = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form    = useSelector((s: RootState) => s.proReducer.inscriptionForm);
  const pays    = useSelector((s: RootState) => s.proReducer.pays);
  const langues = useSelector((s: RootState) => s.proReducer.langues);
  const loading = useSelector((s: RootState) => s.proReducer.registerLoading);
  const reduxError = useSelector((s: RootState) => s.proReducer.registerError);

  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const paysNom = pays.find((p: any) => p.id === form.pays_id)?.nom || '';
  const languesNoms = (form.langues || [])
    .map((id: number) => langues.find((l: any) => l.id === id)?.nom)
    .filter(Boolean)
    .join(', ');

  const handleEnvoyer = async () => {
    setError('');

    // Séparer le fichier logo (restaurant) du reste des préférences : le logo
    // est une image locale au téléphone, elle doit partir en tant que fichier
    // uploadé, pas en tant que chemin texte dans le JSON.
    const preferences: any = {...(form.preferences || {})};
    let logoAsset: any = null;
    if (form.type_service === 'restaurant' && preferences.restaurant?.logo?.uri) {
      logoAsset = preferences.restaurant.logo;
      preferences.restaurant = {...preferences.restaurant};
      delete preferences.restaurant.logo;
    }

    const formData = new FormData();
    formData.append('nom', form.nom);
    formData.append('prenom', form.prenom);
    formData.append('email', form.email);
    formData.append('password', form.password);
    formData.append('telephone', form.telephone);
    formData.append('sexe', form.sexe);
    formData.append('date_naissance', form.date_naissance);
    formData.append('pays_id', String(form.pays_id));
    formData.append('villes', JSON.stringify(form.villes || []));
    formData.append('langues', JSON.stringify(form.langues || []));
    formData.append('type_service', form.type_service);
    formData.append('photo_url', form.photo_url || '');
    formData.append('numero_identite', form.numero_identite || '');
    formData.append('mode_paiement', form.mode_paiement);
    formData.append('iban', form.iban || '');
    formData.append('rayon_km', String(form.rayon_km || 0));
    formData.append('preferences', JSON.stringify(preferences));
    formData.append('cgu_accepte', form.cgu_accepte ? '1' : '0');

    if (logoAsset?.uri) {
      formData.append('logo_resto', {
        uri: logoAsset.uri,
        name: logoAsset.fileName || `logo_${Date.now()}.jpg`,
        type: logoAsset.type || 'image/jpeg',
      } as any);
    }

    const result = await dispatch(registerAction(formData) as any);
    if (result?.success) {
      setSuccess(true);
    } else {
      setError(result?.message || t('inscription.step7.erreur_envoi'));
    }
  };

  const handleRetourLogin = () => {
    dispatch(resetInscriptionForm() as any);
    navigation.navigate('Login');
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitre}>{t('inscription.step7.confirmation_titre')}</Text>
          <Text style={styles.successMessage}>
            {t('inscription.step7.confirmation_message')}
          </Text>
          <TouchableOpacity style={styles.btnRetourLogin} onPress={handleRetourLogin}>
            <Text style={styles.btnRetourLoginText}>{t('inscription.retour_connexion')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={7} total={7} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.titre}>{t('inscription.step7.titre')}</Text>

        {/* Récapitulatif */}
        <View style={styles.card}>
          <Row label={t('inscription.step7.nom_complet')}  value={`${form.prenom} ${form.nom}`} />
          <Row label={t('inscription.step7.email')}        value={form.email} />
          <Row label={t('inscription.step7.telephone')}    value={form.telephone} />
          <Row
            label={t('inscription.step7.service')}
            value={`${SERVICE_ICONS[form.type_service] || ''} ${
              SERVICE_LABEL_KEYS[form.type_service] ? t(SERVICE_LABEL_KEYS[form.type_service]) : form.type_service
            }`.trim()}
          />
          {paysNom ? <Row label={t('inscription.step7.pays')} value={paysNom} /> : null}
          {languesNoms ? <Row label={t('inscription.step7.langues')} value={languesNoms} /> : null}
          <Row
            label={t('inscription.step7.paiement')}
            value={form.mode_paiement === 'virement' ? t('inscription.step7.paiement_virement_value') : t('inscription.step7.paiement_especes_value')}
          />
        </View>

        {(error || reduxError) ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error || reduxError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btnEnvoyer, loading && styles.btnDisabled]}
          onPress={handleEnvoyer}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.btnEnvoyerText}>{t('inscription.envoyer')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetourText}>{t('inscription.precedent')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({label, value}: {label: string; value: string}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 24},
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {fontSize: 14, color: COLORS.textSecondary, flex: 1},
  rowValue: {fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 2, textAlign: 'right'},
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {color: COLORS.danger, fontSize: 14, textAlign: 'center'},
  btnEnvoyer: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: {opacity: 0.7},
  btnEnvoyerText: {color: '#FFF', fontSize: 16, fontWeight: 'bold'},
  btnRetour: {borderRadius: 14, height: 44, justifyContent: 'center', alignItems: 'center'},
  btnRetourText: {color: COLORS.textSecondary, fontSize: 15},
  // Écran succès
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  successIconText: {fontSize: 44, color: '#FFF', fontWeight: 'bold'},
  successTitre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  btnRetourLogin: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  btnRetourLoginText: {color: '#FFF', fontSize: 16, fontWeight: 'bold'},
});

export default Step7_Confirmation;
