// src/components/AppUpdateBanner.tsx
// Pure UI component. Logic lives in App.js (useEffect with Realtime subscription).

import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';

interface Props {
    visible: boolean;
}

export function AppUpdateBanner({ visible }: Props) {
    const slideAnim = useRef(new Animated.Value(-80)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : -80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, [visible]);

    const handleReload = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.reload();
        } else {
            Alert.alert(
                'Mise à jour disponible',
                'Relance l\'application pour obtenir la dernière version.',
                [{ text: 'OK' }]
            );
        }
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.bannerText}>🚀 Mise à jour disponible !</Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={handleReload}>
                <Text style={styles.reloadText}>Recharger</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#FFD700',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 10,
    },
    bannerText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 13,
        flex: 1,
    },
    reloadBtn: {
        backgroundColor: '#000',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 10,
    },
    reloadText: {
        color: '#FFD700',
        fontWeight: '900',
        fontSize: 12,
    },
});
