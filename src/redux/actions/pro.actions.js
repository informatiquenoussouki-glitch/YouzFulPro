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
  // Nouveau : on importe la constante pour les véhicules transfert
  LOAD_TYPEVISITES_TRANSFERT_SUCCESS,
  LOAD_SPECIALITES_RESTO_SUCCESS,
  LOAD_LANGUES_SUCCESS,
  LOAD_ACTIVITES_VILLE_SUCCESS,
} from '../constants/pro.constants';
import {
  loginPro,
  registerFCMToken,
  getDashboard,
  accepterDemande,
  refuserDemande,
  getMesDemandes,
  getProfil,
  updateProfil as updateProfilAPI,
  getDisponibilites,
  updateDisponibilites as updateDisponibilitesAPI,
  getRevenus,
  getNotation,
  registerPro,
  getPays,
  getVilles as getVillesAPI,
  getTypevisites as getTypevisitesAPI,
  // Nouveau : on importe la fonction API qui appelle GetTypevisitesTransfert.php
  getTypevisitesTransfert as getTypevisitesTransfertAPI,
  getSpecialitesResto as getSpecialitesRestoAPI,
  addSpecialiteResto as addSpecialiteRestoAPI,
  getLangues as getLanguesAPI,
  getActivitesInscription as getActivitesInscriptionAPI,
    terminerDemande,
  annulerDemande,
    commencerDemande,
    livrerDemande,
    respondExtension,
} from '../../api/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginAction = (mail, password) => async (dispatch, getState) => {
  dispatch({type: LOGIN_REQUEST});
  try {
    // Le serveur répond parfois avec un fort délai (lenteur d'hébergement) ;
    // loginPro attend jusqu'à 60s avant d'abandonner.
    const response = await loginPro(mail, password);

    const {token, prestataire} = response.data;
    await AsyncStorage.setItem('pro_token', token);
    dispatch({type: LOGIN_SUCCESS, payload: {token, prestataire}});

    // Envoyer le FCM token à l'API si déjà disponible (permission accordée au démarrage)
    const fcmToken = getState().proReducer.prestataire?.fcm_token;
    if (fcmToken) {
      registerFCMToken(token, fcmToken).catch(() => {});
    }

    return {success: true};
  } catch (error) {
    let message = error?.data?.message;
    if (!message) {
      message = error?.code === 'ECONNABORTED'
        ? 'Le serveur met du temps à répondre, veuillez réessayer dans un instant.'
        : error?.message || 'Erreur de connexion';
    }
    dispatch({type: LOGIN_FAILURE, payload: message});
    return {success: false, message};
  }
};

export const logoutAction = () => async (dispatch) => {
  await AsyncStorage.removeItem('pro_token');
  dispatch({type: LOGOUT});
};

export const setFcmToken = (fcm_token) => ({
  type: SET_FCM_TOKEN,
  payload: fcm_token,
});

export const loadDashboard = (token) => async (dispatch) => {
  try {
    const response = await getDashboard(token);
    dispatch({type: LOAD_DEMANDES_SUCCESS, payload: response.data});
  } catch (error) {
    console.log('Dashboard HTTP status:', error?.status);
    console.log('Dashboard error message:', error?.message);
    console.log('Dashboard error data:', JSON.stringify(error?.data ?? error));
  }
};

export const accepterDemandeAction = (token, demande_id, type_service) => async (dispatch) => {
  try {
    await accepterDemande(token, demande_id, type_service);
    dispatch({type: ACCEPTER_DEMANDE_SUCCESS, payload: {demande_id}});
    return {success: true};
  } catch (error) {
    const message = error?.data?.message || error?.message || "Impossible d'accepter cette demande.";
    return {success: false, message};
  }
};

export const refuserDemandeAction = (token, demande_id, type_service) => async (dispatch) => {
  try {
    await refuserDemande(token, demande_id, type_service);
    dispatch({type: REFUSER_DEMANDE_SUCCESS, payload: {demande_id}});
    return {success: true};
  } catch (error) {
    return {success: false};
  }
};

export const loadRevenus = (token, periode) => async (dispatch) => {
  try {
    const response = await getRevenus(token, periode);
    dispatch({type: LOAD_REVENUS_SUCCESS, payload: response.data});
  } catch (error) {
    console.log('Revenus error:', error);
  }
};

export const loadNotation = (token) => async (dispatch) => {
  try {
    const response = await getNotation(token);
    dispatch({type: LOAD_NOTATION_SUCCESS, payload: response.data});
  } catch (error) {
    console.log('Notation error:', error);
  }
};

export const updateProfilAction = (token, data) => async (dispatch) => {
  try {
    await updateProfilAPI(token, data);
    dispatch({type: UPDATE_PROFIL_SUCCESS, payload: data});
    return {success: true};
  } catch (error) {
    return {success: false};
  }
};

// ── INSCRIPTION ──────────────────────────────────────────────────────────────
export const updateInscriptionForm = (data) => ({
  type: INSCRIPTION_UPDATE_FORM,
  payload: data,
});

export const resetInscriptionForm = () => ({
  type: INSCRIPTION_RESET,
});

export const registerAction = (data) => async (dispatch) => {
  dispatch({type: REGISTER_REQUEST});
  try {
    const response = await registerPro(data);
    dispatch({type: REGISTER_SUCCESS, payload: response.data});
    return {success: true, prestataire_id: response.data?.prestataire_id};
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || JSON.stringify(error);
    dispatch({type: REGISTER_FAILURE, payload: message});
    return {success: false, message};
  }
};

