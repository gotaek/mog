"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CinemaFilter } from '@/components/CinemaFilter';
import { EventCard } from '@/components/EventCard';
import { EventModal } from '@/components/EventModal';
import { Event } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// API Key removed for now as AI features are postponed

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);

  useEffect(() => {
    // Attempt to fetch from Supabase if configured
    const fetchEvents = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            cinemas (name)
          `)
          .eq('is_visible', true); // Only show approved events

        if (error) {
          console.error('Supabase fetch error:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform Supabase data to match Event interface
          // Note: In a real app we would align types perfectly
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedEvents: Event[] = data.map((item: any) => ({
            id: item.id,
            title: item.event_title || item.title || 'Untitled Event', // Fallback to item.title if event_title is missing (migration issue)
            cinema: item.cinemas?.name || 'Unknown',
            goodsType: item.goods_type || 'Unknown',
            period: item.period || '', // Ensure string
            imageUrl: item.image_url || '',
            locations: item.locations || [],
            officialUrl: item.official_url || '',
            status: item.status || '진행중'
          }));
          setEvents(mappedEvents);
          setIsLiveMode(true);
        }
      } catch (err) {
        console.error('Failed to load live data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Sort events: Latest start date first
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Helper to parse start date
      const getStartDate = (period: string) => {
        if (!period) return 0;
        const match = period.match(/(\d{4}\.\d{2}\.\d{2})/);
        if (match) {
          const [y, m, d] = match[0].split('.').map(Number);
          return new Date(y, m - 1, d).getTime();
        }
        return 9999999999999; // Far future for unknown dates
      };

      const now = new Date().getTime();
      const aStart = getStartDate(a.period);
      const bStart = getStartDate(b.period);
      
      // Helper to calculate status priority
      // 0: Active (started <= now < ended)
      // 1: Upcoming (now < started)
      // 2: Ended
      const getStatusPriority = (event: Event, start: number) => {
        if (event.status === '종료') return 2;
        
        // Check if ended by date
        if (event.period && event.period.includes('~')) {
            const endDateString = event.period.split('~')[1]?.trim();
            if (endDateString && !endDateString.includes('소진')) {
                const dateParts = endDateString.split('.');
                if (dateParts.length === 3) {
                   const end = new Date(
                     parseInt(dateParts[0]), 
                     parseInt(dateParts[1]) - 1, 
                     parseInt(dateParts[2])
                   );
                   end.setHours(23, 59, 59, 999);
                   if (now > end.getTime()) return 2; // Ended by date
                }
            }
        }

        if (now < start) return 1; // Upcoming
        return 0; // Active
      };

      const aPriority = getStatusPriority(a, aStart);
      const bPriority = getStatusPriority(b, bStart);

      // 1. Sort by Status Priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 2. Sort by Start Date (Earliest first)
      return aStart - bStart;
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(event => {
      const matchFilter = filter === '전체' || event.cinema === filter;
      const matchSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.goodsType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [sortedEvents, filter, searchQuery]);

  return (
    <div className="min-h-screen">
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <CinemaFilter filter={filter} setFilter={setFilter} />

        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Now Showing</span>
                </div>
            </div>
            <h2 className="text-3xl font-bold italic tracking-tight uppercase">
              Live Goods Feed
              {isLoading && <span className="ml-4 text-sm font-normal text-neutral-500 animate-pulse">Syncing...</span>}
            </h2>
            <p className="text-neutral-400 mt-1">영화관별 공식 굿즈 정보를 확인하세요.</p>
          </div>

        </div>

        {/* Poster Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onClick={setSelectedEvent} 
            />
          ))}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          closeModal={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
}
