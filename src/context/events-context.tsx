
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { AppEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface EventsContextType {
  events: AppEvent[];
  logEvent: (event: Omit<AppEvent, 'id' | 'timestamp'>) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const { toast } = useToast();

  const logEvent = (eventData: Omit<AppEvent, 'id' | 'timestamp'>) => {
    const newEvent: AppEvent = {
      ...eventData,
      id: Date.now(),
      timestamp: new Date(),
    };
    
    setEvents((prevEvents) => [...prevEvents, newEvent]);
    
    if (eventData.type === 'login') {
       toast({
        title: "User Logged In",
        description: `${eventData.userEmail} just signed in.`,
      });
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
