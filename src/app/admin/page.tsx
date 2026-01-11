"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, AlertCircle, Search, Image as ImageIcon, X, Pencil, RotateCcw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminHeader } from '@/components/AdminHeader';
import { CinemaBadge } from '@/components/ui/CinemaBadge';
import { searchMovies, getPosterUrl, TMDBMovie } from '@/lib/tmdb';

import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Start loading true for auth check
  const [authChecking, setAuthChecking] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);

  // TMDB Modal State
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterQuery, setPosterQuery] = useState('');
  const [posterResults, setPosterResults] = useState<TMDBMovie[]>([]);
  const [isSearchingPoster, setIsSearchingPoster] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    event_title: '', // Renamed from title
    movie_title: '', // New field
    cinema_id: 1,
    goods_type: '',
    period: '',
    image_url: '',
    official_url: '',
    locationsInput: '', // comma separated
    status: '진행중'
  });

  const fetchEvents = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, cinemas(name)')
      .order('id', { ascending: false });

    if (error) {
      console.error(error);
      setMessage({ type: 'error', text: '데이터 로딩 실패' });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }
      setAuthChecking(false);
      fetchEvents(); // Load data after auth confirmation
    };

    checkAuth();
  }, [router]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      event_title: '',
      movie_title: '',
      cinema_id: 1,
      goods_type: '',
      period: '',
      image_url: '',
      official_url: '',
      locationsInput: '',
      status: '진행중'
    });
    setEditingId(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setFormData({
      event_title: event.event_title || event.title || '',
      movie_title: event.movie_title || '',
      cinema_id: event.cinema_id || 1,
      goods_type: event.goods_type || '',
      period: event.period || '',
      image_url: event.image_url || '',
      official_url: event.official_url || '',
      locationsInput: event.locations ? event.locations.join(', ') : '',
      status: event.status || '진행중'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    if (!supabase) return;

    setActionLoading(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    
    if (error) {
      setMessage({ type: 'error', text: '삭제 실패: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '삭제되었습니다.' });
      if (editingId === id) resetForm();
      fetchEvents();
    }
    setActionLoading(false);
  };

  const handleSearchPoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterQuery.trim()) return;
    
    setIsSearchingPoster(true);
    const results = await searchMovies(posterQuery);
    setPosterResults(results);
    setIsSearchingPoster(false);
  };

  const handleSelectPoster = (movie: TMDBMovie) => {
    if (movie.poster_path) {
      setFormData({
        ...formData,
        image_url: getPosterUrl(movie.poster_path),
        movie_title: movie.title // Set Title from TMDB to movie_title
      });
      setIsPosterModalOpen(false);
      setPosterQuery('');
      setPosterResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setActionLoading(true);
    const locationsArray = formData.locationsInput.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      event_title: formData.event_title,
      movie_title: formData.movie_title,
      cinema_id: formData.cinema_id,
      goods_type: formData.goods_type,
      period: formData.period,
      image_url: formData.image_url,
      official_url: formData.official_url,
      locations: locationsArray,
      status: formData.status
    };

    let result;
    if (editingId) {
      // Update Mode
      result = await supabase
        .from('events')
        .update(payload)
        .eq('id', editingId);
    } else {
      // Create Mode
      result = await supabase
        .from('events')
        .insert([payload]);
    }

    if (result.error) {
      setMessage({ type: 'error', text: (editingId ? '수정' : '등록') + ' 실패: ' + result.error.message });
    } else {
      setMessage({ type: 'success', text: (editingId ? '수정' : '등록') + '되었습니다.' });
      resetForm();
      fetchEvents();
    }
    setActionLoading(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">DB 연결 필요</h2>
          <p className="text-neutral-400">Admin 페이지를 사용하려면 Supabase 설정이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col overflow-hidden">
      <div className="shrink-0">
        <AdminHeader />
      </div>

      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 py-8">
        {message && (
          <div className={`p-4 mb-4 rounded-lg font-bold text-sm shrink-0 ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 h-full">
          {/* Form Section - Independently Scrollable */}
          <div className="lg:col-span-1 h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className={`bg-neutral-900 border ${editingId ? 'border-red-500/50' : 'border-neutral-800'} rounded-2xl p-6 transition-colors`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5 text-red-500" /> : <Plus className="w-5 h-5 text-red-500" />} 
                  {editingId ? '이벤트 수정' : '새 이벤트 등록'}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-xs text-neutral-400 hover:text-white flex items-center gap-1">
                    <RotateCcw className="w-3 h-3"/> 취소
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">이벤트 제목 (화면 표시)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.event_title}
                    onChange={e => setFormData({...formData, event_title: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="예: 듄: 파트 2 오리지널 티켓"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화 원제 (포스터 검색용)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.movie_title}
                      onChange={e => setFormData({...formData, movie_title: e.target.value})}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="예: 듄: 파트 2"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setPosterQuery(formData.movie_title || formData.event_title); 
                        setIsPosterModalOpen(true);
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg transition-colors"
                      title="TMDB 영화 검색"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">포스터 이미지 URL</label>
                  <input 
                    required
                    type="text" 
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none truncate"
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <div className="mt-2 w-20 aspect-[2/3] bg-neutral-800 rounded overflow-hidden border border-neutral-700">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화관</label>
                    <select 
                      value={formData.cinema_id}
                      onChange={e => setFormData({...formData, cinema_id: Number(e.target.value)})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    >
                      <option value={1}>CGV</option>
                      <option value={2}>메가박스</option>
                      <option value={3}>롯데시네마</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">굿즈 종류</label>
                    <input 
                      required
                      type="text" 
                      value={formData.goods_type}
                      onChange={e => setFormData({...formData, goods_type: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="예: TTT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 기간</label>
                  <input 
                    required
                    type="text" 
                    value={formData.period}
                    onChange={e => setFormData({...formData, period: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="예: 2024.03.01 ~ 2024.03.02"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">상태</label>
                        <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                        >
                        <option value="진행중">진행중</option>
                        <option value="마감임박">마감임박</option>
                        <option value="종료">종료</option>
                        <option value="예정">예정</option>
                        </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">공식 링크</label>
                  <input 
                    type="text" 
                    value={formData.official_url}
                    onChange={e => setFormData({...formData, official_url: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 지점 (쉼표로 구분)</label>
                  <textarea 
                    value={formData.locationsInput}
                    onChange={e => setFormData({...formData, locationsInput: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none h-20 resize-none"
                    placeholder="용산, 왕십리, 영등포..."
                  />
                </div>

                <button 
                  disabled={actionLoading}
                  type="submit" 
                  className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? '수정 사항 저장' : '이벤트 등록'}
                </button>
              </form>
            </div>
          </div>

          {/* List Section - Independently Scrollable */}
          <div className="lg:col-span-2 space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
             <div className="sticky top-0 bg-neutral-950 z-10 pt-2 pb-2"> {/* Header sticks within list */}
                <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">등록된 이벤트 ({events.length})</h2>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />}
            </div>
          </div>

            {events.length === 0 && !loading ? (
              <div className="text-neutral-500 bg-neutral-900/50 p-8 rounded-2xl text-center border border-dashed border-neutral-800">
                아직 등록된 이벤트가 없습니다.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className={`bg-neutral-900 border ${editingId === event.id ? 'border-blue-500/50 bg-blue-900/10' : 'border-neutral-800 hover:border-neutral-700'} rounded-xl p-4 flex gap-4 transition-all`}>
                  <div className="w-16 h-24 bg-neutral-800 rounded-lg shrink-0 overflow-hidden relative group">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CinemaBadge cinema={event.cinemas?.name} />
                      <span className="text-xs text-red-400 font-bold uppercase">{event.goods_type}</span>
                    </div>
                    <h3 className="font-bold text-lg truncate mb-1">{event.event_title || event.title}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{event.period}</p>
                    <div className="hidden sm:flex gap-1 overflow-hidden">
                       {event.locations?.slice(0, 3).map((loc: string, i: number) => (
                         <span key={i} className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{loc}</span>
                       ))}
                       {(event.locations?.length || 0) > 3 && <span className="text-[10px] text-neutral-500 pl-1">...</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-2">
                     <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${event.status === '종료' ? 'bg-neutral-800 text-neutral-500' : event.status === '마감임박' ? 'bg-orange-900 text-orange-200' : 'bg-green-900 text-green-200'}`}>
                        {event.status}
                     </span>
                     <div className="flex gap-1">
                        <button 
                            onClick={() => handleEdit(event)}
                            disabled={actionLoading}
                            className={`p-2 rounded-lg transition-colors ${editingId === event.id ? 'text-blue-500 bg-blue-500/20' : 'text-neutral-500 hover:text-blue-500 hover:bg-blue-500/10'}`}
                            title="수정"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(event.id)}
                            disabled={actionLoading}
                            className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="삭제"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* TMDB Search Modal */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">TMDB 영화 포스터 검색</h3>
              <button onClick={() => setIsPosterModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleSearchPoster} className="flex gap-2">
                <input 
                  autoFocus
                  type="text" 
                  value={posterQuery}
                  onChange={e => setPosterQuery(e.target.value)}
                  placeholder="영화 제목 (예: 듄)"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-red-500 outline-none"
                />
                <button 
                  type="submit" 
                  disabled={isSearchingPoster}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {isSearchingPoster ? <Loader2 className="w-5 h-5 animate-spin"/> : '검색'}
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {posterResults.map(movie => (
                <button 
                  key={movie.id}
                  onClick={() => handleSelectPoster(movie)}
                  className="text-left group"
                >
                  <div className="aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden mb-2 relative">
                    {movie.poster_path ? (
                      <img 
                        src={getPosterUrl(movie.poster_path)} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <ImageIcon className="w-8 h-8"/>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold leading-tight line-clamp-2">{movie.title}</p>
                    <p className="text-[10px] text-neutral-500">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </button>
              ))}
              {!isSearchingPoster && posterResults.length === 0 && posterQuery && (
                  <div className="col-span-full text-center py-10 text-neutral-500">
                      검색 결과가 없습니다.
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
