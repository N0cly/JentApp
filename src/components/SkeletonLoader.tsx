// src/components/SkeletonLoader.tsx
// Placeholder animé (effet shimmer) pendant les chargements
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

// ── Bloc shimmer générique ─────────────────────────────────
export function SkeletonBlock({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: '#1e1e1e', opacity },
                style,
            ]}
        />
    );
}

// ── Skeleton d'une carte de pari ──────────────────────────
export function BetCardSkeleton() {
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.row}>
                <SkeletonBlock width={70} height={22} borderRadius={10} />
                <SkeletonBlock width={90} height={22} borderRadius={10} />
            </View>
            {/* Question */}
            <SkeletonBlock height={18} borderRadius={8} style={{ marginTop: 14 }} />
            <SkeletonBlock width="70%" height={18} borderRadius={8} style={{ marginTop: 8 }} />
            {/* Options */}
            <SkeletonBlock height={52} borderRadius={14} style={{ marginTop: 18 }} />
            <SkeletonBlock height={52} borderRadius={14} style={{ marginTop: 10 }} />
        </View>
    );
}

// ── Skeleton d'une ligne de classement ───────────────────
export function LeaderRowSkeleton() {
    return (
        <View style={styles.leaderRow}>
            <SkeletonBlock width={32} height={32} borderRadius={16} />
            <SkeletonBlock width={120} height={18} borderRadius={8} style={{ marginLeft: 12 }} />
            <SkeletonBlock width={60} height={18} borderRadius={8} style={{ marginLeft: 'auto' as any }} />
        </View>
    );
}

// ── Skeleton d'une ligne d'historique ────────────────────
export function HistoryRowSkeleton() {
    return (
        <View style={styles.historyRow}>
            <SkeletonBlock width={40} height={40} borderRadius={12} />
            <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                <SkeletonBlock height={14} borderRadius={6} />
                <SkeletonBlock width="60%" height={12} borderRadius={6} />
            </View>
            <SkeletonBlock width={50} height={24} borderRadius={8} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    leaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
    },
});
