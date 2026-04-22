// App.tsx
import { useUserStore } from './src/features/user/store/useUserStore';
import LoginScreen from './src/features/user/screens/LoginScreen';
import ResetPasswordScreen from './src/features/user/screens/ResetPasswordScreen';
import {DarkTheme, NavigationContainer} from "@react-navigation/native";
import {TabNavigator} from "./src/navigation/TabNavigator";
import {StatusBar} from "expo-status-bar";
import React, {useEffect, useState} from "react";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {supabase} from "./src/lib/supabase";
import NotificationHandler from "./src/components/NotificationHandler";
import { Platform } from 'react-native';
import { ToastProvider } from './src/contexts/ToastContext';
import { PWAInstallBanner } from './src/components/PWAInstallBanner';
import {AppUpdateBanner, getStoredVersion} from './src/components/AppUpdateBanner';

// STYLE PRIME
import "primereact/resources/themes/lara-dark-amber/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import { PrimeReactProvider } from 'primereact/api';

// ── Détection du deep link de réinitialisation de mot de passe ──
// Supabase redirige vers : /reset-password#access_token=xxx&type=recovery
function detectPasswordReset() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const hash = window.location.hash;
    return hash.includes('type=recovery') || hash.includes('access_token') &&
           window.location.pathname.includes('reset-password');
}

const APP_VERSION_STORAGE_KEY = 'jent_app_version';

function getLocalVersion() {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
    return localStorage.getItem(APP_VERSION_STORAGE_KEY);
}

function setLocalVersion(v) {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
    localStorage.setItem(APP_VERSION_STORAGE_KEY, v);
}

export default function App() {
    const username = useUserStore((state) => state.username);
    const initStorage = useUserStore((state) => state.initStorage);
    const { userId } = useUserStore();

    // Détecte si on est sur la page de reset (deep link email)
    const [isResetMode, setIsResetMode] = useState(() => detectPasswordReset());

    // ── Vérification de version PWA ───────────────────────────────────────────
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        // 1. Vérification au démarrage
        const checkVersion = async () => {
            const { data } = await supabase
                .from('app_config')
                .select('value')
                .eq('key', 'app_version')
                .single();
            if (!data?.value) return;
            const remote = data.value;
            const local = getLocalVersion();
            if (local === null) {
                setLocalVersion(remote); // premier lancement, juste stocker
            } else if (local !== remote) {
                setLocalVersion(remote);
                setUpdateAvailable(true);
            }
        };
        void checkVersion();

        // 2. Écoute Realtime — se déclenche dès que l'admin bump la version
        const channel = supabase
            .channel('app_version_realtime')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_config', filter: 'key=eq.app_version' },
                (payload) => {
                    const remote = payload.new?.value;
                    if (!remote) return;
                    const local = getLocalVersion();
                    if (local !== remote) {
                        setLocalVersion(remote);
                        setUpdateAvailable(true);
                    }
                }
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        // 1. Charger les données locales (persistance)
        initStorage();

        // 2. Sur web, écouter les changements d'état d'auth Supabase
        //    (Supabase gère automatiquement le token du deep link)
        if (Platform.OS === 'web') {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setIsResetMode(true);
                }
                if (event === 'USER_UPDATED') {
                    setIsResetMode(false);
                    // Nettoyer le hash de l'URL
                    if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
                // Session expirée ou déconnexion forcée
                if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
                    const { username: currentUsername } = useUserStore.getState();
                    if (currentUsername) {
                        useUserStore.getState().logOut();
                    }
                }
            });
            return () => subscription.unsubscribe();
        }
    }, []);

    useEffect(() => {
        // Realtime profil utilisateur
        if (!userId) return;

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
                    useUserStore.setState({
                        inventory: {
                            clopes: payload.new.clopes,
                            joints: payload.new.joints,
                            packets: payload.new.packets
                        }
                    });
                    const state = useUserStore.getState();
                    state._saveToStorage(state);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // ── Écran de réinitialisation du mot de passe (deep link) ──
    if (isResetMode) {
        return (
            <ToastProvider>
                <ResetPasswordScreen onSuccess={() => setIsResetMode(false)} />
                <AppUpdateBanner visible={updateAvailable} />
                <StatusBar style="light" />
            </ToastProvider>
        );
    }

    // ── Écran de connexion ──
    if (!username) {
        return (
            <ToastProvider>
                <LoginScreen />
                <AppUpdateBanner visible={updateAvailable} />
                <StatusBar style="light" />
            </ToastProvider>
        );
    }

    // ── App principale ──
    return (
        <PrimeReactProvider>
            <ToastProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <NotificationHandler />
                    <PWAInstallBanner />
                    <AppUpdateBanner visible={updateAvailable} />
                    <NavigationContainer>
                        <TabNavigator />
                        <StatusBar style="light" />
                    </NavigationContainer>
                </GestureHandlerRootView>
            </ToastProvider>
        </PrimeReactProvider>
    );
}
