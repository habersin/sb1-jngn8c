import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBeR9kWYubqLowDKx7TnOccZOt7pV0yjRE",
  authDomain: "habersin-9c3a0.firebaseapp.com",
  projectId: "habersin-9c3a0",
  storageBucket: "habersin-9c3a0.appspot.com",
  messagingSenderId: "977893343019",
  appId: "1:977893343019:web:9861ebf9e3aa9bf4670f6e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const initializeNotifications = async (userId) => {
  if (!userId) return;
  
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(notificationsRef, {
        userId,
        message: 'Bildirim sistemi başlatıldı',
        read: false,
        createdAt: new Date(),
        type: 'system'
      });
    }
  } catch (error) {
    console.error('Bildirim sistemi başlatılırken hata:', error);
  }
};