
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { AppEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';


interface EventsContextType {
  events: AppEvent[];
  logEvent: (event: Omit<AppEvent, 'id' | 'timestamp'>) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const { toast } = useToast();
  const eventsCollectionRef = collection(db, 'events');

  useEffect(() => {
    const q = query(eventsCollectionRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp.toDate(),
          } as AppEvent
      });
      setEvents(eventsData);
    });
    return () => unsubscribe();
  }, []);

  const logEvent = async (eventData: Omit<AppEvent, 'id' | 'timestamp'>) => {
    try {
        await addDoc(eventsCollectionRef, {
            ...eventData,
            timestamp: serverTimestamp(),
        });
        if (eventData.type === 'login') {
           toast({
            title: "User Logged In",
            description: `${eventData.userEmail} just signed in.`,
          });
        }
    } catch (error) {
        console.error("Error logging event: ", error);
    }
  };

  return (
    <EventsContext.Provider value={{ events, logEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
