
import React from 'react';

interface CinemaFilterProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export const CinemaFilter: React.FC<CinemaFilterProps> = ({ filter, setFilter }) => {
  return (
    <div className="flex justify-center w-full mb-8">
      <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 shadow-sm overflow-x-auto scrollbar-hide max-w-[90vw] md:max-w-none no-scrollbar">
        {['전체', 'CGV', '메가박스', '롯데시네마'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              filter === tab 
              ? 'bg-neutral-800 text-white shadow-md' 
              : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};