// ── RÉFÉRENTIELS ─────────────────────────────────────────────────────────────
export const getPaysAction = () => async (dispatch) => {
  try {
    const response = await getPays();
    dispatch({type: LOAD_PAYS_SUCCESS, payload: response.data?.pays || []});
  } catch (error) {
    // silencieux
  }
};

export const getVillesAction = (pays_id) => async (dispatch) => {
  try {
    const response = await getVillesAPI(pays_id);
    dispatch({type: LOAD_VILLES_SUCCESS, payload: response.data?.villes || []});
  } catch (error) {
    // silencieux
  }
};

export const getTypevisitesAction = () => async (dispatch) => {
  try {
    const response = await getTypevisitesAPI();
    dispatch({type: LOAD_TYPEVISITES_SUCCESS, payload: response.data?.typevisites || []});
  } catch (error) {
    // silencieux
  }
};

// Nouveau : charge les véhicules depuis typevisie_transfert via le serveur
// Utilisé dans Step4_Preferences quand le type de service est 'transfert'
export const getTypevisitesTransfertAction = () => async (dispatch) => {
  try {
    const response = await getTypevisitesTransfertAPI();
    console.log('[TRANSFERT] réponse API =', JSON.stringify(response.data));
    dispatch({type: LOAD_TYPEVISITES_TRANSFERT_SUCCESS, payload: response.data?.vehicules || []});
  } catch (error) {
    console.log('[TRANSFERT] erreur API =', JSON.stringify(error));
  }
};

export const getSpecialitesRestoAction = () => async (dispatch) => {
  try {
    const response = await getSpecialitesRestoAPI();
    dispatch({type: LOAD_SPECIALITES_RESTO_SUCCESS, payload: response.data?.specialites || []});
  } catch (error) {
    // silencieux
  }
};

export const addSpecialiteRestoAction = (nom) => async (dispatch, getState) => {
  try {
    const response = await addSpecialiteRestoAPI(nom);
    const specialite = response.data?.specialite;
    if (specialite) {
      const current = getState().proReducer.specialites_resto;
      const exists = current.find((s) => s.id === specialite.id);
      if (!exists) {
        dispatch({
          type: LOAD_SPECIALITES_RESTO_SUCCESS,
          payload: [...current, specialite],
        });
      }
      return {success: true, specialite};
    }
    return {success: false};
  } catch (error) {
    return {success: false};
  }
};

export const getLanguesAction = () => async (dispatch) => {
  try {
    const response = await getLanguesAPI();
    dispatch({type: LOAD_LANGUES_SUCCESS, payload: response.data?.langues || []});
  } catch (error) {
    // silencieux
  }
};

// Charge tout le catalogue d'activités, pour le type de service 'activite' (inscription)
export const getActivitesInscriptionAction = () => async (dispatch) => {
  try {
    const response = await getActivitesInscriptionAPI();
    dispatch({type: LOAD_ACTIVITES_VILLE_SUCCESS, payload: response.data?.activites || []});
  } catch (error) {
    // silencieux
  }
};



export const terminerDemandeAction = (token, demandeId, typeService, tempsAjoute = 0, coutAjoute = 0, etatpayement = 0) => async () => {
  try {
    const response = await terminerDemande(token, demandeId, typeService, tempsAjoute, coutAjoute, etatpayement);
    console.log('TERMINER OK =', response.data);
    return response.data;
  } catch (error) {
    console.log('TERMINER ERROR EXACTE =', error);

    return {
      code: error?.code || 500,
      message: error?.message || JSON.stringify(error),
    };
  }
};

export const annulerDemandeAction = (token, demandeId, typeService) => async () => {
  try {
    const response = await annulerDemande(token, demandeId, typeService);
    console.log('ANNULER OK =', response.data);
    return response.data;
  } catch (error) {
    console.log('ANNULER ERROR COMPLET =', error);
    return {code: 500, message: 'Erreur annuler'};
  }
};
export const commencerDemandeAction = (token, demandeId, typeService) => async () => {
  try {
    const response = await commencerDemande(token, demandeId, typeService);
    console.log('COMMENCER OK =', response.data);
    return response.data;
  } catch (error) {
    console.log('COMMENCER ERROR EXACTE =', error);

    return {
      code: error?.code || 500,
      message: error?.message || JSON.stringify(error),
    };
  }
};

export const livrerDemandeAction = (token, demandeId, typeService) => async () => {
  try {
    const response = await livrerDemande(token, demandeId, typeService);
    console.log('LIVRER OK =', response.data);
    return response.data;
  } catch (error) {
    console.log('LIVRER ERROR EXACTE =', error);

    return {
      code: error?.code || 500,
      message: error?.message || JSON.stringify(error),
    };
  }
};

// Réponse du prestataire à une demande d'extension +30min envoyée par le client
export const respondExtensionAction = (token, demandeId, response) => async () => {
  try {
    const result = await respondExtension(token, demandeId, response);
    console.log('RESPOND EXTENSION OK =', result.data);
    return result.data;
  } catch (error) {
    console.log('RESPOND EXTENSION ERROR =', error);
    return {
      code: error?.code || 500,
      message: error?.message || JSON.stringify(error),
    };
  }
};

