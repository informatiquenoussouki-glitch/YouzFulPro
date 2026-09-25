import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {sendMessageAdmin, getMesMessagesAdmin} from '../../api/settings';
import {COLORS} from '../../helpers/config';

type MessageAdmin = {
  id: number;
  sujet: string;
  message: string;
  statut: 'nouveau' | 'lu' | 'traite';
  initiateur: 'utilisateur' | 'admin';
  reponse_admin: string | null;
  reponse_at: string | null;
  created_at: string;
};

const statusLabelKey: Record<MessageAdmin['statut'], string> = {
  nouveau: 'history.statusNouveau',
  lu: 'history.statusLu',
  traite: 'history.statusTraite',
};

const ContactAdminScreen = () => {
  const {t} = useTranslation('contactAdmin');
  const navigation = useNavigation();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [messages, setMessages] = useState<MessageAdmin[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const response = await getMesMessagesAdmin(token);
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.log('ContactAdmin history error:', error);
    }
    setLoadingHistory(false);
  };

  const handleSend = async () => {
    if (!token) return;
    if (!sujet.trim() || !message.trim()) {
      Alert.alert(t('alerts.errorTitle'), t('alerts.missingFields'));
      return;
    }
    setSending(true);
    try {
      await sendMessageAdmin(token, sujet.trim(), message.trim());
      setSujet('');
      setMessage('');
      Alert.alert(t('alerts.successTitle'), t('alerts.successMessage'));
      fetchHistory();
    } catch (error) {
      console.log('ContactAdmin send error:', error);
      Alert.alert(t('alerts.errorTitle'), t('alerts.errorMessage'));
    }
    setSending(false);
  };

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
        {/* FORMULAIRE */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('form.subjectLabel')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={sujet}
              onChangeText={setSujet}
              placeholder={t('form.subjectPlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('form.messageLabel')}</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea]}
              value={message}
              onChangeText={setMessage}
              placeholder={t('form.messagePlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>{t('form.send')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* HISTORIQUE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('history.title')}</Text>

          {loadingHistory ? (
            <ActivityIndicator color={COLORS.primary} style={{marginTop: 12}} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✉️</Text>
              <Text style={styles.emptyText}>{t('history.empty')}</Text>
            </View>
          ) : (
            messages.map(item =>
              item.initiateur === 'admin' ? (
                <View key={item.id} style={[styles.messageCard, styles.adminMessageCard]}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageSujet}>{item.sujet}</Text>
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>{t('history.fromAdmin')}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageDate}>{item.created_at}</Text>
                  <Text style={styles.messageBody}>{item.message}</Text>
                </View>
              ) : (
                <View key={item.id} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageSujet}>{item.sujet}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.statut === 'traite' && styles.statusBadgeTraite,
                        item.statut === 'lu' && styles.statusBadgeLu,
                      ]}>
                      <Text style={styles.statusBadgeText}>{t(statusLabelKey[item.statut])}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageDate}>{item.created_at}</Text>
                  <Text style={styles.messageBody}>{item.message}</Text>

                  {item.reponse_admin ? (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyLabel}>{t('history.reply')}</Text>
                      <Text style={styles.replyText}>{item.reponse_admin}</Text>
                    </View>
                  ) : null}
                </View>
              ),
            )
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
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldTextArea: {
    minHeight: 110,
  },
  sendButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
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
  messageCard: {
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
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  messageSujet: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  messageDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  messageBody: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  adminMessageCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  adminBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  statusBadgeLu: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statusBadgeTraite: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  replyBox: {
    marginTop: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 10,
    padding: 10,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default ContactAdminScreen;
