"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CinemaFilter } from '@/components/CinemaFilter';
import { EventCard } from '@/components/EventCard';
import { EventModal } from '@/components/EventModal';
import { TrendingSection } from '@/components/TrendingSection';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Event } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// API Key removed for now as AI features are postponed

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Force scroll to top on refresh
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

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
        }
      } catch (err) {
        console.error('Failed to load live data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Sort events:
  // 1. Group by Status: Active -> Upcoming -> Ended
  // 2. Sort by Date: Ascending (Earliest start date first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Helper to parse start date
      const getStartDate = (period: string) => {
        if (!period) return 9999999999999;
        const match = period.match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
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
        if (event.status === '예정') return 1; 

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

        if (now < start) {
           // If Start Date is in the future, normally it's Upcoming (1)
           // BUT if the date is "Invalid/Far Future" (9999...) AND status is NOT Explicitly '예정'
           // We assume it's an Active event with missing date info -> Keep in Active (0)
           if (start > 9000000000000 && event.status !== '예정') {
             return 0;
           }
           return 1; // Upcoming
        }
        return 0; // Active
      };

      const aPriority = getStatusPriority(a, aStart);
      const bPriority = getStatusPriority(b, bStart);

      // 1. Sort by Status Priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 2. Sort by Start Date (Earliest first) - User explicit request
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

      <main className="max-w-6xl mx-auto px-4 py-8 min-h-[80vh]">
        {/* Trending Section (D-Day ~ D-3) */}
        <TrendingSection events={events} onEventClick={setSelectedEvent} isLoading={isLoading} />

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>

            <h2 className="text-2xl font-bold tracking-tight">
              Cinema Goods
              {isLoading && <span className="ml-4 text-sm font-normal text-neutral-500 animate-pulse">Syncing...</span>}
            </h2>
            <p className="text-neutral-400 mt-1">영화관 3사의 굿즈를 한눈에 모아보세요.</p>
          </div>
          
          <CinemaFilter 
            filter={filter} 
            setFilter={setFilter} 
            className="w-full md:w-auto mb-0 justify-start md:justify-end" 
          />
        </div>

        {/* Poster Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredEvents.map((event, index) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={setSelectedEvent} 
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-500">
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </main>

      <ScrollToTop />

      {/* Detail Modal */}
      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          closeModal={() => setSelectedEvent(null)} 
        />
      )}

      <footer className="py-8 text-center text-neutral-800 text-xs">
         MOG v1.5 (2024.03 Update)
      </footer>
    </div>
  );
}
