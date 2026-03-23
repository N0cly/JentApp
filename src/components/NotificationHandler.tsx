// src/components/NotificationHandler.tsx
import React, { useEffect } from 'react';
import { Alert, Vibration } from 'react-native';
import { supabase } from '../lib/supabase';

export default function NotificationHandler() {
    useEffect(() => {
        const channel = supabase
            .channel('global-notifications')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const { title, message } = payload.new;

                    // 1. Faire vibrer le téléphone (Pattern: 100ms vibre, 100ms pause, 100ms vibre)
                    Vibration.vibrate([0, 100, 100, 100]);

                    // 2. Afficher l'alerte
                    Alert.alert(title, message);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return null; // Composant invisible
}