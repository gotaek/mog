import React from 'react';
import { X, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventModalProps {
  event: Event;
  closeModal: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, closeModal }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={closeModal}
      ></div>
      
      <div className="relative bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] md:h-[600px] flex flex-col md:flex-row rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <button 
          onClick={closeModal}
          className="absolute top-6 right-6 z-20 p-2 bg-black/50 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Poster Half - Mobile: Dynamic Height / Desktop: Fixed width */}
        <div 
            className="relative shrink-0 bg-neutral-950 transition-all duration-300 ease-out md:w-[40%] md:h-full overflow-hidden"
            style={{ 
                height: typeof window !== 'undefined' && window.innerWidth < 768 ? `${Math.max(120, 400 - (document.getElementById('modal-content')?.scrollTop || 0))}px` : undefined 
            }}
        >
           {/* Mobile: Dynamic aspect via height / Desktop: Full Height */}
           <div className="w-full h-full relative">
            <img 
                src={event.imageUrl} 
                className="w-full h-full object-cover opacity-90 transition-all duration-300" 
                style={{ 
                    objectPosition: 'center top' 
                }}
                alt={event.title} 
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-900/50"></div>
           </div>
        </div>

        {/* Content Half - Scrollable */}
        <div 
            id="modal-content"
            className="md:w-[60%] flex flex-col bg-neutral-900 md:max-h-[90vh] overflow-y-auto h-full"
            onScroll={(e) => {
                // Trigger re-render for height update on mobile (naive approach for MVP)
                // For better performance, we would use refs and direct DOM manipulation or Framer Motion
                if (window.innerWidth < 768) {
                    const poster = e.currentTarget.parentElement?.firstElementChild as HTMLElement;
                    if (poster) {
                        const scrollTop = e.currentTarget.scrollTop;
                        const newHeight = Math.max(100, 400 - scrollTop);
                        poster.style.height = `${newHeight}px`;
                    }
                }
            }}
        >
          <div className="p-8 md:p-12">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                <CinemaBadge cinema={event.cinema} />
                <span className="text-red-500 font-bold text-xs uppercase tracking-[0.2em]">{event.goodsType}</span>
                </div>
                <h2 className="text-4xl font-black mb-2 tracking-tight">{event.title}</h2>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                <section>
                    <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-widest leading-none">
                    <Calendar className="w-3 h-3 text-red-500" /> 증정 기간
                    </h4>
                    <p className="text-sm font-semibold">{event.period}</p>
                </section>
                <section>
                    <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-widest leading-none">
                    <MapPin className="w-3 h-3 text-red-500" /> 진행 정보
                    </h4>
                    <p className="text-sm font-semibold">{event.locations.length}개 지점 진행</p>
                </section>
                </div>

                <section>
                <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-3 tracking-widest leading-none">진행 지점 상세</h4>
                <div className="flex flex-wrap gap-2">
                    {event.locations.map(loc => (
                    <span key={loc} className="bg-neutral-800 px-3 py-1.5 rounded-lg text-xs text-neutral-300 border border-neutral-700 hover:border-red-500 transition-colors cursor-default">
                        {loc}
                    </span>
                    ))}
                </div>
                </section>

                <div className="pt-4">
                    <a 
                    href={event.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-red-600/20 group"
                    >
                    공식 홈페이지 공지 확인
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
