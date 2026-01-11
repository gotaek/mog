import React from 'react';
import { Sparkles } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  // Simple client-side check for event expiration
  const isEnded = React.useMemo(() => {
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
    if (isEnded) return false;
    
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
            
            // If start date is in future, it's not active yet (it's upcoming)
            // But user said "dates within period". 
            // Usually "Active" means started and not ended.
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
        ${isEnded ? 'grayscale opacity-60 border-neutral-800' : ''}
        ${isActive ? 'border-red-500/50 shadow-red-900/20' : 'border-neutral-800 group-hover:border-neutral-600'}
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
          {isActive && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              진행중
            </span>
          )}
        </div>
        {event.status === '마감임박' && !isEnded && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
            마감임박
          </div>
        )}
        {isEnded && (
          <div className="absolute top-3 right-3 bg-neutral-700 text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded">
            종료됨
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider italic flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {event.goodsType}
          </p>
          <h3 className="text-sm font-bold leading-tight mb-1 break-words">{event.title}</h3>
        </div>
      </div>
    </div>
  );
};
