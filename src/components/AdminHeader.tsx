import React from 'react';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export const AdminHeader: React.FC = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mog-logo-final.svg" alt="MOG" className="h-8 w-auto group-hover:scale-105 transition-transform" />
          <span className="text-sm font-bold text-neutral-500 ml-2 border-l border-neutral-700 pl-2">ADMIN</span>
        </Link>
        
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </header>
  );
};
