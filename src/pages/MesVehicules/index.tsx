import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {
  getMesVehicules,
  addVehicule,
  editVehicule,
  deleteVehicule,
} from '../../api/settings';
import {COLORS} from '../../helpers/config';

const DISPOS = ['matin', 'jour', 'soir'] as const;

type Vehicule = {id: number; vehicule: string; ville: string; temp: string};
type CatalogueItem = {id: number; vehicule: string};
type VilleItem = {id: number; nom: string};

const MesVehiculesScreen = () => {
  const {t} = useTranslation('mesVehicules');
  const navigation = useNavigation<any>();
  const {token} = useSelector((state: RootState) => state.proReducer);

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [villes, setVilles] = useState<VilleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // En édition, un seul véhicule = une seule ville (dropdown).
  // En ajout, on peut cocher plusieurs villes pour créer plusieurs fiches d'un coup.
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<number | null>(null);
  const [selectedVilleIds, setSelectedVilleIds] = useState<number[]>([]);
  const [selectedTemp, setSelectedTemp] = useState<string[]>([]);
  const [vehiculePickerOpen, setVehiculePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await getMesVehicules(token);
      const data = response?.data;
      setVehicules(Array.isArray(data?.vehicules) ? data.vehicules : []);
      setCatalogue(Array.isArray(data?.catalogue) ? data.catalogue : []);
      setVilles(Array.isArray(data?.villes) ? data.villes : []);
    } catch (error) {
      console.log('MES VEHICULES ERROR =>', error);
      Alert.alert(t('errors.title'), t('errors.loadVehicules'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [token]),
  );

  const toggleVille = (id: number) => {
    setSelectedVilleIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]));
  };

  const toggleTemp = (key: string) => {
    setSelectedTemp(prev => (prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]));
  };

  const openAddModal = () => {
    setEditingId(null);
    setSelectedVehiculeId(null);
    setSelectedVilleIds([]);
    setSelectedTemp([]);
    setVehiculePickerOpen(false);
    setModalVisible(true);
  };

  const openEditModal = (item: Vehicule) => {
    const catalogueMatch = catalogue.find(c => c.vehicule === item.vehicule);
    const villeMatch = villes.find(v => v.nom === item.ville);
    setEditingId(item.id);
    setSelectedVehiculeId(catalogueMatch?.id ?? null);
    setSelectedVilleIds(villeMatch ? [villeMatch.id] : []);
    setSelectedTemp(item.temp && item.temp !== 'All' ? item.temp.split(',') : []);
    setVehiculePickerOpen(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!selectedVehiculeId) {
      Alert.alert(t('errors.title'), t('errors.selectVehiculeType'));
      return;
    }
    if (selectedVilleIds.length === 0) {
      Alert.alert(t('errors.title'), t('errors.selectVille'));
      return;
    }
    const temp = selectedTemp.join(',');
    setSaving(true);
    try {
      if (editingId) {
        // Une fiche = une ville : on garde la première ville cochée.
        await editVehicule(token, editingId, selectedVehiculeId, selectedVilleIds[0], temp);
      } else {
        // Un ajout peut créer plusieurs fiches indépendantes d'un coup (une par ville cochée).
        await Promise.all(
          selectedVilleIds.map(villeId => addVehicule(token, selectedVehiculeId, villeId, temp)),
        );
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      console.log('SAVE VEHICULE ERROR =>', error);
      Alert.alert(t('errors.title'), error?.data?.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: Vehicule) => {
    Alert.alert(
      t('deleteConfirm.title'),
      t('deleteConfirm.message', {vehicule: item.vehicule, ville: item.ville}),
      [
        {text: t('deleteConfirm.cancel'), style: 'cancel'},
        {
          text: t('deleteConfirm.confirm'),
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteVehicule(token, item.id);
              setVehicules(prev => prev.filter(v => v.id !== item.id));
            } catch (error) {
              console.log('DELETE VEHICULE ERROR =>', error);
              Alert.alert(t('errors.title'), t('errors.deleteFailed'));
            }
          },
        },
      ],
    );
  };

  const selectedVehiculeLabel = catalogue.find(c => c.id === selectedVehiculeId)?.vehicule;

  const renderItem = ({item}: {item: Vehicule}) => {
    const tempTags = item.temp && item.temp !== 'All' ? item.temp.split(',') : [];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.vehiculeName}>{item.vehicule}</Text>
          <Text style={styles.villeName}>{item.ville}</Text>
        </View>

        <View style={styles.tagsRow}>
          {tempTags.length > 0 ? (
            tempTags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{t(`dispo.${tag}`, {defaultValue: tag})}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{t('dispo.allDay')}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editText}>{t('card.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>{t('card.delete')}</Text>
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
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('addButton')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : vehicules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('empty.title')}</Text>
          <Text style={styles.emptyText}>{t('empty.text')}</Text>
        </View>
      ) : (
        <FlatList
          data={vehicules}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <KeyboardAwareScrollView
              enableOnAndroid
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>
                {editingId ? t('modal.editTitle') : t('modal.addTitle')}
              </Text>

              <Text style={styles.label}>{t('modal.vehiculeType')}</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setVehiculePickerOpen(!vehiculePickerOpen)}>
                <Text style={selectedVehiculeLabel ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {selectedVehiculeLabel || t('modal.selectVehicule')}
                </Text>
                <Text style={styles.dropdownArrow}>{vehiculePickerOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {vehiculePickerOpen && (
                <View style={styles.dropdownList}>
                  {catalogue.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.dropdownItem, selectedVehiculeId === c.id && styles.dropdownItemActive]}
                      onPress={() => {
                        setSelectedVehiculeId(c.id);
                        setVehiculePickerOpen(false);
                      }}>
                      <Text style={[
                        styles.dropdownItemText,
                        selectedVehiculeId === c.id && styles.dropdownItemTextActive,
                      ]}>
                        {c.vehicule}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>
                {editingId ? t('modal.villeSingle') : t('modal.villeMultiple')}
              </Text>
              {villes.length === 0 ? (
                <Text style={styles.emptyText}>{t('modal.noVilleAvailable')}</Text>
              ) : (
                villes.map(v => {
                  const checked = selectedVilleIds.includes(v.id);
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={styles.checkRow}
                      onPress={() =>
                        editingId ? setSelectedVilleIds([v.id]) : toggleVille(v.id)
                      }>
                      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={styles.checkLabel}>{v.nom}</Text>
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={styles.label}>{t('modal.availability')}</Text>
              <View style={styles.toggleRow}>
                {DISPOS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.toggleBtn, selectedTemp.includes(d) && styles.toggleBtnActive]}
                    onPress={() => toggleTemp(d)}>
                    <Text style={[styles.toggleText, selectedTemp.includes(d) && styles.toggleTextActive]}>
                      {t(`dispo.${d}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}>
                  <Text style={styles.cancelText}>{t('modal.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveText}>{t('modal.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
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
  headerSide: {flex: 1},
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
  backIcon: {fontSize: 16, fontWeight: '700', color: COLORS.primary, marginRight: 4},
  backLabel: {fontSize: 14, fontWeight: '600', color: COLORS.primary},
  title: {fontSize: 18, fontWeight: 'bold', color: COLORS.text},
  topBar: {padding: 16},
  addButton: {
    backgroundColor: COLORS.secondary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {color: '#FFF', fontSize: 15, fontWeight: 'bold'},
  listContent: {paddingHorizontal: 16, paddingBottom: 24},
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
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  vehiculeName: {fontSize: 16, fontWeight: 'bold', color: COLORS.text},
  villeName: {fontSize: 13, color: COLORS.textSecondary},
  tagsRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 10},
  tag: {
    backgroundColor: '#E8F5F0',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {color: COLORS.primary, fontSize: 12, fontWeight: '600'},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F8F8',
  },
  editBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editText: {color: COLORS.primary, fontWeight: '600', fontSize: 13},
  deleteBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {color: '#FFF', fontWeight: '600', fontSize: 13},
  loaderContainer: {flex: 1, justifyContent: 'center'},
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24},
  emptyTitle: {fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8},
  emptyText: {fontSize: 14, color: COLORS.textSecondary, textAlign: 'center'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalScroll: {padding: 20, paddingBottom: 32},
  modalTitle: {fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12},
  dropdown: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {fontSize: 16, color: COLORS.text},
  dropdownPlaceholder: {fontSize: 16, color: COLORS.textSecondary},
  dropdownArrow: {fontSize: 14, color: COLORS.textSecondary},
  dropdownList: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {backgroundColor: '#E8F5F0'},
  dropdownItemText: {fontSize: 15, color: COLORS.text},
  dropdownItemTextActive: {color: COLORS.primary, fontWeight: '600'},
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  checkboxActive: {borderColor: COLORS.primary, backgroundColor: COLORS.primary},
  checkmark: {color: '#FFF', fontSize: 13, fontWeight: 'bold'},
  checkLabel: {fontSize: 15, color: COLORS.text},
  toggleRow: {flexDirection: 'row'},
  toggleBtn: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    backgroundColor: COLORS.card,
  },
  toggleBtnActive: {borderColor: COLORS.primary, backgroundColor: '#E8F5F0'},
  toggleText: {fontSize: 14, fontWeight: '600', color: COLORS.textSecondary},
  toggleTextActive: {color: COLORS.primary},
  modalActions: {flexDirection: 'row', marginTop: 28},
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cancelText: {color: COLORS.textSecondary, fontSize: 15, fontWeight: '600'},
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {color: '#FFF', fontSize: 15, fontWeight: 'bold'},
});

export default MesVehiculesScreen;
