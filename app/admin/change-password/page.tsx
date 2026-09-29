'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage(){
  const router=useRouter();
  const [status,setStatus]=useState<any>(null);
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState(false);

  useEffect(()=>{
    fetch('/api/admin/auth/status',{cache:'no-store'})
      .then(async(response)=>{
        const body=await response.json().catch(()=>null);
        if(!response.ok)throw new Error('Session unavailable.');
        setStatus(body);
        if(!body.mustChangePassword)router.replace('/admin/system');
      })
      .catch(()=>router.replace('/admin-access'));
  },[router]);

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    setMessage('');
    if(newPassword!==confirmPassword){
      setMessage('Konfirmasi password baru tidak sama.');
      return;
    }
    setWorking(true);
    try{
      const response=await fetch('/api/admin/auth/change-password',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({currentPassword,newPassword}),
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Password tidak dapat diubah.');
      await fetch('/api/admin/auth/logout',{method:'POST'});
      router.replace('/admin-access');
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Password tidak dapat diubah.');
    }finally{
      setWorking(false);
    }
  };

  return <main className="min-h-screen bg-grey-50 px-4 py-10">
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15"><ShieldCheck className="h-6 w-6 text-gold-700"/></div>
      <div className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-700">RTI Internal Security</div>
      <h1 className="mt-2 text-2xl font-extrabold text-navy-900">Ganti Password Awal</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted">Akun database internal wajib mengganti password sementara sebelum permission internal dapat digunakan. Setelah berhasil, Anda akan diminta login kembali.</p>
      {status&&<div className="mt-4 rounded-xl bg-grey-50 p-3 text-[11px] text-muted">User: <strong className="text-navy-900">{status.username}</strong> · Role: {(status.roles||[]).join(', ')||'unassigned'}</div>}
      {message&&<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{message}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Password label="Password sementara saat ini" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password"/>
        <Password label="Password baru" value={newPassword} onChange={setNewPassword} autoComplete="new-password"/>
        <Password label="Konfirmasi password baru" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password"/>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-900">Minimal 12 karakter, dengan huruf besar, huruf kecil, angka, dan simbol.</div>
        <button disabled={working||!currentPassword||!newPassword||!confirmPassword} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">
          {working?<Loader2 className="h-4 w-4 animate-spin"/>:<KeyRound className="h-4 w-4 text-gold-400"/>}
          Simpan Password Baru
        </button>
      </form>
    </div>
  </main>;
}

function Password({label,value,onChange,autoComplete}:{label:string;value:string;onChange:(v:string)=>void;autoComplete:string}){
  return <label className="block text-xs font-bold text-navy-900">{label}<input required type="password" autoComplete={autoComplete} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"/></label>;
}
