import React from 'react';
import { Sparkles } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  return (
    <div 
      onClick={() => onClick(event)}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg group-hover:shadow-red-500/10 transition-all duration-300 group-hover:-translate-y-1">
        {/* Using standard img for now to avoid Next.js Image config complexity with remote URLs in MVP */}
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <CinemaBadge cinema={event.cinema} />
        </div>
        {event.status === '마감임박' && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
            마감임박
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider italic flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {event.goodsType}
          </p>
          <h3 className="text-sm font-bold truncate leading-tight mb-1">{event.title}</h3>
        </div>
      </div>
    </div>
  );
};
