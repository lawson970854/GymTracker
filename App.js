import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HEADER = {
  headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
  headerTitleStyle: { fontWeight: '600', fontSize: 18 },
  headerTintColor: '#1D9E75',
  cardStyle: { backgroundColor: '#F7F7F7' },
};

function GymStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '健身记录' }} />
      <Stack.Screen name="Gym" component={GymScreen} options={({ route }) => ({ title: route.params.gymName })} />
      <Stack.Screen name="Machine" component={MachineScreen} options={({ route }) => ({ title: route.params.machineName })} />
    </Stack.Navigator>
  );
}

function CategoryStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: '分类管理' }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={({ route }) => ({ title: route.params.categoryName })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#1D9E75',
        tabBarInactiveTintColor: '#C0C0C0',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#EBEBEB',
          height: 54,
        },
      }}
    >
      <Tab.Screen
        name="GymTab"
        component={GymStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CategoryTab"
        component={CategoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          header: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          header: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
