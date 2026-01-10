import React from 'react';

interface CinemaBadgeProps {
  cinema: string;
}

export const CinemaBadge: React.FC<CinemaBadgeProps> = ({ cinema }) => {
  const styles: Record<string, string> = {
    CGV: "bg-red-600 text-white",
    메가박스: "bg-purple-800 text-white",
    롯데시네마: "bg-red-100 text-red-700 border border-red-200"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${styles[cinema] || "bg-gray-200 text-gray-800"}`}>
      {cinema}
    </span>
  );
};
