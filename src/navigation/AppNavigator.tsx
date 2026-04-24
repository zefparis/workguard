import React from 'react'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Home } from '../screens/Home'
import { Enroll } from '../screens/Enroll'
import { CheckIn } from '../screens/CheckIn'
import type { RootStackParamList } from '../types'

const Stack = createStackNavigator<RootStackParamList>()

const Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#050a14',
    card: '#0b1220',
    primary: '#06b6d4',
    text: '#e8f0ff',
    border: '#1e293b',
  },
}

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={Theme}>
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#050a14' },
        headerTintColor: '#06b6d4',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Enroll" component={Enroll} options={{ title: 'Enroll worker' }} />
      <Stack.Screen name="CheckIn" component={CheckIn} options={{ title: 'Daily check-in' }} />
    </Stack.Navigator>
  </NavigationContainer>
)
