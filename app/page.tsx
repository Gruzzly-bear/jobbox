'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);

  const upload = async (tag: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(tag);
      const { data, error } = await sb.storage.from('docs').upload(`${Date.now()}_${file.name}`, file);
      
      if (data) {
        const { data: { user } } = await sb.auth.getUser();
        await sb.from('documents').insert({ file_path: data.path, tag, user_id: user?.id });
      }
      setLoading(null);
    };
    input.click();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <header className="mb-10 text-center">
          <h1 className="text-xl font-black text-gray-900 tracking-tighter">JOBBOX</h1>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">Field Documentation</p>
        </header>
        
        <div className="flex flex-col gap-4">
          <ActionButton label="WARRANTY" tag="warranty" onClick={upload} loading={loading} />
          <ActionButton label="PERMIT" tag="permit" onClick={upload} loading={loading} />
          <ActionButton label="INVOICE" onClick={upload} tag="invoice" loading={loading} />
        </div>
      </div>
    </main>
  );
}

function ActionButton({ label, tag, onClick, loading }: { label: string, tag: string, onClick: (t: string) => void, loading: string | null }) {
  return (
    <button 
      disabled={!!loading}
      onClick={() => onClick(tag)}
      className={`w-full p-6 rounded-xl text-lg font-bold tracking-tight transition-all shadow-sm border-2 
        ${loading === tag 
          ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-[0.98]'}`}
    >
      {loading === tag ? 'SAVING...' : label}
    </button>
  );
}