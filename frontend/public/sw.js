/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Push received:', data);

    const title = data.notification.title || 'Risk Alert';
    const options = {
        body: data.notification.body,
        icon: data.notification.icon || '/logo192.png',
        badge: data.notification.badge || '/logo192.png',
        data: data.notification.data || {},
        actions: [
            { action: 'view', title: 'View Detail' },
            { action: 'close', title: 'Close' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const riskId = event.notification.data?.riskId;
    const urlToOpen = riskId ? `/risks?riskId=${riskId}` : '/dashboard';

    if (event.action === 'close') return;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If window already open, focus it
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
