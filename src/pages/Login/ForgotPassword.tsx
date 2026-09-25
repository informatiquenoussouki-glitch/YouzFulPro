import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../../helpers/config';
import {forgotPassword} from '../../api/settings';
const ForgotPasswordScreen = ({navigation}: {navigation?: any}) => {
  const {t} = useTranslation();
  const [email, setEmail] = useState('');

  const handleSend = async () => {
  if (!email.trim()) {
    Alert.alert(t('login.forgot.erreur_titre'), t('login.forgot.erreur_email_vide'));
    return;
  }

  try {
    const res = await forgotPassword(email.trim().toLowerCase());
    console.log('FORGOT PASSWORD SUCCESS =>', res?.data || res);

    Alert.alert(
      t('login.forgot.succes_titre'),
      t('login.forgot.succes_message'),
    );
    navigation?.goBack();
  } catch (error: any) {
    console.log('FORGOT PASSWORD ERROR =>', error);

    Alert.alert(
      t('login.forgot.erreur_titre'),
      error?.message ||
        error?.error ||
        error?.code?.toString() ||
        t('login.forgot.erreur_envoi'),
    );
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('login.forgot.titre')}</Text>
          <Text style={styles.subtitle}>
            {t('login.forgot.sous_titre')}
          </Text>

          <Text style={styles.label}>{t('login.forgot.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder="pro@youzful.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>{t('login.forgot.envoyer')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}>
            <Text style={styles.backButtonText}>{t('login.forgot.retour')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;