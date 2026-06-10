// App.js — StreamRipper Android Root
import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from './src/services/store';
import SearchScreen   from './src/screens/SearchScreen';
import QueueScreen    from './src/screens/QueueScreen';
import AddUrlScreen   from './src/screens/AddUrlScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen    from './src/screens/LoginScreen';
import PrivacyScreen  from './src/screens/PrivacyScreen';
import TermsScreen    from './src/screens/TermsScreen';
import AdBanner       from './src/components/AdBanner';
import UpdateBanner   from './src/components/UpdateBanner';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const COLORS = {
  bg: '#04060c', bg2: '#080c14',
  cyan: '#00f5ff', pink: '#ff2d78',
  text: '#e2e8f8', text2: '#6b7a99',
  border: 'rgba(0,245,255,0.12)',
};

function MainTabs() {
  const queue  = useStore(s => s.queue);
  const active = queue.filter(j =>
    ['queued','downloading','processing'].includes(j.status)
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <UpdateBanner/>
      <AdBanner/>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.bg2,
            borderTopColor:  COLORS.border,
            height: 60, paddingBottom: 8,
          },
          tabBarActiveTintColor:   COLORS.cyan,
          tabBarInactiveTintColor: COLORS.text2,
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Rajdhani-SemiBold' },
        }}
      >
        <Tab.Screen name="Search" component={SearchScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="magnify" size={22} color={color}/> }}/>
        <Tab.Screen name="Add URL" component={AddUrlScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="link-plus" size={22} color={color}/> }}/>
        <Tab.Screen name="Queue" component={QueueScreen}
          options={{
            tabBarIcon: ({ color }) => <Icon name="format-list-bulleted" size={22} color={color}/>,
            tabBarBadge: active > 0 ? active : undefined,
            tabBarBadgeStyle: { backgroundColor: COLORS.pink, fontSize: 10 },
          }}/>
        <Tab.Screen name="Settings" component={SettingsScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="cog-outline" size={22} color={color}/> }}/>
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const { user, restoreSession, loadSettings } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await restoreSession();
      await loadSettings();
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={{ flex:1, backgroundColor: COLORS.bg }}/>;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user
            ? <Stack.Screen name="Login"   component={LoginScreen}/>
            : <Stack.Screen name="Main"    component={MainTabs}/>
          }
          <Stack.Screen name="Privacy" component={PrivacyScreen}
            options={{ headerShown:true, headerTitle:'Privacy Policy',
              headerStyle:{ backgroundColor:COLORS.bg2 }, headerTintColor:COLORS.cyan }}/>
          <Stack.Screen name="Terms" component={TermsScreen}
            options={{ headerShown:true, headerTitle:'Terms of Service',
              headerStyle:{ backgroundColor:COLORS.bg2 }, headerTintColor:COLORS.cyan }}/>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
