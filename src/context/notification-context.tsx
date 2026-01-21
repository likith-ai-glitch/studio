
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Notification } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface NotificationsContextType {
  notifications: Notification[];
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
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

  const deleteNotification = async (notificationId: string) => {
    const notificationDocRef = doc(db, 'notifications', notificationId);
    try {
      await deleteDoc(notificationDocRef);
      toast({
        title: 'Document Deleted',
        description: 'The document has been permanently deleted.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the document.',
        variant: 'destructive',
      });
    }
  };


  return (
    <NotificationsContext.Provider value={{ notifications, deleteNotification }}>
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
