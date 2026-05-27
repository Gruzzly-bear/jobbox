'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth status on load
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthChecking(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch docs once user is loaded
  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const { data } = await sb.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setDocs(data);
    };
    fetchDocs();
  }, [user]);

  const handleMagicLink = async () => {
    if (!email) return alert('Enter an email first.');
    const { error } = await sb.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Login link sent. Check your inbox.');
  };

  const handleLogout = async () => {
    await sb.auth.signOut();
    setUser(null);
  };

  const upload = async (tag: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file || !user) return;

      setLoading(tag);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await sb.storage.from('docs').upload(filePath, file);
      
      if (error) {
        alert(`Upload failed: ${error.message}`);
        setLoading(null);
        return;
      }

      if (data) {
        const { data: newDoc } = await sb.from('documents').insert({ file_path: data.path, tag, user_id: user.id }).select().single();
        if (newDoc) setDocs((prev) => [newDoc, ...prev]);
      }
      setLoading(null);
    };
    input.click();
  };

  const openDoc = async (filePath: string) => {
    if (!filePath) return;
    const { data, error } = await sb.storage.from('docs').createSignedUrl(filePath, 60);
    if (error) return alert("Error opening file: " + error.message);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const deleteDoc = async (id: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    const { error: storageError } = await sb.storage.from('docs').remove([filePath]);
    if (storageError) return alert("Storage delete failed: " + storageError.message);
    await sb.from('documents').delete().eq('id', id);
    setDocs(docs.filter(d => d.id !== id));
  };

  if (authChecking) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400 font-bold tracking-widest">LOADING...</div>;
  }

  // GATEKEEPER UI
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 p-6 flex flex-col justify-center items-center font-sans selection:bg-blue-500 selection:text-white">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl border-t-8 border-blue-600 text-center transform transition-all">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">JOBBOX</h1>
          <p className="text-sm text-slate-500 font-medium mb-8">Secure Field Access</p>
          
          <div className="text-left mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Work Email</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all font-medium text-slate-900"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
            />
          </div>
          
          <button 
            onClick={handleMagicLink} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black tracking-wide shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            SEND LOGIN LINK
          </button>
        </div>
      </main>
    );
  }

  // MAIN DASHBOARD UI
  return (
    <main className="min-h-screen bg-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-12">
      <header className="bg-slate-900 text-white px-6 pt-12 pb-8 shadow-md rounded-b-3xl mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">JOBBOX</h1>
          <p className="text-sm text-blue-400 font-semibold tracking-wide mt-1 uppercase">Field Portal</p>
        </div>
        <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors mb-1">
          Logout
        </button>
      </header>
      
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="flex flex-col gap-4 mb-10">
          <ActionButton label="Warranty" tag="warranty" onClick={upload} loading={loading} color="border-emerald-500" />
          <ActionButton label="Permit" tag="permit" onClick={upload} loading={loading} color="border-amber-500" />
          <ActionButton label="Invoice" tag="invoice" onClick={upload} loading={loading} color="border-blue-500" />
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-full">{docs.length}</span>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {docs.length > 0 ? docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <button onClick={() => openDoc(doc.file_path)} className="flex items-center gap-3 flex-1 text-left">
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                <span className="font-bold text-sm text-slate-800 tracking-tight">{doc.tag.toUpperCase()}</span>
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <button onClick={() => deleteDoc(doc.id, doc.file_path)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm font-medium text-slate-400">No records found.</div>
          )}
        </div>
      </div>
    </main>
  );
}

function ActionButton({ label, tag, onClick, loading, color }: { label: string, tag: string, onClick: (t: string) => void, loading: string | null, color: string }) {
  return (
    <button 
      disabled={!!loading}
      onClick={() => onClick(tag)}
      className={`group relative w-full p-5 rounded-2xl text-left transition-all duration-200 overflow-hidden outline-none
        ${loading === tag 
          ? 'bg-slate-200 border-2 border-slate-300 text-slate-400 cursor-not-allowed' 
          : `bg-white border-2 border-slate-200 text-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.98]`
        }`}
    >
      {!loading && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color.replace('border-', 'bg-')} opacity-80 group-hover:opacity-100 transition-opacity`} />}
      
      <div className={`flex items-center justify-between font-black tracking-tight text-lg ${!loading ? 'pl-2' : ''}`}>
        {loading === tag ? 'UPLOADING...' : label.toUpperCase()}
        {!loading && (
          <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </div>
    </button>
  );
}