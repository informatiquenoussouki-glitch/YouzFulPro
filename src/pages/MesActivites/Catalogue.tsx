import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {getActivitesCatalogue, addActivite} from '../../api/settings';
import {COLORS, BASE_URL} from '../../helpers/config';

const ActivitesCatalogueScreen = () => {
  const {t} = useTranslation('mesActivites');
  const navigation = useNavigation<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const [activites, setActivites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchCatalogue = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await getActivitesCatalogue(token);
      const data = response?.data?.activites || [];
      setActivites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('CATALOGUE ACTIVITES ERROR =>', error);
      Alert.alert(t('errors.title'), t('errors.loadCatalogue'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCatalogue();
    }, [token]),
  );

  const handleAdd = async (item: any) => {
    if (!token) return;
    setAddingId(item.id);
    try {
      await addActivite(token, item.id);
      setActivites(prev =>
        prev.map(a => (a.id === item.id ? {...a, associee: true, actif: 1} : a)),
      );
    } catch (error) {
      console.log('ADD ACTIVITE ERROR =>', error);
      Alert.alert(t('errors.title'), t('errors.addActivite'));
    } finally {
      setAddingId(null);
    }
  };

  const renderItem = ({item}: {item: any}) => {
    const imageUri =
      item.image
        ? item.image.startsWith('http')
          ? item.image
          : `${BASE_URL}/${item.image}`
        : null;
    const dejaAjoutee = Number(item.associee) === 1 || item.associee === true;

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

        {dejaAjoutee ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('catalogue.alreadyAdded')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            disabled={addingId === item.id}
            onPress={() => handleAdd(item)}>
            {addingId === item.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.addBtnText}>{t('catalogue.addButton')}</Text>
            )}
          </TouchableOpacity>
        )}
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
        <Text style={styles.title}>{t('catalogue.header.title')}</Text>
        <View style={styles.headerSide} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('catalogue.empty')}</Text>
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
  listContent: {
    padding: 16,
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
  addBtn: {
    backgroundColor: COLORS.primary,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF7F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  badgeText: {
    color: COLORS.success,
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
  },
});

export default ActivitesCatalogueScreen;
