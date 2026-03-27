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
    const initStorage = useUserStore((state) => state.initStorage);
    const { userId } = useUserStore();


    useEffect(() => {
        // 1. On charge d'abord les données locales (Persistance)
        // Cette fonction va remplir le userId s'il existe dans le storage
        initStorage();
    }, []); // Une seule fois au montage de l'app

    useEffect(() => {
        // 2. Si on n'a pas encore de userId (pas encore chargé ou pas connecté), on s'arrête là
        if (!userId) return;

        // 3. On lance le Realtime seulement quand le userId est connu
        const channel = supabase
            .channel(`realtime:profile:${userId}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    // On met à jour le store avec les nouvelles valeurs de la DB
                    useUserStore.setState({
                        inventory: {
                            clopes: payload.new.clopes,
                            joints: payload.new.joints,
                            packets: payload.new.packets
                        }
                    });
                    // OPTIONNEL : On sauvegarde aussi dans le storage local après l'update realtime
                    // pour que le refresh soit toujours à jour
                    const state = useUserStore.getState();
                    state._saveToStorage(state);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]); // Se redéclenche dès que userId change (ex: après initStorage ou login)
    // SI PAS DE PSEUDO -> ÉCRAN LOGIN
    if (!username) {
        return (
            <><LoginScreen/><StatusBar style="light"/></>
        );
    }

    // SI PSEUDO -> TON APP NORMALE
    return (
        <GestureHandlerRootView style={{ flex: 1}}>
            <NotificationHandler />
            <NavigationContainer >
                <TabNavigator />
                <StatusBar style="light" />
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}