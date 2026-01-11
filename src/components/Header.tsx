import { Search } from 'lucide-react';

interface HeaderProps {
  filter: string;
  setFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ filter, setFilter, searchQuery, setSearchQuery }) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
           {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CINEFEEL Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-black tracking-tighter uppercase italic">CINEFEEL</h1>
        </div>
        
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 overflow-x-auto scrollbar-hide max-w-[200px] md:max-w-none no-scrollbar">
          {['전체', 'CGV', '메가박스', '롯데시네마'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab 
                ? 'bg-neutral-800 text-white shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="영화 또는 굿즈 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 w-40 md:w-64"
          />
        </div>
      </div>
    </header>
  );
};
