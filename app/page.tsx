'use client'
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const upload = async (tag: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      const { data } = await sb.storage.from('docs').upload(`${Date.now()}_${file.name}`, file);
      if (data) {
        await sb.from('documents').insert({ file_path: data.path, tag, user_id: (await sb.auth.getUser()).data.user?.id });
        alert('File saved to ' + tag);
      }
    };
    input.click();
  };

  return (
    <main className="flex flex-col gap-4 p-8 max-w-sm mx-auto">
      <h1 className="text-3xl font-bold uppercase tracking-tight">JobBox</h1>
      <button onClick={() => upload('warranty')} className="bg-slate-900 text-white p-8 rounded-2xl text-2xl font-bold">WARRANTY</button>
      <button onClick={() => upload('permit')} className="bg-slate-900 text-white p-8 rounded-2xl text-2xl font-bold">PERMIT</button>
      <button onClick={() => upload('invoice')} className="bg-slate-900 text-white p-8 rounded-2xl text-2xl font-bold">INVOICE</button>
    </main>
  );
}