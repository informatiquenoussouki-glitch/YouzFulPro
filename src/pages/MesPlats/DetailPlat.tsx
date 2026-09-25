import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {COLORS, BASE_URL} from '../../helpers/config';

const DetailPlatScreen = () => {
  const {t} = useTranslation('mesPlats');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const plat = route.params?.plat;

  const imageUri =
    plat?.urlpic
      ? plat.urlpic.startsWith('http')
        ? plat.urlpic
        : `${BASE_URL}/${plat.urlpic}`
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('detail.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <Image source={{uri: imageUri}} style={styles.image} />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>{t('detail.noImage')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('detail.fields.name')}</Text>
            <Text style={styles.value}>{plat?.name || t('detail.empty')}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('detail.fields.price')}</Text>
            <Text style={styles.value}>{plat?.price ? `${plat.price} SAR` : t('detail.empty')}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('detail.fields.deliveryTime')}</Text>
            <Text style={styles.value}>
              {plat?.time_delevery ? `${plat.time_delevery} min` : t('detail.empty')}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('detail.fields.ingredients')}</Text>
            <Text style={styles.value}>{plat?.ingrediants || t('detail.empty')}</Text>
          </View>

          <View style={[styles.field, styles.lastField]}>
            <Text style={styles.label}>{t('detail.fields.status')}</Text>
            <Text
              style={[
                styles.value,
                {color: Number(plat?.actif) === 1 ? COLORS.success : COLORS.danger},
              ]}>
              {Number(plat?.actif) === 1 ? t('statusActive') : t('statusInactive')}
            </Text>
          </View>
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
  content: {
    padding: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  noImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  lastField: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
});

export default DetailPlatScreen;