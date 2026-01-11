
import React from 'react';

interface CinemaFilterProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export const CinemaFilter: React.FC<CinemaFilterProps> = ({ filter, setFilter }) => {
  return (
    <div className="flex justify-center w-full mb-8">
      <div className="flex items-center gap-0.5 md:gap-1 bg-neutral-900 p-0.5 md:p-1 rounded-xl border border-neutral-800 shadow-sm w-full max-w-full md:max-w-none">
        {['전체', 'CGV', '메가박스', '롯데시네마'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 md:flex-none px-2 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
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
