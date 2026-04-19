// src/contexts/ToastContext.tsx
// Système de notifications toast — remplace tous les alert() de l'app
import React, {
    createContext, useCallback, useContext,
    useEffect, useRef, useState
} from 'react';
import {
    Animated, Platform, StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Types ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    anim: Animated.Value;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ── Config visuelle ────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { color: string; bg: string; icon: string }> = {
    success: { color: '#4CAF50', bg: 'rgba(29,185,84,0.12)',  icon: 'checkmark-circle' },
    error:   { color: '#E50914', bg: 'rgba(229,9,20,0.12)',   icon: 'close-circle' },
    warning: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',  icon: 'warning' },
    info:    { color: '#64B5F6', bg: 'rgba(100,181,246,0.12)',icon: 'information-circle' },
};

const DURATION = 3500;    // ms avant disparition
const ANIM_DURATION = 280; // ms pour l'animation

// ── Provider ──────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++counter.current;
        const anim = new Animated.Value(0);

        setToasts(prev => [...prev, { id, message, type, anim }]);

        // Entrée
        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();

        // Auto-dismiss
        setTimeout(() => {
            Animated.timing(anim, {
                toValue: 0,
                duration: ANIM_DURATION,
                useNativeDriver: true,
            }).start(() => removeToast(id));
        }, DURATION);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Rendu des toasts au-dessus de tout */}
            <View style={styles.container} pointerEvents="box-none">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => {
                            Animated.timing(toast.anim, {
                                toValue: 0,
                                duration: ANIM_DURATION,
                                useNativeDriver: true,
                            }).start(() => removeToast(toast.id));
                        }}
                    />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

// ── Composant individuel ───────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
    const cfg = TOAST_CONFIG[toast.type];

    const translateY = toast.anim.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
    });
    const opacity = toast.anim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 1, 1],
    });

    return (
        <Animated.View style={[styles.toast, { backgroundColor: cfg.bg, borderColor: cfg.color, opacity, transform: [{ translateY }] }]}>
            <Ionicons name={cfg.icon as any} size={20} color={cfg.color} style={{ marginRight: 10 }} />
            <Text style={[styles.message, { color: '#fff', flex: 1 }]} numberOfLines={3}>
                {toast.message}
            </Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={16} color="#555" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'web' ? 32 : 100,
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 10,
        alignItems: 'stretch',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    } as any,
    message: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
});
