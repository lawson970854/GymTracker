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
import AuthScreen from './src/screens/AuthScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
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
import { LocaleProvider } from './src/i18n/LocaleContext';
import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function GymStack() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{
      headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17 },
      headerTintColor: theme.accent,
      headerStyle: { elevation: 0, shadowOpacity: 0, backgroundColor: theme.bg, borderBottomWidth: 0 },
    }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: t('nav.homeTitle') }} />
      <Stack.Screen name="Gym" component={GymScreen} options={({ route }) => ({ title: route.params.gymName })} />
      <Stack.Screen name="Machine" component={MachineScreen} options={({ route }) => ({ title: route.params.machineName })} />
    </Stack.Navigator>
  );
}

function CategoryStack() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{
      headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17 },
      headerTintColor: theme.accent,
      headerStyle: { elevation: 0, shadowOpacity: 0, backgroundColor: theme.bg, borderBottomWidth: 0 },
    }}>
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: t('nav.categoryListTitle') }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={({ route }) => ({ title: route.params.categoryName })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const { t } = useTranslation();
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
          tabBarLabel: t('nav.recordTab'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CategoryTab"
        component={CategoryStack}
        options={{
          tabBarLabel: t('nav.categoryTab'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          header: () => null,
          tabBarLabel: t('nav.calendarTab'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          header: () => null,
          tabBarLabel: t('nav.profileTab'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const RootStack = createStackNavigator();

// NavigationContainer 内部调用 useTheme，需在 ThemeProvider 之内
function AppContent({ navRef, openAuthOnReady }) {
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
    <NavigationContainer
      ref={navRef}
      theme={navTheme}
      onReady={() => {
        // 欢迎页选了「登录」时，主界面挂载后立刻把登录页盖上来。
        // 这样返回栈里下面压着主界面，关闭 modal 就自然回到它。
        if (openAuthOnReady) navRef.navigate('Auth');
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Auth" options={{ presentation: 'modal' }}>
          {({ navigation }) => <AuthScreen onSkip={() => navigation.goBack()} />}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// 本地数据上云期间盖一层，避免用户在数据搬一半时操作
function MigratingOverlay() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.bg,
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={{ color: theme.textMuted, fontFamily: 'Manrope_600SemiBold', fontSize: 14 }}>
        {t('app.migrating')}
      </Text>
    </View>
  );
}

// 首次启动的存储方式选择只问一次，选过就记住。
const WELCOME_SEEN_KEY = '@gymtracker:welcomeSeen';

function App() {
  const navRef = useNavigationContainerRef();
  const [session, setSession] = useState(undefined);
  // 欢迎页选了「登录」：导航器还没挂载，先记下来，onReady 时再打开登录页
  const [openAuthOnReady, setOpenAuthOnReady] = useState(false);
  // undefined = 还没读出来，和「读出来是 false」要区分，否则会闪一下欢迎页
  const [welcomeSeen, setWelcomeSeen] = useState(undefined);
  const [migrating, setMigrating] = useState(false);
  const lastUserIdRef = useRef(undefined);
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold,
    Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });

  // OTA 更新交给 expo-updates 默认行为处理：启动时静默后台下载，下次打开自动生效，
  // 不在启动时强制重载，避免每次打开看到“刷新一下”。

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then(v => setWelcomeSeen(v === '1'))
      .catch(() => setWelcomeSeen(true)); // 读不出来就别挡路，直接进主界面
  }, []);

  const markWelcomeSeen = () => {
    setWelcomeSeen(true);
    AsyncStorage.setItem(WELCOME_SEEN_KEY, '1').catch(() => {});
  };

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
        // 登录成功：如果此刻正停在登录页上，把它关掉回到主界面。
        // 只在确实停在 Auth 上时才 goBack，避免误弹掉别的页面。
        if (navRef.isReady() && navRef.getCurrentRoute()?.name === 'Auth') {
          navRef.goBack();
        }
        // 未登录期间记在本机的数据，登录时搬到云端，不能让用户以为数据没了。
        // onAuthStateChange 回调里不能直接调 supabase.auth.*（会和内部的锁互等），
        // 所以推到下一个事件循环再跑。
        if (wasSignedOut) setTimeout(runMigration, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 字体未加载完成、session 未确定、欢迎页标记未读出，都不渲染，避免闪烁
  if (session === undefined || welcomeSeen === undefined || !fontsLoaded) return null;

  // 首次启动先问一次数据存哪；已登录的用户不问（他们显然已经选过云端）。
  // 欢迎页是一次性闸门，没有「上一页」可回，所以留在导航器外面。
  const showWelcome = !session && !welcomeSeen;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <LocaleProvider>
          <ThemeProvider>
            {showWelcome ? (
              <WelcomeScreen
                onChooseCloud={() => { setOpenAuthOnReady(true); markWelcomeSeen(); }}
                onChooseLocal={markWelcomeSeen}
              />
            ) : (
              <AppContent navRef={navRef} openAuthOnReady={openAuthOnReady} />
            )}
            {migrating && <MigratingOverlay />}
          </ThemeProvider>
        </LocaleProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
