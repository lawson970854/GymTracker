import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/queryClient';
import { supabase } from './src/supabase';
import AuthScreen from './src/screens/AuthScreen';

SplashScreen.preventAutoHideAsync();
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import GymScreen from './src/screens/GymScreen';
import MachineScreen from './src/screens/MachineScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CategoryListScreen from './src/screens/CategoryListScreen';
import CategoryScreen from './src/screens/CategoryScreen';

import ProfileScreen from './src/screens/ProfileScreen';
import { ThemeProvider, useTheme } from './src/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function GymStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17 },
      headerTintColor: theme.accent,
      headerStyle: { elevation: 0, shadowOpacity: 0, backgroundColor: theme.bg, borderBottomWidth: 0 },
    }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '健身记录' }} />
      <Stack.Screen name="Gym" component={GymScreen} options={({ route }) => ({ title: route.params.gymName })} />
      <Stack.Screen name="Machine" component={MachineScreen} options={({ route }) => ({ title: route.params.machineName })} />
    </Stack.Navigator>
  );
}

function CategoryStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17 },
      headerTintColor: theme.accent,
      headerStyle: { elevation: 0, shadowOpacity: 0, backgroundColor: theme.bg, borderBottomWidth: 0 },
    }}>
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: '分类管理' }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={({ route }) => ({ title: route.params.categoryName })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Manrope_600SemiBold', marginBottom: 2, letterSpacing: 0.2 },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          elevation: 0,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="GymTab"
        component={GymStack}
        options={{
          tabBarLabel: '记录',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CategoryTab"
        component={CategoryStack}
        options={{
          tabBarLabel: '分类',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          header: () => null,
          tabBarLabel: '日历',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          header: () => null,
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// NavigationContainer 内部调用 useTheme，需在 ThemeProvider 之内
function AppContent() {
  const { theme, isDark } = useTheme();
  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.accent,
      background: theme.bg,
      card: theme.card,
      text: theme.textPrimary,
      border: theme.border,
      notification: theme.accent,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}

function App() {
  const [session, setSession] = useState(undefined);
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold,
    Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      SplashScreen.hideAsync();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 字体未加载完成或 session 未确定都不渲染，避免闪烁
  if (session === undefined || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {session ? <AppContent /> : <AuthScreen />}
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
