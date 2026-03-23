// App.tsx
import { useUserStore } from './src/features/user/store/useUserStore';
import LoginScreen from './src/features/user/screens/LoginScreen';
import {DarkTheme, NavigationContainer} from "@react-navigation/native";
import {TabNavigator} from "./src/navigation/TabNavigator";
import {StatusBar} from "expo-status-bar";
import React, {useEffect} from "react";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {supabase} from "./src/lib/supabase";
import NotificationHandler from "./src/components/NotificationHandler";


export default function App() {
    const username = useUserStore((state) => state.username);

    // Dans un useEffect global
    const { userId } = useUserStore();

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`realtime:profile:${userId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                (payload) => {
                    useUserStore.setState({
                        inventory: {
                            clopes: payload.new.clopes,
                            joints: payload.new.joints,
                            packets: payload.new.packets
                        }
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    // SI PAS DE PSEUDO -> ÉCRAN LOGIN
    if (!username) {
        return (
            <><LoginScreen/><StatusBar style="light"/></>
        );
    }

    // SI PSEUDO -> TON APP NORMALE
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NotificationHandler />
            <NavigationContainer >
                <TabNavigator />
                <StatusBar style="light" />
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}