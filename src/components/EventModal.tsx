import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, ExternalLink, Lightbulb, Utensils, Loader2 } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';
import { fetchGemini } from '@/lib/gemini';

interface EventModalProps {
  event: Event;
  closeModal: () => void;
  apiKey: string;
}

export const EventModal: React.FC<EventModalProps> = ({ event, closeModal, apiKey }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiType, setAiType] = useState<'strategy' | 'combo' | null>(null);

  // Reset AI state when event changes (though modal creates new instance mostly)
  useEffect(() => {
    setAiContent(null);
    setAiType(null);
    setAiLoading(false);
  }, [event]);

  const handleGetAiStrategy = async () => {
    setAiLoading(true);
    setAiType('strategy');
    setAiContent(null);
    try {
      if (!apiKey) {
        setAiContent("API Key가 설정되지 않았습니다.");
        return;
      }
      const prompt = `영화 '${event.title}'의 '${event.goodsType}' 굿즈를 수령하기 위한 전략을 친절하고 전문적으로 알려줘. 영화의 장르와 팬덤의 크기를 고려해서, 어떤 시간에 방문해야 할지, 어떤 지점이 유리할지 등에 대한 조언을 포함해서 3문장 이내로 한국어로 답변해줘.`;
      const result = await fetchGemini(prompt, apiKey);
      setAiContent(result);
    } catch {
      setAiContent("AI 분석 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGetAiCombo = async () => {
    setAiLoading(true);
    setAiType('combo');
    setAiContent(null);
    try {
      if (!apiKey) {
         setAiContent("API Key가 설정되지 않았습니다.");
         return;
      }
      const prompt = `영화 '${event.title}'의 분위기와 세계관에 어울리는 영화관 매점 콤보나 특별한 간식 조합을 추천해줘. 영화의 테마와 연관 지어서 창의적으로 추천하고 그 이유를 2문장 이내로 한국어로 설명해줘.`;
      const result = await fetchGemini(prompt, apiKey);
      setAiContent(result);
    } catch {
      setAiContent("AI 추천 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={closeModal}
      ></div>
      
      <div className="relative bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button 
          onClick={closeModal}
          className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Poster Half */}
        <div className="md:w-[40%] aspect-[2/3] md:aspect-auto relative shrink-0">
           {/* Using standard img for now */}
          <img 
            src={event.imageUrl} 
            className="w-full h-full object-cover" 
            alt={event.title} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
        </div>

        {/* Content Half */}
        <div className="md:w-[60%] p-8 md:p-12 flex flex-col bg-neutral-900">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <CinemaBadge cinema={event.cinema} />
              <span className="text-red-500 font-bold text-xs uppercase tracking-[0.2em]">{event.goodsType}</span>
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tight">{event.title}</h2>
          </div>

          <div className="space-y-8 flex-grow">
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

            {/* AI Interaction Zone ✨ */}
            <section className="bg-neutral-950/50 rounded-2xl p-6 border border-neutral-800 space-y-5">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleGetAiStrategy}
                  disabled={aiLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-[11px] font-bold py-3.5 px-4 rounded-xl transition-all border border-neutral-700 shadow-sm"
                >
                  {aiLoading && aiType === 'strategy' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3 text-yellow-400" />}
                  수령 전략 분석 ✨
                </button>
                <button 
                  onClick={handleGetAiCombo}
                  disabled={aiLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-[11px] font-bold py-3.5 px-4 rounded-xl transition-all border border-neutral-700 shadow-sm"
                >
                  {aiLoading && aiType === 'combo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Utensils className="w-3 h-3 text-red-500" />}
                  테마 메뉴 추천 ✨
                </button>
              </div>

              {/* AI Response Area */}
              {(aiLoading || aiContent) && (
                <div className="bg-neutral-900/50 rounded-xl p-5 border-l-4 border-red-500 min-h-[80px] flex items-center justify-center relative overflow-hidden shadow-inner">
                  {aiLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                      <span className="text-[10px] text-neutral-500 animate-pulse font-mono tracking-tighter">AI THINKING...</span>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-neutral-300 italic">
                      "{aiContent}"
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="mt-8">
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
  );
};
