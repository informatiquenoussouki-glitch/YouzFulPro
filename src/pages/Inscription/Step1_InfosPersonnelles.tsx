import React, {useState} from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import {launchImageLibrary} from 'react-native-image-picker';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {updateInscriptionForm} from '../../redux/actions/pro.actions';
import {sendVerificationEmail, verifyEmail} from '../../api/settings';
import {COLORS} from '../../helpers/config';
import ProgressBar from './components/ProgressBar';

type Props = {navigation: any};

const Step1_InfosPersonnelles = ({navigation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const form = useSelector((s: RootState) => s.proReducer.inscriptionForm);

  const [prenom, setPrenom]                   = useState(form?.prenom || '');
  const [nom, setNom]                         = useState(form?.nom || '');
  const [email, setEmail]                     = useState(form?.email || '');
  const [telephone, setTelephone]             = useState(form?.telephone || '');
  const [password, setPassword]               = useState(form?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(form?.password || '');
  const [dateNaissance, setDateNaissance]     = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [sexe, setSexe]                       = useState<'H'|'F'|''>(form?.sexe as 'H'|'F'|'' || '');
  const [photoUri, setPhotoUri]               = useState<string>(form?.photo_url || '');
  const [numeroIdentite, setNumeroIdentite]   = useState(form?.numero_identite || '');
  const [showPassword, setShowPassword]       = useState(false);
  const [codeInput, setCodeInput]             = useState('');
  const [emailVerifie, setEmailVerifie]       = useState(form?.email_verifie || false);
  const [sendingEmail, setSendingEmail]       = useState(false);
  const [verifyingCode, setVerifyingCode]     = useState(false);
  const [codeSent, setCodeSent]               = useState(false);
  const [errors, setErrors]                   = useState<Record<string,string>>({});

  const validateEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  const formatDateDisplay = (date: Date): string => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const formatDateISO = (date: Date): string => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
  };

  const handleSendCode = async () => {
    if (!validateEmail(email)) {
      setErrors(e => ({...e, email: t('inscription.step1.erreur_email_format')}));
      return;
    }
    setSendingEmail(true);
    try {
      await sendVerificationEmail(email.trim().toLowerCase());
      setCodeSent(true);
      setErrors(e => ({...e, email: ''}));
      Alert.alert('', t('inscription.step1.code_envoye', {email}));
    } catch {
      Alert.alert(t('inscription.step1.erreur_titre'), t('inscription.step1.erreur_envoi_code'));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    if (codeInput.length !== 4) return;
    setVerifyingCode(true);
    try {
      const response = await verifyEmail(email.trim().toLowerCase(), codeInput);
      const data = response?.data || response;
      if (data?.verified) {
        setEmailVerifie(true);
        setErrors(e => ({...e, code: ''}));
      } else {
        setErrors(e => ({...e, code: t('inscription.step1.code_invalide')}));
      }
    } catch {
      setErrors(e => ({...e, code: t('inscription.step1.code_invalide_expire')}));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleChoosePhoto = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800},
      (response) => {
        if (response.assets && response.assets[0]?.uri) {
          setPhotoUri(response.assets[0].uri);
        }
      },
    );
  };

  const handleSuivant = () => {
    const newErrors: Record<string, string> = {};
    if (!prenom.trim()) newErrors.prenom = t('inscription.step1.requis');
    if (!nom.trim()) newErrors.nom = t('inscription.step1.requis');
    if (!email.trim() || !validateEmail(email)) newErrors.email = t('inscription.step1.email_invalide');
    if (!emailVerifie) newErrors.email_verifie = t('inscription.step1.erreur_verification_requise');
    if (!telephone.trim()) newErrors.telephone = t('inscription.step1.requis');
    if (!password) newErrors.password = t('inscription.step1.requis');
    if (password !== confirmPassword) newErrors.password_confirm = t('inscription.step1.erreur_password');
    if (!dateNaissance) newErrors.date_naissance = t('inscription.step1.requis');
    else if (calculateAge(dateNaissance) < 16) newErrors.date_naissance = t('inscription.step1.erreur_age');
    if (!sexe) newErrors.sexe = t('inscription.step1.requis');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    dispatch(updateInscriptionForm({
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      telephone: telephone.trim(),
      password,
      sexe,
      date_naissance: formatDateISO(dateNaissance!),
      photo_url: photoUri,
      numero_identite: numeroIdentite,
      email_verifie: emailVerifie,
    }) as any);

    navigation.navigate('Step2_TypeService');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={1} total={7} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}>

          <Text style={styles.titre}>{t('inscription.step1.titre')}</Text>

          {/* Prénom */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.prenom')} *</Text>
            <TextInput
              style={[styles.input, errors.prenom ? styles.inputError : null]}
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Mohamed"
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.prenom ? <Text style={styles.errorText}>{errors.prenom}</Text> : null}
          </View>

          {/* Nom */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.nom')} *</Text>
            <TextInput
              style={[styles.input, errors.nom ? styles.inputError : null]}
              value={nom}
              onChangeText={setNom}
              placeholder="Alami"
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.nom ? <Text style={styles.errorText}>{errors.nom}</Text> : null}
          </View>

          {/* Email + vérification */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.email')} *</Text>
            <View style={styles.rowInput}>
              <TextInput
                style={[styles.inputFlex, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(v) => {setEmail(v); setEmailVerifie(false); setCodeSent(false);}}
                placeholder="pro@exemple.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!emailVerifie}
              />
              {!emailVerifie && (
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={handleSendCode}
                  disabled={sendingEmail}>
                  {sendingEmail
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.verifyBtnText}>{t('inscription.step1.verifier')}</Text>}
                </TouchableOpacity>
              )}
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            {emailVerifie ? <Text style={styles.successText}>{t('inscription.step1.email_verifie')}</Text> : null}
          </View>

          {/* Code de vérification */}
          {codeSent && !emailVerifie ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t('inscription.step1.code_verification')}</Text>
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.inputFlex, errors.code ? styles.inputError : null]}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder={t('inscription.step1.code_placeholder') as string}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={handleVerifyCode}
                  disabled={verifyingCode || codeInput.length !== 4}>
                  {verifyingCode
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.verifyBtnText}>{t('inscription.step1.valider_code')}</Text>}
                </TouchableOpacity>
              </View>
              {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
            </View>
          ) : null}
          {errors.email_verifie ? <Text style={[styles.errorText, {marginBottom: 12}]}>{errors.email_verifie}</Text> : null}

          {/* Téléphone */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.telephone')} *</Text>
            <TextInput
              style={[styles.input, errors.telephone ? styles.inputError : null]}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="+212 6XX XXX XXX"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />
            {errors.telephone ? <Text style={styles.errorText}>{errors.telephone}</Text> : null}
          </View>

          {/* Mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.password')} *</Text>
            <View style={[styles.passwordRow, errors.password ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Confirmer MDP */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.password_confirm')} *</Text>
            <TextInput
              style={[styles.input, errors.password_confirm ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
            />
            {errors.password_confirm ? <Text style={styles.errorText}>{errors.password_confirm}</Text> : null}
          </View>

          {/* Date de naissance — vrai DatePicker */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.date_naissance')} *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateBtn, errors.date_naissance ? styles.inputError : null]}
              onPress={() => setShowDatePicker(true)}>
              <Text style={dateNaissance ? styles.dateText : styles.datePlaceholder}>
                {dateNaissance ? formatDateDisplay(dateNaissance) : t('inscription.step1.date_naissance_placeholder')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateNaissance || new Date(2000, 0, 1)}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDateNaissance(selectedDate);
                }}
              />
            )}
            {errors.date_naissance ? <Text style={styles.errorText}>{errors.date_naissance}</Text> : null}
          </View>

          {/* Sexe */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.sexe')} *</Text>
            <View style={styles.sexeRow}>
              <TouchableOpacity
                style={[styles.sexeBtn, sexe === 'H' && styles.sexeBtnActive]}
                onPress={() => setSexe('H')}>
                <Text style={[styles.sexeBtnText, sexe === 'H' && styles.sexeBtnTextActive]}>
                  {t('inscription.step1.sexe_h')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexeBtn, sexe === 'F' && styles.sexeBtnActive]}
                onPress={() => setSexe('F')}>
                <Text style={[styles.sexeBtnText, sexe === 'F' && styles.sexeBtnTextActive]}>
                  {t('inscription.step1.sexe_f')}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.sexe ? <Text style={styles.errorText}>{errors.sexe}</Text> : null}
          </View>

          {/* Photo de profil */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.photo')}</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={handleChoosePhoto}>
              {photoUri ? (
                <Image source={{uri: photoUri}} style={styles.photoPreview} />
              ) : (
                <Text style={styles.photoBtnText}>{t('inscription.step1.choisir_photo')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Numéro pièce d'identité */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('inscription.step1.numero_identite')}</Text>
            <TextInput
              style={styles.input}
              value={numeroIdentite}
              onChangeText={setNumeroIdentite}
              placeholder="A123456"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.btnSuivant} onPress={handleSuivant}>
            <Text style={styles.btnSuivantText}>{t('inscription.suivant')}</Text>
          </TouchableOpacity>

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1},
  titre: {fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 24},
  field: {marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8},
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: {borderColor: COLORS.danger},
  inputFlex: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  rowInput: {flexDirection: 'row', alignItems: 'center'},
  passwordRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
  },
  passwordInput: {flex: 1, paddingHorizontal: 16, fontSize: 16, color: COLORS.textPrimary},
  eyeBtn: {paddingHorizontal: 16},
  eyeIcon: {fontSize: 20},
  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  verifyBtnText: {color: '#FFF', fontSize: 12, fontWeight: '700'},
  errorText: {color: COLORS.danger, fontSize: 12, marginTop: 4},
  successText: {color: COLORS.primary, fontSize: 12, marginTop: 4, fontWeight: '600'},
  dateBtn: {justifyContent: 'center'},
  dateText: {fontSize: 16, color: COLORS.textPrimary},
  datePlaceholder: {fontSize: 16, color: COLORS.textSecondary},
  sexeRow: {flexDirection: 'row'},
  sexeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginRight: 12,
  },
  sexeBtnActive: {borderColor: COLORS.primary, backgroundColor: '#E8F5F0'},
  sexeBtnText: {fontSize: 15, fontWeight: '600', color: COLORS.textSecondary},
  sexeBtnTextActive: {color: COLORS.primary},
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
  btnSuivant: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnSuivantText: {color: '#FFF', fontSize: 16, fontWeight: 'bold'},
});

export default Step1_InfosPersonnelles;
