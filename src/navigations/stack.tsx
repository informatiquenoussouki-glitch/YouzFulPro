import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DemandesScreen from '../pages/Demandes/index';
import DetailScreen from '../pages/Demandes/Detail';

const Stack = createNativeStackNavigator();

const DemandesNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="DemandesList" component={DemandesScreen} />
      <Stack.Screen name="DemandeDetail" component={DetailScreen} />
    </Stack.Navigator>
  );
};

export default DemandesNavigator;
