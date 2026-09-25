import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {getMesPlats ,  deletePlat} from '../../api/settings';
import {COLORS, BASE_URL} from '../../helpers/config';


const MesPlatsScreen = () => {
  const {t} = useTranslation('mesPlats');
  const navigation = useNavigation<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const [plats, setPlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlats();
  }, []);

  const fetchPlats = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await getMesPlats(token);
      const data = response?.data?.plats || [];
      setPlats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('MES PLATS ERROR =>', error);
      Alert.alert(t('errors.title'), t('errors.loadPlats'));
    } finally {
      setLoading(false);
    }
  };



const handleDelete = (plat: any) => {
  Alert.alert(
    t('deleteConfirm.title'),
    t('deleteConfirm.message', {name: plat?.name}),
    [
      {text: t('deleteConfirm.cancel'), style: 'cancel'},
      {
        text: t('deleteConfirm.confirm'),
        style: 'destructive',
        onPress: async () => {
          if (!token) {
            Alert.alert(t('errors.title'), t('errors.missingToken'));
            return;
          }

          try {
            const response = await deletePlat(token, plat.id);

            console.log('DELETE PLAT SUCCESS =>', response?.data);

            if (response?.data?.success) {
              Alert.alert(t('success.title'), response.data.message || t('success.deleted'));
              fetchPlats();
            } else {
              Alert.alert(t('errors.title'), response?.data?.message || t('errors.deleteFailed'));
            }
          } catch (error: any) {
            console.log('DELETE PLAT ERROR FULL =>', error);
            console.log('DELETE PLAT ERROR DATA =>', error?.response?.data);
            console.log('DELETE PLAT ERROR STATUS =>', error?.response?.status);

            Alert.alert(
              t('errors.title'),
              error?.response?.data?.message ||
                error?.message ||
                t('errors.deleteFailedGeneric'),
            );
          }
        },
      },
    ],
  );
};

  const renderItem = ({item}: {item: any}) => {
    const imageUri =
      item.urlpic
        ? item.urlpic.startsWith('http')
          ? item.urlpic
          : `${BASE_URL}/${item.urlpic}`
        : null;

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
            <Text style={styles.nom}>{item.name}</Text>

            <Text style={styles.meta}>
              {t('price')}<Text style={styles.metaValue}>{item.price} SAR</Text>
            </Text>

            <Text style={styles.meta}>
              {t('delivery')}<Text style={styles.metaValue}>{item.time_delevery} min</Text>
            </Text>

            <Text style={styles.meta}>
              {t('status')}
              <Text
                style={[
                  styles.metaValue,
                  {color: Number(item.actif) === 1 ? COLORS.success : COLORS.danger},
                ]}>
                {Number(item.actif) === 1 ? t('statusActive') : t('statusInactive')}
              </Text>
            </Text>
          </View>
        </View>

       <View style={styles.actions}>
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => navigation.navigate('DetailPlat', {plat: item})}>
    <Text style={styles.actionText}>{t('actions.view')}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, styles.editBtn]}
    onPress={() => navigation.navigate('EditPlat', {plat: item})}>
    <Text style={styles.actionText}>{t('actions.edit')}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, styles.deleteBtn]}
    onPress={() => handleDelete(item)}>
    <Text style={styles.actionText}>{t('actions.delete')}</Text>
  </TouchableOpacity>
</View>
      </View>
    );
  };


  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('list.title')}</Text>
      </View>

  <View style={styles.topBar}>
  <TouchableOpacity
    style={styles.addButton}
    onPress={() => navigation.navigate('AddPlat')}>
    <Text style={styles.addButtonText}>{t('list.addButton')}</Text>
  </TouchableOpacity>
</View>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : plats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('list.empty.title')}</Text>
          <Text style={styles.emptyText}>
            {t('list.empty.text')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={plats}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
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
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  actionBtn: {
  backgroundColor: COLORS.primary,
  paddingHorizontal: 14,
  height: 38,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},
editBtn: {
  backgroundColor: COLORS.secondary,
},
deleteBtn: {
  backgroundColor: COLORS.danger,
},
actionText: {
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




export default MesPlatsScreen;