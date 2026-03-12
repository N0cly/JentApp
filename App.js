import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer theme={DarkTheme}>
          <TabNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </GestureHandlerRootView>
  );
}