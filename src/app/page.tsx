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
          `); // Joins are powerful in Supabase

        if (error) {
          console.error('Supabase fetch error:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform Supabase data to match Event interface
          // Note: In a real app we would align types perfectly
          const mappedEvents: Event[] = data.map((item: {
             id: number;
             event_title?: string; // Optional because it might not exist in old schema
             title?: string; // Fallback
             cinemas: { name: string } | null; // Joined table
             goods_type: string;
             period: string;
             image_url: string;
             locations: string[];
             official_url: string;
             status: string;
          }) => ({
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
      const getStartDate = (period: string) => {
        if (!period) return 0;
        // Extract first date "2024.03.01" from "2024.03.01 ~ ..."
        const match = period.match(/(\d{4}\.\d{2}\.\d{2})/);
        if (match) {
          const [y, m, d] = match[0].split('.').map(Number);
          return new Date(y, m - 1, d).getTime();
        }
        return 0; // Fallback for unknown dates
      };
      return getStartDate(b.period) - getStartDate(a.period);
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
            <p className="text-neutral-400 mt-1">실시간으로 업데이트되는 영화관별 공식 굿즈 정보를 확인하세요.</p>
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
