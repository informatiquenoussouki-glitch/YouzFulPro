import axios from 'axios';
import {BASE_URL} from '../helpers/config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        message: `HTTP ${error.response.status}`,
      });
    }
    return Promise.reject(error);
  },
);

const authHeader = token => ({
  headers: {Authorization: `Bearer ${token}`},
});

// AUTH
// Timeout long : l'hébergement répond parfois avec plusieurs secondes de
// délai, on préfère attendre plutôt qu'afficher une erreur trop tôt.
export const loginPro = (mail, password) =>
  api.post('/Pro/Login.php', {mail, password}, {timeout: 60000});

export const forgotPassword = email =>
  api.post('/Pro/ForgotPassword.php', {email});

export const registerFCMToken = (token, fcm_token) =>
  api.post('/Pro/RegisterFCM.php', {fcm_token}, authHeader(token));

// DASHBOARD
export const getDashboard = token =>
  api.get('/Pro/Dashboard.php', authHeader(token));

export const accepterDemande = (token, demande_id, type_service) =>
  api.post('/Pro/Accepter.php', {demande_id, type_service}, authHeader(token));

export const refuserDemande = (token, demande_id, type_service) =>
  api.post('/Pro/Refuser.php', {demande_id, type_service}, authHeader(token));

// DEMANDES
export const getMesDemandes = (token, statut = 'all') =>
  api.get(`/Pro/MesDemandes.php?statut=${statut}`, authHeader(token));

export const getDetailDemande = (token, id, type) =>
  api.get(`/Pro/DetailDemande.php?id=${id}&type=${type}`, authHeader(token));

// PROFIL
export const getProfil = token =>
  api.get('/Pro/Profil.php', authHeader(token));

export const updateProfil = (token, data) =>
  api.post('/Pro/UpdateProfil.php', data, authHeader(token));

// DISPONIBILITES
export const getDisponibilites = token =>
  api.get('/Pro/Disponibilites.php', authHeader(token));

export const updateDisponibilites = (token, disponibilites) =>
  api.post('/Pro/UpdateDisponibilites.php', {disponibilites}, authHeader(token));

// REVENUS
export const getRevenus = (token, periode = 'mois') =>
  api.get(`/Pro/Revenus.php?periode=${periode}`, authHeader(token));

// NOTATION
export const getNotation = token =>
  api.get('/Pro/Notation.php', authHeader(token));

// INSCRIPTION — pas de token requis
export const sendVerificationEmail = email =>
  api.post('/Pro/SendVerificationEmail.php', {email});

export const verifyEmail = (email, code) =>
  api.post('/Pro/VerifyEmail.php', {email, code});

export const registerPro = formData =>
  axios.post(`${BASE_URL}/Pro/Register.php`, formData, {
    headers: {Accept: 'application/json'},
  });

// RÉFÉRENTIELS
export const getPays = () =>
  api.get('/Pro/GetPays.php');

export const getVilles = pays_id =>
  api.get(`/Pro/GetVilles.php?pays_id=${pays_id}`);

// Catalogue complet des activités (inscription, sans token)
export const getActivitesInscription = () =>
  api.get('/Pro/GetActivitesByVille.php');

export const getTypevisites = () =>
  api.get('/Pro/GetTypevisites.php');

// Nouveau : récupère les véhicules depuis la table typevisie_transfert
// Appelle le fichier PHP GetTypevisitesTransfert.php sur le serveur
export const getTypevisitesTransfert = () =>
  api.get('/Pro/GetTypevisitesTransfert.php');

export const getSpecialitesResto = () =>
  api.get('/Pro/GetSpecialitesResto.php');

export const addSpecialiteResto = nom =>
  api.post('/Pro/AddSpecialiteResto.php', {nom});

export const getLangues = () =>
  api.get('/Pro/GetLangues.php');


export const getMesPlats = token =>
  api.get('/Pro/MesPlats.php', authHeader(token));


export const addPlat = (token, formData) =>
  axios.post(`${BASE_URL}/Pro/AddPlat.php`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });


  export const editPlat = (token, formData) =>
  axios.post(`${BASE_URL}/Pro/EditPlat.php`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });


  export const deletePlat = (token, id) =>
  api.post('/Pro/DeletePlat.php', {id}, authHeader(token));
  






// ACTIVITÉS (guide)
export const getMesActivites = token =>
  api.get('/Pro/GetMesActivites.php', authHeader(token));

export const getActivitesCatalogue = token =>
  api.get('/Pro/GetActivitesCatalogue.php', authHeader(token));

export const addActivite = (token, activity_id) =>
  api.post('/Pro/AddActivite.php', {activity_id}, authHeader(token));

export const annulerActivite = (token, activity_id) =>
  api.post('/Pro/AnnulerActivite.php', {activity_id}, authHeader(token));

export const toggleActivite = (token, activity_id, actif) =>
  api.post('/Pro/ToggleActivite.php', {activity_id, actif}, authHeader(token));

// VÉHICULES (transfert)
export const getMesVehicules = token =>
  api.get('/Pro/GetMesVehicules.php', authHeader(token));

export const addVehicule = (token, vehicule_id, ville_id, temp) =>
  api.post('/Pro/AddVehicule.php', {vehicule_id, ville_id, temp}, authHeader(token));

export const editVehicule = (token, id, vehicule_id, ville_id, temp) =>
  api.post('/Pro/EditVehicule.php', {id, vehicule_id, ville_id, temp}, authHeader(token));

export const deleteVehicule = (token, id) =>
  api.post('/Pro/DeleteVehicule.php', {id}, authHeader(token));

export const terminerDemande = (token, demande_id, type_service, temps_ajoute = 0, cout_ajoute = 0, etatpayement = 0) =>
  api.post('/Pro/Terminer.php', {demande_id, type_service, temps_ajoute, cout_ajoute, etatpayement}, authHeader(token));

export const annulerDemande = (token, demande_id, type_service) =>
  api.post('/Pro/Annuler.php', {demande_id, type_service}, authHeader(token));

export const commencerDemande = (token, demande_id, type_service) =>
  api.post(
    '/Pro/commencer.php',
    {demande_id, type_service},
    authHeader(token),
  );

export const livrerDemande = (token, demande_id, type_service) =>
  api.post('/Pro/Livrer.php', {demande_id, type_service}, authHeader(token));

// EXTENSION +30min (demande envoyée par le client, acceptée/refusée par le prestataire)
export const respondExtension = (token, demande_id, response) =>
  api.post('/Pro/RespondExtension.php', {demande_id, response}, authHeader(token));

// CONTACT ADMINISTRATION
export const sendMessageAdmin = (token, sujet, message) =>
  api.post('/Pro/ContactAdmin.php', {sujet, message}, authHeader(token));

export const getMesMessagesAdmin = token =>
  api.get('/Pro/ContactAdmin.php', authHeader(token));

export const getUnreadMessagesAdminCount = token =>
  api.get('/Pro/ContactAdmin.php?count=1', authHeader(token));