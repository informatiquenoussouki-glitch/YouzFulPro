import React, {useState, useEffect} from 'react';
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
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {logoutAction, updateProfilAction} from '../../redux/actions/pro.actions';
import {getProfil, getUnreadMessagesAdminCount} from '../../api/settings';
import {COLORS} from '../../helpers/config';

const ProfilScreen = () => {
  const {t} = useTranslation('profil');
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const {token, prestataire} = useSelector((state: RootState) => state.proReducer);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState(prestataire?.nom || '');
  const [prenom, setPrenom] = useState(prestataire?.prenom || '');
  const [tel, setTel] = useState('');
  const [profilData, setProfilData] = useState<any>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    fetchProfil();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUnreadMessages();
    }, [token]),
  );

  const fetchUnreadMessages = async () => {
    if (!token) return;
    try {
      const response = await getUnreadMessagesAdminCount(token);
      setUnreadMessages(response.data?.unread_count || 0);
    } catch (error) {
      console.log('Unread messages error:', error);
    }
  };

  const fetchProfil = async () => {
    if (!token) return;
    try {
      const response = await getProfil(token);
      const p = response.data?.prestataire;
      if (p) {
        setProfilData(p);
        setNom(p.nom || '');
        setPrenom(p.prenom || '');
        setTel(p.tel || '');
      }
    } catch (error) {
      console.log('Profil error:', error);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setLoading(true);
    const result = await dispatch(
      updateProfilAction(token, {nom, prenom, tel}) as any,
    );
    setLoading(false);
    if (result?.success !== false) {
      setEditing(false);
      Alert.alert(t('alerts.successTitle'), t('alerts.profileUpdated'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('logout.confirmTitle'), t('logout.confirmMessage'), [
      {text: t('logout.cancel'), style: 'cancel'},
      {
        text: t('logout.confirm'),
        style: 'destructive',
        onPress: () => dispatch(logoutAction() as any),
      },
    ]);
  };

  const initiales =
    (prestataire?.prenom?.[0] || '') + (prestataire?.nom?.[0] || '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initiales.toUpperCase()}</Text>
          </View>
          <Text style={styles.fullName}>
            {prestataire?.prenom} {prestataire?.nom}
          </Text>
          <Text style={styles.typeService}>{prestataire?.type_service}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>
              {prestataire?.note_moyenne
                ? Number(prestataire.note_moyenne).toFixed(1)
                : '—'}
            </Text>
          </View>
        </View>

        {/* INFOS PERSONNELLES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('personalInfo.title')}</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editButton}>{editing ? t('personalInfo.cancel') : t('personalInfo.modify')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('personalInfo.firstName')}</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={prenom}
                onChangeText={setPrenom}
              />
            ) : (
              <Text style={styles.fieldValue}>{prenom}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('personalInfo.lastName')}</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={nom}
                onChangeText={setNom}
              />
            ) : (
              <Text style={styles.fieldValue}>{nom}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('personalInfo.email')}</Text>
            <Text style={styles.fieldValue}>{prestataire?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('personalInfo.phone')}</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={tel}
                onChangeText={setTel}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{tel || '—'}</Text>
            )}
          </View>

          {editing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t('personalInfo.save')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* VEHICULES (transfert) */}
        {(prestataire?.type_service || profilData?.type_service)?.toLowerCase() === 'transfert' && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MesVehicules')}>
            <View style={styles.linkRow}>
              <Text style={styles.cardTitle}>{t('links.vehicules.title')}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <Text style={styles.dispoResume}>{t('links.vehicules.subtitle')}</Text>
          </TouchableOpacity>
        )}

        {/* DISPONIBILITES */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Disponibilites')}>
          <View style={styles.linkRow}>
            <Text style={styles.cardTitle}>{t('links.disponibilites.title')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.dispoResume}>{t('links.disponibilites.subtitle')}</Text>
        </TouchableOpacity>



{(prestataire?.type_service || profilData?.type_service)?.toLowerCase() === 'restaurant' && (
  <TouchableOpacity
    style={styles.card}
    onPress={() => navigation.navigate('MesPlats')}>
    <View style={styles.linkRow}>
      <Text style={styles.cardTitle}>{t('links.plats.title')}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
    <Text style={styles.dispoResume}>{t('links.plats.subtitle')}</Text>
  </TouchableOpacity>
)}

{(prestataire?.type_service || profilData?.type_service)?.toLowerCase() === 'guide' && (
  <TouchableOpacity
    style={styles.card}
    onPress={() => navigation.navigate('MesActivites')}>
    <View style={styles.linkRow}>
      <Text style={styles.cardTitle}>{t('links.activites.title')}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
    <Text style={styles.dispoResume}>{t('links.activites.subtitle')}</Text>
  </TouchableOpacity>
)}




        {/* CONTACTER L'ADMINISTRATION */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ContactAdmin')}>
          <View style={styles.linkRow}>
            <View style={styles.linkTitleRow}>
              <View style={styles.messageIconContainer}>
                <Text style={styles.messageIcon}>✉️</Text>
                {unreadMessages > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{t('links.contactAdmin.title')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.dispoResume}>{t('links.contactAdmin.subtitle')}</Text>
        </TouchableOpacity>

        {/* NOTATION */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Notation')}>
          <View style={styles.linkRow}>
            <Text style={styles.cardTitle}>{t('links.notation.title')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingBig}>
              {prestataire?.note_moyenne
                ? Number(prestataire.note_moyenne).toFixed(1)
                : '—'}
              /5
            </Text>
          </View>
        </TouchableOpacity>

        {/* DÉCONNEXION */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('logout.button')}</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  typeService: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  star: {
    fontSize: 18,
    color: '#FFB300',
    marginRight: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  ratingBig: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  field: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIconContainer: {
    position: 'relative',
    marginRight: 10,
  },
  messageIcon: {
    fontSize: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  dispoResume: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfilScreen;
