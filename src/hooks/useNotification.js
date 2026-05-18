import { useCallback, useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const FCM_TOKEN_KEY = 'fcm_token';

export function useNotification() {
  const [permission, setPermission] = useState(() => Notification.permission);
  const [fcmToken, setFcmToken] = useState(() => localStorage.getItem(FCM_TOKEN_KEY));

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      const data = payload.data ?? {};
      const title = data.title || 'Reminder';
      const options = {
        body: data.body || 'Tap to open your saved link',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data,
        tag: data.id,
        requireInteraction: true,
      };

      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      try {
        const swReg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });
        if (token) {
          localStorage.setItem(FCM_TOKEN_KEY, token);
          setFcmToken(token);
        }
      } catch (err) {
        console.error('Failed to get FCM token:', err);
      }
    }

    return result;
  }, []);

  const ensureFcmToken = useCallback(async () => {
    const stored = localStorage.getItem(FCM_TOKEN_KEY);
    if (stored) return stored;

    try {
      const swReg = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      if (token) {
        localStorage.setItem(FCM_TOKEN_KEY, token);
        setFcmToken(token);
        return token;
      }
    } catch (err) {
      console.error('Failed to get FCM token:', err);
    }
    return null;
  }, []);

  return { permission, requestPermission, fcmToken, ensureFcmToken };
}