// App.tsx
import { useUserStore } from './src/features/user/store/useUserStore';
import LoginScreen from './src/features/user/screens/LoginScreen';
import {DarkTheme, NavigationContainer} from "@react-navigation/native";
import {TabNavigator} from "./src/navigation/TabNavigator";
import {StatusBar} from "expo-status-bar";
import React from "react";
import {GestureHandlerRootView} from "react-native-gesture-handler";

export default function App() {
    const username = useUserStore((state) => state.username);

    // SI PAS DE PSEUDO -> ÉCRAN LOGIN
    if (!username) {
        return <LoginScreen />;
    }

    // SI PSEUDO -> TON APP NORMALE
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer theme={DarkTheme}>
                <TabNavigator />
                <StatusBar style="light" />
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}