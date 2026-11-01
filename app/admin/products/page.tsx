'use client';

import React,{useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import { useParameterOptions } from '@/components/parameters/useParameterOptions';
import { Database,RefreshCw,Save,Plus,ShieldCheck } from 'lucide-react';

type Category={code:string;name:string;sort_order:number;is_supporting:number;is_active:number};
type Scope={id:string;product_sku:string;name:string;sort_order:number;is_active:number};
type Product={sku:string;category_code:string;name:string;description:string;unit:string;price_amount:number|null;currency:string;is_active:number;source_ref:string;scopes:Scope[];industries:string[]};
type Catalog={success:boolean;categories:Category[];products:Product[];error?:string};
const units=['project','day','month','year','session','participant','asset','service'];

export default function AdminProductsPage(){
 const industryOptions=useParameterOptions('products.industries');
 const [categories,setCategories]=useState<Category[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [selected,setSelected]=useState('');
 const [category,setCategory]=useState('GRC');
 const [search,setSearch]=useState('');
 const [industry,setIndustry]=useState('ALL');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [creating,setCreating]=useState(false);
 const [newName,setNewName]=useState('');
 const [newSku,setNewSku]=useState('');
 const [newScope,setNewScope]=useState('');
 const [draft,setDraft]=useState<Product|null>(null);
 const current=products.find(p=>p.sku===selected);
 const filtered=useMemo(()=>products.filter(p=>p.category_code===category&&(industry==='ALL'||!p.industries?.length||p.industries.includes(industry))&&[p.sku,p.name,p.description].join(' ').toLowerCase().includes(search.toLowerCase())),[products,category,industry,search]);

 const load=async()=>{
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/products',{cache:'no-store'});
   const data=await response.json() as Catalog;
   if(!response.ok||!data.success)throw new Error(data.error||'Master Produk belum tersedia.');
   setCategories(data.categories);setProducts(data.products);
   setSelected(prev=>data.products.find(p=>p.sku===prev)?.sku||data.products[0]?.sku||'');
   setCategory(prev=>data.categories.some(c=>c.code===prev)?prev:data.categories[0]?.code||'GRC');
  }catch(e){setError(e instanceof Error?e.message:'Gagal memuat katalog.');}
  finally{setBusy(false);}
 };
 useEffect(()=>{void load();},[]);
 useEffect(()=>{setDraft(current?{...current,scopes:current.scopes.map(x=>({...x}))}:null);},[current?.sku,products]);

 const persist=async(input:Record<string,unknown>)=>{
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/products',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const result=await response.json();
   if(!response.ok||!result.success)throw new Error(result.error||'Gagal menyimpan Master Produk.');
   await load();
   return true;
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan.');return false;}
  finally{setBusy(false);}
 };
 const addProduct=async()=>{
  if(!newSku.trim()||!newName.trim()){setError('SKU dan nama produk wajib diisi.');return;}
  const ok=await persist({entity:'product',create:true,sku:newSku.toUpperCase(),category_code:category,name:newName,description:'',unit:'project',is_active:true});
  if(ok){setSelected(newSku.toUpperCase());setNewSku('');setNewName('');setCreating(false);}
 };
 const saveProduct=async()=>{
  if(!draft)return;
  await persist({entity:'product',sku:draft.sku,category_code:draft.category_code,name:draft.name,description:draft.description,unit:draft.unit,is_active:!!draft.is_active});
 };
 const saveScope=async(s:Scope)=>{await persist({entity:'scope',product_sku:s.product_sku,id:s.id,name:s.name,sort_order:s.sort_order,is_active:!!s.is_active});};
 const addScope=async()=>{
  if(!current||!newScope.trim())return;
  const ok=await persist({entity:'scope',create:true,product_sku:current.sku,name:newScope.trim(),sort_order:(current.scopes.length+1)*10,is_active:true});
  if(ok)setNewScope('');
 };

 return <main className="min-h-screen bg-grey-50 px-4 py-8 text-navy-900">
  <div className="mx-auto max-w-7xl space-y-5">
   <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div><div className="flex items-center gap-2 text-xs font-bold uppercase text-gold-700"><ShieldCheck className="h-4 w-4"/>Admin Only · RTICORE</div>
      <h1 className="mt-2 text-2xl font-extrabold">Master Produk & Layanan RTI</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">Katalog resmi Cybersecurity Company Profile v2.0/2026. Identitas SKU stabil, kategori terstruktur, scope dapat dikelola dan harga tidak diisi otomatis.</p>
     </div><div className="flex gap-2">
      <Link href="/admin/system" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">System Setup</Link>
      <button onClick={()=>void load()} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4"/>Refresh</button>
     </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-muted">
     <span><Database className="mr-1 inline h-4 w-4"/> {categories.length} kelompok</span>
     <span>{products.length} produk</span>
     <span>{products.reduce((a,p)=>a+p.scopes.length,0)} cakupan</span>
     <span>Nilai komersial: wajib ditetapkan terpisah</span>
    </div>
   </header>
   {error&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
   <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="self-start rounded-2xl border border-line bg-white p-4 shadow-sm">
     <label className="mb-2 block text-xs font-bold">Cari produk</label>
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nama, SKU atau deskripsi" className="mb-3 w-full rounded-xl border border-line px-3 py-2 text-sm"/>
     <label className="mb-2 block text-xs font-bold">Pilar Layanan</label>
     <select value={category} onChange={e=>{setCategory(e.target.value);setSelected('');}} className="mb-4 w-full rounded-xl border border-line px-3 py-2 text-sm">
      {categories.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
     </select>
     <label className="mb-2 block text-xs font-bold">Sektor Industri</label>
     <select value={industry} onChange={e=>setIndustry(e.target.value)} className="mb-4 w-full rounded-xl border border-line px-3 py-2 text-sm">
      {industryOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
     </select>
     <div className="max-h-[60vh] space-y-1 overflow-auto">
      {filtered.map(p=><button key={p.sku} onClick={()=>setSelected(p.sku)}
       className={'w-full rounded-xl p-3 text-left text-sm '+(selected===p.sku?'bg-navy-900 text-white':'hover:bg-grey-50')}>
       <span className="block text-xs font-mono opacity-70">{p.sku}</span><span className="font-semibold">{p.name}</span>
       {!!p.industries?.length&&<span className="mt-1 block text-[10px] opacity-70">{p.industries.join(" · ")}</span>}
       {!p.is_active&&<span className="ml-2 text-xs text-amber-600">(Nonaktif)</span>}
      </button>)}
     </div>
     <button onClick={()=>setCreating(!creating)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4"/>Tambah Produk</button>
     {creating&&<div className="mt-3 space-y-2">
      <label className="block text-xs font-semibold">SKU baru (RTI-{category}-XXX)</label>
      <input value={newSku} onChange={e=>setNewSku(e.target.value.toUpperCase())} placeholder={'RTI-'+category+'-010'} className="w-full rounded-xl border p-2 text-sm"/>
      <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nama Produk" className="w-full rounded-xl border p-2 text-sm"/>
      <button disabled={busy} onClick={()=>void addProduct()} className="w-full rounded-xl bg-gold-500 p-2 text-sm font-bold">Simpan Produk Baru</button>
     </div>}
    </aside>
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
     {!draft?<p className="text-sm text-muted">Pilih produk di sisi kiri untuk memperbarui informasi atau cakupan layanan.</p>:<>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
       <div><span className="font-mono text-xs text-blue-700">{draft.sku}</span><h2 className="text-xl font-bold">{draft.name}</h2></div>
       <button onClick={()=>void saveProduct()} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>Simpan Produk</button>
      </div>
      {!!draft.industries?.length&&<p className="mb-4 text-xs font-semibold text-blue-700">Sektor terkait: {draft.industries.join(' · ')}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
       <label className="text-xs font-semibold">Nama Produk<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
       <label className="text-xs font-semibold">Satuan<select value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm">{units.map(u=><option key={u} value={u}>{u}</option>)}</select></label>
       <label className="sm:col-span-2 text-xs font-semibold">Deskripsi<textarea rows={3} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
       <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!draft.is_active} onChange={e=>setDraft({...draft,is_active:e.target.checked?1:0})}/> Produk aktif</label>
       <div className="text-sm text-muted">Harga: {draft.price_amount===null?'Belum ditetapkan':draft.currency+' '+draft.price_amount.toLocaleString('id-ID')}</div>
      </div>
      <h3 className="mt-7 border-t border-line pt-5 text-lg font-extrabold">Cakupan / Sub-layanan</h3>
      <p className="mb-3 text-xs text-muted">Simpan tiap baris untuk menambah jejak audit. Nonaktifkan cakupan tanpa menghapus referensi lama.</p>
      <div className="space-y-2">
       {draft.scopes.map((s,i)=><div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
        <input aria-label={'Nama cakupan '+s.id} value={s.name} onChange={e=>setDraft({...draft,scopes:draft.scopes.map((x,j)=>i===j?{...x,name:e.target.value}:x)})} className="min-w-[180px] flex-1 rounded-lg border px-2 py-2 text-sm"/>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!s.is_active} onChange={e=>setDraft({...draft,scopes:draft.scopes.map((x,j)=>i===j?{...x,is_active:e.target.checked?1:0}:x)})}/>Aktif</label>
        <button onClick={()=>void saveScope(s)} disabled={busy} className="rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white">Simpan</button>
       </div>)}
       <div className="flex gap-2"><input value={newScope} onChange={e=>setNewScope(e.target.value)} placeholder="Cakupan baru" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/>
        <button onClick={()=>void addScope()} disabled={busy} className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold">Tambah</button></div>
      </div>
     </>}
    </section>
   </div>
  </div>
 </main>;
}
