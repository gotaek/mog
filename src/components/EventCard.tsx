import React from 'react';
import { Tag, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  className?: string;
  priority?: boolean;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick, className = '', priority = false }) => {
  // Simple client-side check for event expiration
  const isEnded = React.useMemo(() => {
    if (!event.period) return false;
    // 1. Check if status says ended
    if (event.status === '종료') return true;
    
    // 2. Try to parse date range (Format: YYYY.MM.DD ~ YYYY.MM.DD)
    if (event.period.includes('~')) {
      const parts = event.period.split('~');
      if (parts.length === 2) {
        const endDateString = parts[1].trim();
        // If it says "Until sold out", it's not ended by date
        if (endDateString.includes('소진')) return false;
        
        // Parse "2024.03.10" -> Date
        // Supporting YYYY.MM.DD
        const dateParts = endDateString.split('.');
        if (dateParts.length === 3) {
           const end = new Date(
             parseInt(dateParts[0]), 
             parseInt(dateParts[1]) - 1, 
             parseInt(dateParts[2])
           );
           // Set end time to end of day
           end.setHours(23, 59, 59, 999);
           
           if (!isNaN(end.getTime())) {
             return new Date() > end;
           }
        }
      }
    }
    return false;
  }, [event.period, event.status]);

  // Check if today is within period (Active)
  const isActive = React.useMemo(() => {
    if (isEnded || !event.period) return false;
    
    // Parse start date
    // "2024.02.28 ~ ..."
    const parts = event.period.split('~');
    if (parts.length >= 1) {
        const startDateString = parts[0].trim();
        const startDates = startDateString.split('.');
        if (startDates.length === 3) {
            const start = new Date(
                parseInt(startDates[0]),
                parseInt(startDates[1]) - 1,
                parseInt(startDates[2])
            );
            start.setHours(0, 0, 0, 0); // Start of day
            const now = new Date();
            
            return now >= start;
        }
    }
    return false;
  }, [event.period, isEnded]);

  return (
    <div 
      onClick={() => onClick(event)}
      className={`group cursor-pointer ${className}`}
    >
      <div className={`relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-900 border shadow-lg transition-all duration-300 will-change-transform
        ${isEnded ? 'grayscale opacity-60 border-neutral-800' : 'border-neutral-800 group-hover:border-red-500/50'}
        ${!isEnded ? 'group-hover:shadow-red-500/10 group-hover:-translate-y-1' : ''}
      `}>
        {/* Using standard img for now to avoid Next.js Image config complexity with remote URLs in MVP */}
        <Image 
          src={event.imageUrl} 
          alt={event.title}
          width={400}
          height={600}
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          className={`w-full h-full object-cover transition-transform duration-500 ${isEnded ? '' : 'group-hover:scale-110'} opacity-80 ${isEnded ? '' : 'group-hover:opacity-100'}`}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
          <CinemaBadge cinema={event.cinema} />
        </div>
        {/* Status Badges (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          {event.status === '마감임박' && !isEnded && (
            <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse shadow-lg">
              마감임박
            </div>
          )}
          {isEnded && (
            <div className="bg-neutral-700 text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
              종료됨
            </div>
          )}
          {/* D-Day Logic */}
          {(() => {
            if (isEnded || !event.period) return null;

            // Calculate Diff
            const getDiffDays = () => {
                 const parts = event.period.split('~');
                 const startDateString = parts[0].trim();
                 // Handle YYYY.MM.DD or YYYY.M.D
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
                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 }
                 return null;
            };

            const diff = getDiffDays();
            
            // 1. D-Day (Today) - Premium Red Pulse
            if (diff === 0) {
                return (
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-red-500/50 text-red-500 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute opacity-75"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 relative"></div>
                      D-Day
                    </div>
                );
            }

            // 2. Active (Started in past) - No Badge (Clean UI)
            if (isActive && diff !== null && diff < 0 && event.status !== '마감임박') {
                return null;
            }

            // 3. Upcoming (Future) - D-Minus or Just "Upcoming" if calc fails
            if (event.status === '예정' || (diff !== null && diff > 0)) {
                return (
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-blue-500/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                      {diff !== null && diff > 0 ? `D-${diff}` : '예정'}
                    </div>
                );
            }

            return null;
          })()}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-6 px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-wider italic flex items-center gap-1 drop-shadow-md">
            <Tag className="w-3 h-3" /> {event.goodsType}
          </p>
          <h3 className="text-sm font-bold leading-tight mb-1 break-words text-white drop-shadow-md">{event.title}</h3>
          {event.period && (
            <p className="text-[10px] text-neutral-300 flex items-center gap-1 font-medium opacity-90 drop-shadow-md">
              <span className="w-2.5 h-2.5"><Calendar size={10} /></span>
              {event.period.split('~')[0]} ~
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';
