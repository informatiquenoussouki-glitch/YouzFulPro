import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {editPlat} from '../../api/settings';
import {COLORS, BASE_URL} from '../../helpers/config';

const EditPlatScreen = () => {
  const {t} = useTranslation('mesPlats');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const plat = route.params?.plat;

  const [name, setName] = useState(plat?.name || '');
  const [price, setPrice] = useState(String(plat?.price || ''));
  const [timeDelevery, setTimeDelevery] = useState(String(plat?.time_delevery || ''));
  const [ingrediants, setIngrediants] = useState(plat?.ingrediants || '');
  const [actif, setActif] = useState(Number(plat?.actif) === 1 ? '1' : '0');
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const imageUri = photo?.uri
    ? photo.uri
    : plat?.urlpic
      ? plat.urlpic.startsWith('http')
        ? plat.urlpic
        : `${BASE_URL}/${plat.urlpic}`
      : null;

  const choosePhoto = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0]) {
        setPhoto(response.assets[0]);
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !timeDelevery.trim()) {
      Alert.alert(t('errors.title'), t('form.errors.required'));
      return;
    }

    if (!token) {
      Alert.alert(t('errors.title'), t('form.errors.missingToken'));
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('id', String(plat.id));
      formData.append('name', name.trim());
      formData.append('price', price.trim());
      formData.append('time_delevery', timeDelevery.trim());
      formData.append('ingrediants', ingrediants.trim());
      formData.append('actif', actif);

      if (photo?.uri) {
        formData.append('photo', {
          uri: photo.uri,
          name: photo.fileName || `plat_${Date.now()}.jpg`,
          type: photo.type || 'image/jpeg',
        } as any);
      }

      const response = await editPlat(token, formData);

      if (response?.data?.success) {
        Alert.alert(t('success.title'), response?.data?.message || t('form.success.edited'));
        navigation.goBack();
      } else {
        Alert.alert(t('errors.title'), response?.data?.message || t('form.errors.editFailed'));
      }
    } catch (error: any) {
      console.log('EDIT PLAT ERROR =>', error?.response?.data || error);
      Alert.alert(
        t('errors.title'),
        error?.response?.data?.message || t('form.errors.editFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('form.editTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>{t('form.name')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>{t('form.price')}</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('form.deliveryTime')}</Text>
        <TextInput
          style={styles.input}
          value={timeDelevery}
          onChangeText={setTimeDelevery}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('form.ingredients')}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={ingrediants}
          onChangeText={setIngrediants}
          multiline
        />

        <Text style={styles.label}>{t('form.status')}</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusBtn, actif === '1' && styles.statusBtnActive]}
            onPress={() => setActif('1')}>
            <Text style={[styles.statusText, actif === '1' && styles.statusTextActive]}>
              {t('form.statusActive')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, actif === '0' && styles.statusBtnActive]}
            onPress={() => setActif('0')}>
            <Text style={[styles.statusText, actif === '0' && styles.statusTextActive]}>
              {t('form.statusInactive')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('form.photo')}</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={choosePhoto}>
          <Text style={styles.photoBtnText}>{t('form.changePhoto')}</Text>
        </TouchableOpacity>

        {imageUri ? <Image source={{uri: imageUri}} style={styles.preview} /> : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButtonText}>
            {loading ? t('form.saving') : t('form.save')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    color: COLORS.text,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  statusBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5F0',
  },
  statusText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusTextActive: {
    color: COLORS.primary,
  },
  photoBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  photoBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginTop: 14,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditPlatScreen;