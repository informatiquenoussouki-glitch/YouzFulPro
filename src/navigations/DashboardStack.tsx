import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DashboardScreen from '../pages/Dashboard/index';
import NotationScreen from '../pages/Notation/index';

const Stack = createNativeStackNavigator();

const DashboardNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen name="Notation" component={NotationScreen} />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
