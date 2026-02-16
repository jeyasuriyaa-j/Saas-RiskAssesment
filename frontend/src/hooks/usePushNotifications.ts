import { useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'BHiifKQQDJNU1Gd-37xMFrUXw8uHLfoCIUHDk57gdE-YlHPGSgrTcAqpeXsboREGhTZFWYDGJAqONsrDcwQWvSE';

export function usePushNotifications() {
    const { user } = useAuth();

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = useCallback(async () => {
        try {
            if (!('serviceWorker' in navigator)) return;

            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) return;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send subscription to server
            await axios.post('/api/v1/notifications/subscribe', {
                subscription
            });

            console.log('Push notification subscription successful');
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
        }
    }, []);

    useEffect(() => {
        if (user && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                subscribeToPush();
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        subscribeToPush();
                    }
                });
            }
        }
    }, [user, subscribeToPush]);

    return { subscribeToPush };
}
