import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {getMesActivites, annulerActivite, toggleActivite} from '../../api/settings';
import {COLORS, BASE_URL} from '../../helpers/config';

const MesActivitesScreen = () => {
  const {t} = useTranslation('mesActivites');
  const navigation = useNavigation<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const [activites, setActivites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivites = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await getMesActivites(token);
      const data = response?.data?.activites || [];
      setActivites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('MES ACTIVITES ERROR =>', error);
      Alert.alert(t('errors.title'), t('errors.loadActivites'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivites();
    }, [token]),
  );

  const handleToggle = async (item: any) => {
    if (!token) return;
    const nextActif = Number(item.actif) === 1 ? 0 : 1;
    setActivites(prev =>
      prev.map(a => (a.id === item.id ? {...a, actif: nextActif} : a)),
    );
    try {
      await toggleActivite(token, item.id, nextActif);
    } catch (error) {
      console.log('TOGGLE ACTIVITE ERROR =>', error);
      setActivites(prev =>
        prev.map(a => (a.id === item.id ? {...a, actif: item.actif} : a)),
      );
      Alert.alert(t('errors.title'), t('errors.toggleActivite'));
    }
  };

  const handleAnnuler = (item: any) => {
    Alert.alert(
      t('confirmRemove.title'),
      t('confirmRemove.message', {name: item?.name}),
      [
        {text: t('confirmRemove.cancel'), style: 'cancel'},
        {
          text: t('confirmRemove.confirm'),
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await annulerActivite(token, item.id);
              setActivites(prev => prev.filter(a => a.id !== item.id));
            } catch (error) {
              console.log('ANNULER ACTIVITE ERROR =>', error);
              Alert.alert(t('errors.title'), t('errors.removeActivite'));
            }
          },
        },
      ],
    );
  };

  const renderItem = ({item}: {item: any}) => {
    const imageUri =
      item.image
        ? item.image.startsWith('http')
          ? item.image
          : `${BASE_URL}/${item.image}`
        : null;
    const actif = Number(item.actif) === 1;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.imageWrapper}>
            {imageUri ? (
              <Image source={{uri: imageUri}} style={styles.image} />
            ) : (
              <View style={styles.noImage}>
                <Text style={styles.noImageText}>{t('photo')}</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.nom} numberOfLines={2}>
              {item.name}
            </Text>
            {!!item.price && (
              <Text style={styles.meta}>
                {t('price')}<Text style={styles.metaValue}>{item.price} SAR</Text>
              </Text>
            )}
            {!!item.address && (
              <Text style={styles.meta} numberOfLines={1}>
                {item.address}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.statutRow}>
            <Text style={[styles.statutText, {color: actif ? COLORS.success : COLORS.textSecondary}]}>
              {actif ? t('status.active') : t('status.inactive')}
            </Text>
            <Switch
              value={actif}
              onValueChange={() => handleToggle(item)}
              trackColor={{false: COLORS.border, true: COLORS.primary}}
              thumbColor={'#FFFFFF'}
            />
          </View>

          <TouchableOpacity
            style={styles.annulerBtn}
            onPress={() => handleAnnuler(item)}>
            <Text style={styles.annulerText}>{t('cancelButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ActivitesCatalogue')}>
          <Text style={styles.addButtonText}>{t('addButton')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('empty.title')}</Text>
          <Text style={styles.emptyText}>
            {t('empty.text')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activites}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  },
  topBar: {
    padding: 16,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  imageWrapper: {
    marginRight: 12,
  },
  image: {
    width: 78,
    height: 78,
    borderRadius: 12,
  },
  noImage: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metaValue: {
    color: COLORS.text,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F8F8',
  },
  statutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statutText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  annulerBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annulerText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default MesActivitesScreen;
