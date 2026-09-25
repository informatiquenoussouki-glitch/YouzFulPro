import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../redux/store';
import {getDisponibilites, updateDisponibilites} from '../../api/settings';
import {COLORS} from '../../helpers/config';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const HEURES = Array.from({length: 25}, (_, i) => `${String(i).padStart(2, '0')}:00`);
    
 


interface Dispo {
  jour: string;
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
}

const DisponibilitesScreen = () => {
  const {t} = useTranslation('disponibilites');
  const navigation = useNavigation();
  const token = useSelector((state: RootState) => state.proReducer.token);
  const [dispos, setDispos] = useState<Dispo[]>(
    JOURS.map(j => ({
      jour: j,
      heure_debut: '08:00',
      heure_fin: '20:00',
      actif: false,
    })),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDispos();
  }, []);

  const fetchDispos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await getDisponibilites(token);
      const apiDispos = response.data?.disponibilites || [];
      setDispos(
        JOURS.map(j => {
          const found = apiDispos.find((d: any) => d.jour === j);
         return {
  jour: j,
  heure_debut: found?.heure_debut ? found.heure_debut.substring(0, 5) : '08:00',
  heure_fin: found?.heure_fin ? found.heure_fin.substring(0, 5) : '20:00',
  actif: found ? Number(found.actif) === 1 : false,
};
        }),
      );
    } catch (error) {
      console.log('Dispos error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJour = (jour: string) => {
    setDispos(prev =>
      prev.map(d => (d.jour === jour ? {...d, actif: !d.actif} : d)),
    );
  };

  const updateHeure = (jour: string, field: 'heure_debut' | 'heure_fin', value: string) => {
    setDispos(prev =>
      prev.map(d => (d.jour === jour ? {...d, [field]: value} : d)),
    );
  };

const handleSave = async () => {
  if (!token) return;

  setSaving(true);

  try {
    const disposActives = dispos
      .filter(d => d.actif)
      .map(d => ({
        jour: d.jour,
        heure_debut: d.heure_debut,
        heure_fin: d.heure_fin,
        actif: 1,
      }));

    await updateDisponibilites(token, disposActives);

    Alert.alert(t('alerts.successTitle'), t('alerts.successMessage'));
    fetchDispos();
  } catch (error) {
    console.log('SAVE DISPOS ERROR =>', error);
    Alert.alert(t('alerts.errorTitle'), t('alerts.errorMessage'));
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backLabel}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('title')}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {dispos.map(dispo => {
          const jour = JOURS.find(j => j === dispo.jour);
          return (
            <View key={dispo.jour} style={styles.jourCard}>
              <View style={styles.jourHeader}>
                <Text style={styles.jourLabel}>{jour ? t(`jours.${jour}`) : ''}</Text>
                <Switch
                  value={dispo.actif}
                  onValueChange={() => toggleJour(dispo.jour)}
                  trackColor={{false: COLORS.border, true: COLORS.primary}}
                  thumbColor={dispo.actif ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>

              {dispo.actif && (
                <View style={styles.heuresRow}>
                  <View style={styles.heureGroup}>
                    <Text style={styles.heureLabel}>{t('from')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.heureScroll}>
                      {HEURES.slice(0, 20).map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.heureChip,
                            dispo.heure_debut === h && styles.heureChipActive,
                          ]}
                          onPress={() => updateHeure(dispo.jour, 'heure_debut', h)}>
                          <Text
                            style={[
                              styles.heureChipText,
                              dispo.heure_debut === h && styles.heureChipTextActive,
                            ]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>



                  <View style={styles.heureGroup}>
                    <Text style={styles.heureLabel}>{t('to')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.heureScroll}>
                      {HEURES.slice(1).map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.heureChip,
                            dispo.heure_fin === h && styles.heureChipActive,
                          ]}
                          onPress={() => updateHeure(dispo.jour, 'heure_fin', h)}>
                          <Text
                            style={[
                              styles.heureChipText,
                              dispo.heure_fin === h && styles.heureChipTextActive,
                            ]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          )}
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
  loader: {
    flex: 1,
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
  content: {
    padding: 16,
  },
  jourCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jourLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  heuresRow: {
    marginTop: 12,
  },
  heureGroup: {
    marginBottom: 8,
  },
  heureLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  heureScroll: {
    maxHeight: 40,
  },
  heureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.background,
  },
  heureChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  heureChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  heureChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DisponibilitesScreen;
