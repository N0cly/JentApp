// src/components/PWAInstallBanner.tsx
// Bannière d'installation PWA — apparaît quand le navigateur supporte l'installation
// Utilise l'événement natif `beforeinstallprompt` (Chrome/Edge/Android)
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function PWAInstallBanner() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const slideAnim = new Animated.Value(-120);

    useEffect(() => {
        // Uniquement sur le web
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        // Vérifier si déjà installée (standalone mode = déjà lancée comme app)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) return;

        // Vérifier si déjà refusé dans cette session
        const wasDismissed = sessionStorage.getItem('pwa-banner-dismissed');
        if (wasDismissed) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler as any);
        return () => window.removeEventListener('beforeinstallprompt', handler as any);
    }, []);

    useEffect(() => {
        if (visible && !dismissed) {
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 70,
                friction: 12,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setVisible(false);
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        Animated.timing(slideAnim, {
            toValue: -120,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            setDismissed(true);
        });
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('pwa-banner-dismissed', '1');
        }
    };

    if (!visible || dismissed || Platform.OS !== 'web') return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.iconBox}>
                <Text style={{ fontSize: 26 }}>🚬</Text>
            </View>
            <View style={styles.textBox}>
                <Text style={styles.title}>Installer JentApp</Text>
                <Text style={styles.subtitle}>Accès rapide depuis ton écran d'accueil</Text>
            </View>
            <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
                <Text style={styles.installText}>Installer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#555" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderBottomWidth: 1,
        borderBottomColor: '#FFD70044',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        zIndex: 9998,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    textBox: { flex: 1 },
    title: { color: '#fff', fontWeight: '800', fontSize: 14 },
    subtitle: { color: '#666', fontSize: 12, marginTop: 2 },
    installBtn: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    installText: { color: '#000', fontWeight: '900', fontSize: 13 },
    closeBtn: { padding: 4 },
});
