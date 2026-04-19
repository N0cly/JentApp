// ============================================================
// JentApp — NotificationHandler
// Gestion centralisée des notifications (in-app + Web Push PWA)
// ============================================================

import React, { useEffect } from 'react';
import { Alert, Platform, Vibration } from 'react-native';
import { supabase } from '../lib/supabase';
import { isPushSupported, registerServiceWorker, subscribeUserToPush } from '../utils/webPush';
import { useUserStore } from '../features/user/store/useUserStore';

export default function NotificationHandler() {
  const { userId } = useUserStore();

  // ── Setup Web Push (PWA uniquement) ──────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isPushSupported()) return;
    if (!userId) return;

    setupWebPush(userId);
  }, [userId]);

  // ── Listener Realtime (notifications in-app mobile natif) ─
  useEffect(() => {
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const { title, message } = payload.new as { title: string; message: string };

          // Sur mobile natif : vibration + alerte
          if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 100, 100, 100]);
            Alert.alert(title, message);
          }
          // Sur web : la notification est déjà envoyée en push
          // depuis useBetStore via la Edge Function
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // Composant invisible
}

// ── Initialisation de l'abonnement Web Push ───────────────
async function setupWebPush(userId: string) {
  try {
    // 1. Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Permission refusée par l\'utilisateur.');
      return;
    }

    // 2. Enregistrer le Service Worker
    const registration = await registerServiceWorker();
    if (!registration) return;

    // 3. Créer ou récupérer l'abonnement push
    const subscription = await subscribeUserToPush(registration);
    if (!subscription) return;

    // 4. Sauvegarder l'abonnement dans Supabase
    const subJSON = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[WebPush] Erreur sauvegarde abonnement:', error.message);
    } else {
      console.log('[WebPush] Abonnement sauvegardé pour', userId);
    }
  } catch (err) {
    console.error('[WebPush] Erreur setup:', err);
  }
}
