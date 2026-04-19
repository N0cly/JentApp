// src/components/AnimatedListItem.tsx
// Wrapper pour animer l'apparition des items dans les listes (FadeIn + SlideUp)
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface Props {
    index: number;         // Position dans la liste (pour le décalage stagger)
    children: React.ReactNode;
    delay?: number;        // Délai de base (ms) entre chaque item
}

export function AnimatedListItem({ index, children, delay = 60 }: Props) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        const animation = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 350,
                delay: index * delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                delay: index * delay,
                tension: 70,
                friction: 12,
                useNativeDriver: true,
            }),
        ]);
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
}
