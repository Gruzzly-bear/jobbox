'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);

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
      if (!user) return;

      setLoading(tag);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data } = await sb.storage.from('docs').upload(filePath, file);
      
      if (data) {
        await sb.from('documents').insert({ file_path: data.path, tag, user_id: user.id });
        setDocs((prev) => [{ created_at: new Date(), tag }, ...prev]);
      }
      setLoading(null);
    };
    input.click();
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] p-6 font-sans">
      <div className="w-full max-w-sm mx-auto">
        <header className="mb-10 pt-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">JobBox</h1>
          <p className="text-sm text-gray-500 font-medium">Professional Field Documentation</p>
        </header>
        
        <div className="grid gap-3 mb-10">
          <ActionButton label="Warranty" tag="warranty" onClick={upload} loading={loading} />
          <ActionButton label="Permit" tag="permit" onClick={upload} loading={loading} />
          <ActionButton label="Invoice" tag="invoice" onClick={upload} loading={loading} />
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Activity</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {docs.length > 0 ? docs.map((doc, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
              <span className="font-semibold text-sm text-gray-800">{doc.tag.charAt(0).toUpperCase() + doc.tag.slice(1)}</span>
              <span className="text-xs text-gray-400 font-medium">{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          )) : <p className="p-4 text-sm text-gray-400">No records found.</p>}
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
      className={`w-full py-4 px-6 rounded-xl text-left font-semibold transition-all duration-200 border border-gray-200 
        ${loading === tag ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900 hover:border-blue-500 hover:shadow-md active:scale-[0.98]'}`}
    >
      {loading === tag ? 'Uploading...' : label}
    </button>
  );
}