
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Notification } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface NotificationsContextType {
  notifications: Notification[];
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsCollectionRef = collection(db, 'notifications');

  useEffect(() => {
    const q = query(notificationsCollectionRef, orderBy('sentAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            sentAt: data.sentAt ? data.sentAt.toDate() : new Date(),
          } as Notification
      });
      setNotifications(notificationsData);
    });
    return () => unsubscribe();
  }, [notificationsCollectionRef]);


  return (
    <NotificationsContext.Provider value={{ notifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
