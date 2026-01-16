import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Event } from '@/types';
import { EventCard } from './EventCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TrendingSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  isLoading?: boolean;
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({ events, onEventClick, isLoading = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Filter for D-Day to D-3
  const trendingEvents = useMemo(() => {
    if (isLoading) return []; // Return empty if loading
    return events.filter(event => {
      // Logic copied from EventCard sort/display logic for consistency
      // Calculate Diff
      if (!event.period) return false;
      const parts = event.period.split('~');
      const startDateString = parts[0].trim();
      const match = startDateString.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      
      if (match) {
        const y = parseInt(match[1]);
        const m = parseInt(match[2]) - 1;
        const d = parseInt(match[3]);
        
        const start = new Date(y, m, d);
        start.setHours(0, 0, 0, 0);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const diffTime = start.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Include D-Day (0) to D-3 (3)
        return diffDays >= 0 && diffDays <= 3;
      }
      return false;
    }).sort((a, b) => {
        // Sort by soonest (active/D-Day) first
       const getStartDate = (period: string) => {
        if (!period) return 9999999999999;
        const match = period.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
        if (match) {
          const [y, m, d] = match[0].split('.').map(Number);
          return new Date(y, m - 1, d).getTime();
        }
        return 9999999999999; 
      };
      return getStartDate(a.period) - getStartDate(b.period);
    });
  }, [events, isLoading]);

  const handleScroll = () => {
      if (scrollContainerRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
          setShowLeftArrow(scrollLeft > 0);
          setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }
  };

  const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
          // Scroll by ~80% of the screen width to always show a "peek" of the next set
          // This follows standard UX patterns for horizontal lists (Netflix/AppStore style)
          const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
          
          scrollContainerRef.current.scrollBy({
              left: direction === 'left' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
      }
  };

  useEffect(() => {
    handleScroll(); // Check initial state
    const currentRef = scrollContainerRef.current;
    if (currentRef) {
        // We can add logic here if needed, but resize is global
    }
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [trendingEvents]);

  if (!isLoading && trendingEvents.length === 0) return null;

  return (
    <section className="mb-12 relative group">
        {/* Background Atmosphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-red-600/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6 px-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Trending Now</h2>
            <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 mt-1">
                이번 주 놓치면 안 될 굿즈
            </span>
        </div>

        {/* Carousel Container Wrapper */}
        <div className="relative">
            {/* Scroll Buttons - Hide if loading */}
            {!isLoading && showLeftArrow && (
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 shadow-lg transition-all opacity-0 group-hover:opacity-100 -ml-2 md:-ml-4"
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            {!isLoading && showRightArrow && (
                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 shadow-lg transition-all opacity-0 group-hover:opacity-100 -mr-2 md:-mr-4"
                >
                    <ChevronRight size={24} />
                </button>
            )}

            
            {/* Carousel Container */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto py-8 px-4 scroll-smooth snap-x snap-mandatory no-scrollbar items-start gap-4 md:gap-6 relative z-0"
            >
                {isLoading ? (
                    // Skeleton Loading
                    Array.from({ length: 4 }).map((_, i) => (
                         <div 
                            key={i} 
                            className="flex-none w-[200px] md:w-[240px] snap-start"
                        >
                            <div className="aspect-[2/3] w-full bg-neutral-800 rounded-2xl animate-pulse" />
                        </div>
                    ))
                ) : (
                    trendingEvents.map((event, index) => (
                        <div 
                            key={event.id} 
                            className="flex-none w-[200px] md:w-[240px] snap-start transform transition-all duration-500 hover:-translate-y-2"
                        >
                            <div className="relative group/card">
                                {/* Glow Effect for Spotlight */}
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-red-500 to-transparent rounded-2xl opacity-20 group-hover:opacity-50 blur transition duration-500"></div>
                                
                                <EventCard 
                                    event={event} 
                                    onClick={onEventClick}
                                    className="relative shadow-2xl" 
                                    priority={index < 2}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
        <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
                -webkit-overflow-scrolling: touch;
            }
        `}</style>
    </section>
  );
};
