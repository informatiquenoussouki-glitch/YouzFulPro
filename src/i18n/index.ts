import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

// Legacy flat translation files (login / inscription / navigation)
import frLegacy from '../locales/fr.json';
import enLegacy from '../locales/en.json';

// Namespaced translation files (one file per screen/feature)
import frCommon from '../locales/fr/common.json';
import enCommon from '../locales/en/common.json';
import frContactAdmin from '../locales/fr/contactAdmin.json';
import enContactAdmin from '../locales/en/contactAdmin.json';
import frDashboard from '../locales/fr/dashboard.json';
import enDashboard from '../locales/en/dashboard.json';
import frDemandes from '../locales/fr/demandes.json';
import enDemandes from '../locales/en/demandes.json';
import frDisponibilites from '../locales/fr/disponibilites.json';
import enDisponibilites from '../locales/en/disponibilites.json';
import frMesActivites from '../locales/fr/mesActivites.json';
import enMesActivites from '../locales/en/mesActivites.json';
import frMesPlats from '../locales/fr/mesPlats.json';
import enMesPlats from '../locales/en/mesPlats.json';
import frMesVehicules from '../locales/fr/mesVehicules.json';
import enMesVehicules from '../locales/en/mesVehicules.json';
import frNotation from '../locales/fr/notation.json';
import enNotation from '../locales/en/notation.json';
import frProfil from '../locales/fr/profil.json';
import enProfil from '../locales/en/profil.json';
import frRevenus from '../locales/fr/revenus.json';
import enRevenus from '../locales/en/revenus.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = '@youzful_pro_language';

const getDeviceLanguage = (): string => {
  const deviceLanguage =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'fr'
      : NativeModules.I18nManager?.localeIdentifier || 'fr';

  return deviceLanguage.startsWith('en') ? 'en' : 'fr';
};

const NAMESPACES = [
  'translation',
  'common',
  'contactAdmin',
  'dashboard',
  'demandes',
  'disponibilites',
  'mesActivites',
  'mesPlats',
  'mesVehicules',
  'notation',
  'profil',
  'revenus',
];

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: getDeviceLanguage(),
  fallbackLng: 'fr',
  defaultNS: 'translation',
  ns: NAMESPACES,
  resources: {
    fr: {
      translation: frLegacy,
      common: frCommon,
      contactAdmin: frContactAdmin,
      dashboard: frDashboard,
      demandes: frDemandes,
      disponibilites: frDisponibilites,
      mesActivites: frMesActivites,
      mesPlats: frMesPlats,
      mesVehicules: frMesVehicules,
      notation: frNotation,
      profil: frProfil,
      revenus: frRevenus,
    },
    en: {
      translation: enLegacy,
      common: enCommon,
      contactAdmin: enContactAdmin,
      dashboard: enDashboard,
      demandes: enDemandes,
      disponibilites: enDisponibilites,
      mesActivites: enMesActivites,
      mesPlats: enMesPlats,
      mesVehicules: enMesVehicules,
      notation: enNotation,
      profil: enProfil,
      revenus: enRevenus,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

// Apply the language the user previously chose, once AsyncStorage resolves.
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(savedLanguage => {
  if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as AppLanguage)) {
    i18n.changeLanguage(savedLanguage);
  }
});

export const changeAppLanguage = async (language: AppLanguage) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export default i18n;
