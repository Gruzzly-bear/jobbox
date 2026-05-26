'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);

  // Fetch docs on load
  useEffect(() => {
    const fetchDocs = async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setDocs(data);
    };
    fetchDocs();
  }, []);

  const upload = async (tag: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return alert("Please log in.");

      setLoading(tag);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await sb.storage.from('docs').upload(filePath, file);
      
      if (data) {
        await sb.from('documents').insert({ file_path: data.path, tag, user_id: user.id });
        setDocs((prev) => [{ created_at: new Date(), tag, file_path: data.path }, ...prev]);
      } else {
        alert("Upload failed: " + error?.message);
      }
      setLoading(null);
    };
    input.click();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-black text-gray-900 tracking-tighter">JOBBOX</h1>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">Field Documentation</p>
        </header>
        
        <div className="flex flex-col gap-3 mb-10">
          <ActionButton label="WARRANTY" tag="warranty" onClick={upload} loading={loading} />
          <ActionButton label="PERMIT" tag="permit" onClick={upload} loading={loading} />
          <ActionButton label="INVOICE" tag="invoice" onClick={upload} loading={loading} />
        </div>

        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Records</h2>
        <div className="flex flex-col gap-2">
          {docs.map((doc, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
              <span className="font-bold text-sm text-gray-700 uppercase">{doc.tag}</span>
              <span className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          ))}
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
      className={`w-full p-5 rounded-xl text-lg font-black tracking-tight transition-all shadow-sm border-2 
        ${loading === tag 
          ? 'bg-gray-200 border-gray-300 text-gray-500' 
          : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-[0.98]'}`}
    >
      {loading === tag ? 'SAVING...' : label}
    </button>
  );
}