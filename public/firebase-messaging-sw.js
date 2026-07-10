// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with Life OS project config
firebase.initializeApp({
  apiKey: "AIzaSyCiyyZNqnelPBIyFCstHZ80hvgn1at1Gow",
  authDomain: "lifeosca.firebaseapp.com",
  databaseURL: "https://lifeosca-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifeosca",
  storageBucket: "lifeosca.firebasestorage.app",
  messagingSenderId: "432934819080",
  appId: "1:432934819080:web:4e951a330c742a5abcc8bd",
  measurementId: "G-V8W5Z3N2P9"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Life OS Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'Deepa AI has sent you a productivity nudge!',
    icon: payload.notification?.icon || 'https://api.dicebear.com/7.x/bottts/svg?seed=LifeOS',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
