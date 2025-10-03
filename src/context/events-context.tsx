
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
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
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
        // The toast notification is now triggered by the real-time listener
    } catch (error) {
        console.error("Error logging event: ", error);
    }
  };
  
  // Effect to show toast on new login events
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      // Only show toast for recent events to avoid spam on initial load
      const isRecent = (new Date().getTime() - latestEvent.timestamp.getTime()) < 5000;
      if (latestEvent.type === 'login' && isRecent) {
        toast({
          title: "User Logged In",
          description: `${latestEvent.userEmail} just signed in.`,
        });
      }
    }
  }, [events, toast]);


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
