import React from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
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
      className="group cursor-pointer"
    >
      <div className={`relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-900 border shadow-lg transition-all duration-300 
        ${isEnded ? 'grayscale opacity-60 border-neutral-800' : 'border-neutral-800 group-hover:border-red-500/50'}
        ${!isEnded ? 'group-hover:shadow-red-500/10 group-hover:-translate-y-1' : ''}
      `}>
        {/* Using standard img for now to avoid Next.js Image config complexity with remote URLs in MVP */}
        <img 
          src={event.imageUrl} 
          alt={event.title}
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
          {isActive && !isEnded && event.status !== '마감임박' && (
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-green-500/30 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              진행중
            </div>
          )}
          {event.status === '예정' && !isEnded && !isActive && (
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-blue-500/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
              예정
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-6 px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-wider italic flex items-center gap-1 drop-shadow-md">
            <Sparkles className="w-3 h-3" /> {event.goodsType}
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
};
