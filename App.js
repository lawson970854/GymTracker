import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import GymScreen from './src/screens/GymScreen';
import MachineScreen from './src/screens/MachineScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import TrendsScreen from './src/screens/TrendsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerTintColor: '#1D9E75',
          cardStyle: { backgroundColor: '#F7F7F7' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '我的健身记录' }} />
        <Stack.Screen name="Gym" component={GymScreen} options={({ route }) => ({ title: route.params.gymName })} />
        <Stack.Screen name="Machine" component={MachineScreen} options={({ route }) => ({ title: route.params.machineName })} />
        <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: '日期查看' }} />
        <Stack.Screen name="Trends" component={TrendsScreen} options={{ title: '整体趋势' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
