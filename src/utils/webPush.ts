// ============================================================
// JentApp — Utilitaires Web Push (PWA)
// ============================================================

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Convertit une clé VAPID base64url en Uint8Array
 * (format requis par l'API pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Enregistre le Service Worker et attend qu'il soit prêt.
 * Retourne l'enregistrement ou null si non supporté.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[WebPush] Service Workers non supportés sur ce navigateur.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    console.log('[WebPush] Service Worker enregistré avec succès.');
    return registration;
  } catch (error) {
    console.error('[WebPush] Échec enregistrement Service Worker:', error);
    return null;
  }
}

/**
 * Abonne l'utilisateur aux notifications push.
 * Récupère l'abonnement existant s'il existe déjà.
 * Retourne la PushSubscription ou null en cas d'échec.
 */
export async function subscribeUserToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[WebPush] EXPO_PUBLIC_VAPID_PUBLIC_KEY manquante dans le .env');
    return null;
  }
  try {
    // Réutiliser l'abonnement existant si disponible
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log('[WebPush] Abonnement push existant récupéré.');
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log('[WebPush] Nouvel abonnement push créé.');
    return subscription;
  } catch (error) {
    console.error('[WebPush] Échec abonnement push:', error);
    return null;
  }
}

/**
 * Vérifie si les notifications push sont supportées et activées.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
