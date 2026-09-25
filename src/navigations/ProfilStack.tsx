import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ProfilScreen from '../pages/Profil/index';
import DisponibilitesScreen from '../pages/Disponibilites/index';
import NotationScreen from '../pages/Notation/index';
import MesPlatsScreen from '../pages/MesPlats/index';
import AddPlatScreen from '../pages/MesPlats/AddPlat';
import DetailPlatScreen from '../pages/MesPlats/DetailPlat';
import EditPlatScreen from '../pages/MesPlats/EditPlat';
import MesActivitesScreen from '../pages/MesActivites/index';
import ActivitesCatalogueScreen from '../pages/MesActivites/Catalogue';
import MesVehiculesScreen from '../pages/MesVehicules/index';
import ContactAdminScreen from '../pages/ContactAdmin/index';


const Stack = createNativeStackNavigator();

const ProfilNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="ProfilMain" component={ProfilScreen} />
      <Stack.Screen name="Disponibilites" component={DisponibilitesScreen} />
     <Stack.Screen name="MesPlats" component={MesPlatsScreen} />
     <Stack.Screen name="AddPlat" component={AddPlatScreen} />
     <Stack.Screen name="DetailPlat" component={DetailPlatScreen} />
     <Stack.Screen name="EditPlat" component={EditPlatScreen} />
     <Stack.Screen name="MesActivites" component={MesActivitesScreen} />
     <Stack.Screen name="ActivitesCatalogue" component={ActivitesCatalogueScreen} />
     <Stack.Screen name="MesVehicules" component={MesVehiculesScreen} />
      <Stack.Screen name="Notation" component={NotationScreen} />
      <Stack.Screen name="ContactAdmin" component={ContactAdminScreen} />
    </Stack.Navigator>
  );
};

export default ProfilNavigator;
