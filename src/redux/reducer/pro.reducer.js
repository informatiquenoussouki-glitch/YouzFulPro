import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
  SET_FCM_TOKEN,
  LOAD_DEMANDES_SUCCESS,
  ACCEPTER_DEMANDE_SUCCESS,
  REFUSER_DEMANDE_SUCCESS,
  LOAD_REVENUS_SUCCESS,
  LOAD_NOTATION_SUCCESS,
  UPDATE_PROFIL_SUCCESS,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAILURE,
  INSCRIPTION_UPDATE_FORM,
  INSCRIPTION_RESET,
  LOAD_PAYS_SUCCESS,
  LOAD_VILLES_SUCCESS,
  LOAD_TYPEVISITES_SUCCESS,
  // Nouveau : constante pour les véhicules transfert
  LOAD_TYPEVISITES_TRANSFERT_SUCCESS,
  LOAD_SPECIALITES_RESTO_SUCCESS,
  LOAD_LANGUES_SUCCESS,
  LOAD_ACTIVITES_VILLE_SUCCESS,
} from '../constants/pro.constants';

const inscriptionFormInitial = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  password: '',
  sexe: '',
  date_naissance: '',
  photo_url: '',
  numero_identite: '',
  email_verifie: false,
  type_service: '',
  pays_id: null,
  villes: [],
  preferences: {},
  langues: [],
  mode_paiement: 'cash',
  iban: '',
  cgu_accepte: false,
  rayon_km: 0,
};

const initialState = {
  token: null,
  prestataire: {
    id: null,
    nom: '',
    prenom: '',
    email: '',
    type_service: '',
    note_moyenne: 0,
    fcm_token: null,
    isactive: false,
  },
  demandesEnAttente: [],
  demandesAcceptees: [],
  historique: [],
  revenus: {
    total_mois: 0,
    historique: [],
  },
  notation: {
    note: 0,
    position: 0,
    avis: [],
  },
  isLoading: false,
  error: null,
  // Inscription
  inscriptionForm: inscriptionFormInitial,
  registerLoading: false,
  registerError: null,
  // Référentiels
  pays: [],
  villes: [],
  typevisites: [],
  // Nouveau : liste des véhicules pour le service transfert [{id, nom}, ...]
  typevisites_transfert: [],
  specialites_resto: [],
  langues: [],
  // Activités disponibles dans les villes sélectionnées (inscription, type 'activite')
  activites_ville: [],
};

const proReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
      return {...state, isLoading: true, error: null};

    case LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        token: action.payload.token,
        prestataire: action.payload.prestataire,
        error: null,
      };

    case LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case LOGOUT:
      return {
        ...initialState,
      };

    case SET_FCM_TOKEN:
      return {
        ...state,
        prestataire: {
          ...state.prestataire,
          fcm_token: action.payload,
        },
      };

    case LOAD_DEMANDES_SUCCESS:
      return {
        ...state,
        demandesEnAttente: action.payload?.demandes_en_attente || [],
        demandesAcceptees: action.payload?.missions_aujourdhui || [],
      };

    case ACCEPTER_DEMANDE_SUCCESS:
      return {
        ...state,
        demandesEnAttente: state.demandesEnAttente.filter(
          (d) => d.id !== action.payload.demande_id,
        ),
      };

    case REFUSER_DEMANDE_SUCCESS:
      return {
        ...state,
        demandesEnAttente: state.demandesEnAttente.filter(
          (d) => d.id !== action.payload.demande_id,
        ),
      };

    case LOAD_REVENUS_SUCCESS:
      return {
        ...state,
        revenus: {
          total_mois: action.payload?.total_mois || 0,
          historique: action.payload?.historique || [],
        },
      };

    case LOAD_NOTATION_SUCCESS:
      return {
        ...state,
        notation: {
          note: action.payload?.note_moyenne || 0,
          position: action.payload?.position || 0,
          avis: action.payload?.avis || [],
          nb_avis: action.payload?.nb_avis || 0,
          nb_positifs: action.payload?.nb_positifs || 0,
          nb_moyens: action.payload?.nb_moyens || 0,
          nb_negatifs: action.payload?.nb_negatifs || 0,
          total_prestataires: action.payload?.total_prestataires || 0,
        },
      };

    case UPDATE_PROFIL_SUCCESS:
      return {
        ...state,
        prestataire: {
          ...state.prestataire,
          ...action.payload,
        },
      };

    // ── INSCRIPTION ────────────────────────────────────────────────────────
    case INSCRIPTION_UPDATE_FORM:
      return {
        ...state,
        inscriptionForm: {...state.inscriptionForm, ...action.payload},
      };

    case INSCRIPTION_RESET:
      return {
        ...state,
        inscriptionForm: inscriptionFormInitial,
        registerLoading: false,
        registerError: null,
      };

    case REGISTER_REQUEST:
      return {...state, registerLoading: true, registerError: null};

    case REGISTER_SUCCESS:
      return {...state, registerLoading: false, inscriptionForm: inscriptionFormInitial};

    case REGISTER_FAILURE:
      return {...state, registerLoading: false, registerError: action.payload};

    // ── RÉFÉRENTIELS ──────────────────────────────────────────────────────
    case LOAD_PAYS_SUCCESS:
      return {...state, pays: action.payload};

    case LOAD_VILLES_SUCCESS:
      return {...state, villes: action.payload};

    case LOAD_TYPEVISITES_SUCCESS:
      return {...state, typevisites: action.payload};

    // Nouveau : quand l'action est dispatchée, on stocke les véhicules dans le state
    case LOAD_TYPEVISITES_TRANSFERT_SUCCESS:
      return {...state, typevisites_transfert: action.payload};

    case LOAD_SPECIALITES_RESTO_SUCCESS:
      return {...state, specialites_resto: action.payload};

    case LOAD_LANGUES_SUCCESS:
      return {...state, langues: action.payload};

    case LOAD_ACTIVITES_VILLE_SUCCESS:
      return {...state, activites_ville: action.payload};

    default:
      return state;
  }
};

export default proReducer;
