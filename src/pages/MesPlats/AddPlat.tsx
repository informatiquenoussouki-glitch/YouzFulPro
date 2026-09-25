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
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {addPlat} from '../../api/settings';
import {COLORS} from '../../helpers/config';



const AddPlatScreen = () => {
  const {t} = useTranslation('mesPlats');
  const navigation = useNavigation<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [timeDelevery, setTimeDelevery] = useState('');
  const [ingrediants, setIngrediants] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);


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
    formData.append('name', name.trim());
    formData.append('price', price.trim());
    formData.append('time_delevery', timeDelevery.trim());
    formData.append('ingrediants', ingrediants.trim());
    formData.append('actif', '1');

    if (photo?.uri) {
      formData.append('photo', {
        uri: photo.uri,
        name: photo.fileName || `plat_${Date.now()}.jpg`,
        type: photo.type || 'image/jpeg',
      } as any);
    }

    const response = await addPlat(token, formData);

    console.log('ADD PLAT SUCCESS =>', response?.data);

    if (response?.data?.success) {
      Alert.alert(t('success.title'), response?.data?.message || t('form.success.added'));
      navigation.goBack();
    } else {
      Alert.alert(t('errors.title'), response?.data?.message || t('form.errors.addFailed'));
    }
  } catch (error: any) {
    console.log('ADD PLAT ERROR FULL =>', error);
    console.log('ADD PLAT ERROR DATA =>', error?.response?.data);
    console.log('ADD PLAT ERROR STATUS =>', error?.response?.status);

    Alert.alert(
      t('errors.title'),
      error?.response?.data?.message ||
        error?.message ||
        t('form.errors.addFailed'),
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
        <Text style={styles.title}>{t('form.addTitle')}</Text>
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

        <Text style={styles.label}>{t('form.photo')}</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={choosePhoto}>
          <Text style={styles.photoBtnText}>{t('form.choosePhoto')}</Text>
        </TouchableOpacity>

        {photo?.uri ? <Image source={{uri: photo.uri}} style={styles.preview} /> : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButtonText}>
            {loading ? t('form.saving') : t('form.add')}
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

export default AddPlatScreen;