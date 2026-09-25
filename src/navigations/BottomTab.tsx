import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {View, Text, StyleSheet} from 'react-native';
import {RootState} from '../redux/store';
import DashboardNavigator from './DashboardStack';
import DemandesNavigator from './stack';
import RevenusScreen from '../pages/Revenus/index';
import ProfilNavigator from './ProfilStack';
import {COLORS} from '../helpers/config';

const Tab = createBottomTabNavigator();

const TabIcon = ({name, color, badge}: {name: string; color: string; badge?: number}) => {
  const icons: {[key: string]: string} = {
    Dashboard: '⌂',
    Demandes: '☰',
    Revenus: '₿',
    Profil: '👤',
  };
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, {color}]}>{icons[name] || '•'}</Text>
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
};

const BottomTabNavigator = () => {
  const {t} = useTranslation();
  const demandesEnAttente = useSelector(
    (state: RootState) => state.proReducer.demandesEnAttente,
  );
  const badgeCount = demandesEnAttente?.length || 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{
          tabBarLabel: t('navigation.tabs.accueil'),
          tabBarIcon: ({color}) => (
            <TabIcon name="Dashboard" color={color} badge={badgeCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Demandes"
        component={DemandesNavigator}
        options={{
          tabBarLabel: t('navigation.tabs.demandes'),
          tabBarIcon: ({color}) => <TabIcon name="Demandes" color={color} />,
        }}
      />
      <Tab.Screen
        name="Revenus"
        component={RevenusScreen}
        options={{
          tabBarLabel: t('navigation.tabs.revenus'),
          tabBarIcon: ({color}) => <TabIcon name="Revenus" color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfilTab"
        component={ProfilNavigator}
        options={{
          tabBarLabel: t('navigation.tabs.profil'),
          tabBarIcon: ({color}) => <TabIcon name="Profil" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default BottomTabNavigator;
