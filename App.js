import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './src/queryClient';
import { supabase } from './src/supabase';
import { hasLocalData, migrateLocalDataToCloud } from './src/storage';
import { hideAuth, isAuthVisible, subscribeAuthVisible } from './src/authGate';
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

// 本地数据上云期间盖一层，避免用户在数据搬一半时操作
function MigratingOverlay() {
  const { theme } = useTheme();
  return (
    <View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.bg,
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={{ color: theme.textMuted, fontFamily: 'Manrope_600SemiBold', fontSize: 14 }}>
        正在把本机数据同步到云端…
      </Text>
    </View>
  );
}

function App() {
  const [session, setSession] = useState(undefined);
  const [authVisible, setAuthVisible] = useState(isAuthVisible);
  const [migrating, setMigrating] = useState(false);
  const lastUserIdRef = useRef(undefined);
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold,
    Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });

  // OTA 更新交给 expo-updates 默认行为处理：启动时静默后台下载，下次打开自动生效，
  // 不在启动时强制重载，避免每次打开看到“刷新一下”。

  useEffect(() => subscribeAuthVisible(setAuthVisible), []);

  // 本机没有待搬的数据就什么都不做，避免已登录用户每次启动都闪一下遮罩
  const runMigration = async () => {
    try {
      if (!(await hasLocalData())) return;
    } catch {
      return;
    }
    setMigrating(true);
    try {
      await migrateLocalDataToCloud();
    } catch {
      // 搬运失败：数据仍在本机，下次登录时重试
    }
    queryClient.invalidateQueries();
    setMigrating(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      lastUserIdRef.current = session?.user?.id ?? null;
      setSession(session);
      SplashScreen.hideAsync();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      // React Query 的缓存是跨账号共享的（同一台设备上），换账号登录时必须清空，
      // 否则会短暂显示上一个账号缓存下来的数据。
      if (userId !== lastUserIdRef.current) {
        queryClient.clear();
      }
      const wasSignedOut = !lastUserIdRef.current;
      lastUserIdRef.current = userId;
      setSession(session);

      if (userId) {
        hideAuth();
        // 未登录期间记在本机的数据，登录时搬到云端，不能让用户以为数据没了。
        // onAuthStateChange 回调里不能直接调 supabase.auth.*（会和内部的锁互等），
        // 所以推到下一个事件循环再跑。
        if (wasSignedOut) setTimeout(runMigration, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 字体未加载完成或 session 未确定都不渲染，避免闪烁
  if (session === undefined || !fontsLoaded) return null;

  // 没有账号也能用：默认直接进主界面，数据存在本机；
  // 只有用户主动点「登录 / 注册」才显示登录页。
  const showAuthScreen = !session && authVisible;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <ThemeProvider>
          {showAuthScreen ? <AuthScreen onSkip={hideAuth} /> : <AppContent />}
          {migrating && <MigratingOverlay />}
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
