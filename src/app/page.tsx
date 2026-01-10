"use client";

import React, { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { EventCard } from '@/components/EventCard';
import { EventModal } from '@/components/EventModal';
import { INITIAL_EVENTS } from '@/data/mock';
import { Event } from '@/types';

// API Key should ideally come from env vars, but for this prototype we'll keep it empty/configurable
const API_KEY = ""; // TODO: Use process.env.NEXT_PUBLIC_GEMINI_API_KEY

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    return INITIAL_EVENTS.filter(event => {
      const matchFilter = filter === '전체' || event.cinema === filter;
      const matchSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.goodsType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [filter, searchQuery]);

  return (
    <div className="min-h-screen">
      <Header 
        filter={filter} 
        setFilter={setFilter} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Powered by Gemini AI</span>
            </div>
            <h2 className="text-3xl font-bold italic tracking-tight uppercase">Live Goods Feed</h2>
            <p className="text-neutral-400 mt-1">실시간으로 업데이트되는 영화관별 공식 굿즈 정보를 확인하세요.</p>
          </div>
          <div className="text-sm text-neutral-500 font-mono">
            TOTAL: {filteredEvents.length}
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
          apiKey={API_KEY}
        />
      )}
    </div>
  );
}
