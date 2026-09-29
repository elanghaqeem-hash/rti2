'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KeyRound, RefreshCw, Save, ShieldCheck, UserPlus, Users } from 'lucide-react';

type UserRow={
  id:string;username:string;displayName:string;email:string;mustChangePassword:boolean;
  active:boolean;roles:string[];createdBy:string;lastLoginAt:string|null;createdAt:string;updatedAt:string;
};
type RoleRow={id:string;code:string;name:string;description:string;active:boolean;permissions:string[]};
type AccessData={users:UserRow[];roles:RoleRow[];permissions:Array<{id:string;code:string;name:string;description:string}>};

export default function InternalUsersPage(){
  const [data,setData]=useState<AccessData|null>(null);
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState(false);
  const [form,setForm]=useState({username:'',displayName:'',email:'',initialPassword:'',roleCodes:['presales'] as string[]});
  const [search,setSearch]=useState('');

  const load=async()=>{
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/users',{cache:'no-store'});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'User registry tidak dapat dimuat.');
      setData(body.access);
    }catch(error){setMessage(error instanceof Error?error.message:'User registry tidak dapat dimuat.');}
    finally{setWorking(false);}
  };
  useEffect(()=>{void load();},[]);

  const post=async(payload:Record<string,unknown>,method:'POST'|'PATCH')=>{
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/users',{
        method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Perubahan user gagal.');
      setData(body.access);
      return true;
    }catch(error){setMessage(error instanceof Error?error.message:'Perubahan user gagal.');return false;}
    finally{setWorking(false);}
  };

  const users=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const rows=data?.users||[];
    if(!q)return rows;
    return rows.filter((u)=>[u.username,u.displayName,u.email,...u.roles].some((v)=>String(v).toLowerCase().includes(q)));
  },[data,search]);

  const toggleFormRole=(code:string)=>{
    setForm((current)=>({
      ...current,
      roleCodes:current.roleCodes.includes(code)
        ? current.roleCodes.filter((item)=>item!==code)
        : [...current.roleCodes,code],
    }));
  };

  return <main className="min-h-screen bg-grey-50 py-8">
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300"><ShieldCheck className="h-3.5 w-3.5"/>RTI Internal Access</div>
            <h1 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">Users, Roles & Permissions</h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">Kelola akun internal bernama, role, status aktif, dan reset password. Password sementara wajib diganti saat login pertama.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/project-estimator" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">Estimator Admin</Link>
            <Link href="/admin/system" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">System</Link>
            <button onClick={()=>void load()} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"><RefreshCw className={(working?'animate-spin ':'')+'h-4 w-4'}/>Refresh</button>
          </div>
        </div>
      </header>

      {message&&<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

      {data&&<>
        <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-gold-600"/><h2 className="text-sm font-extrabold text-navy-900">Create Internal User</h2></div>
            <div className="mt-4 space-y-3">
              <Field label="Username" value={form.username} onChange={(v)=>setForm({...form,username:v})}/>
              <Field label="Display name" value={form.displayName} onChange={(v)=>setForm({...form,displayName:v})}/>
              <Field label="Email" value={form.email} type="email" onChange={(v)=>setForm({...form,email:v})}/>
              <Field label="Initial password" value={form.initialPassword} type="password" onChange={(v)=>setForm({...form,initialPassword:v})}/>
            </div>
            <div className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted">Assigned roles</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.roles.filter((r)=>r.active).map((role)=><label key={role.code} className="flex items-start gap-2 rounded-xl border border-line p-3 text-[11px]">
                <input type="checkbox" checked={form.roleCodes.includes(role.code)} onChange={()=>toggleFormRole(role.code)} className="mt-0.5"/>
                <span><strong className="text-navy-900">{role.name}</strong><span className="mt-0.5 block text-[9px] text-muted">{role.code}</span></span>
              </label>)}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">Password minimal 12 karakter dan harus memuat huruf besar, huruf kecil, angka, dan simbol. Sistem tidak menyimpan password plaintext.</div>
            <button
              disabled={working||!form.username||!form.displayName||!form.initialPassword||form.roleCodes.length===0}
              onClick={async()=>{
                const ok=await post(form,'POST');
                if(ok){setForm({username:'',displayName:'',email:'',initialPassword:'',roleCodes:['presales']});setMessage('Akun internal dibuat. Sampaikan password sementara melalui kanal aman.');}
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-40"
            ><UserPlus className="h-4 w-4"/>Create User</button>
          </div>

          <div className="rounded-2xl border border-line bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gold-600"/><h2 className="text-sm font-extrabold text-navy-900">Named Internal Users</h2></div>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search user / role..." className="w-full rounded-xl border border-line px-3 py-2.5 text-xs sm:max-w-xs"/>
            </div>
            <div className="divide-y divide-line">
              {users.map((user)=><UserEditor key={user.id} user={user} roles={data.roles} working={working} onSave={async(payload)=>{
                const ok=await post({userId:user.id,...payload},'PATCH');
                if(ok)setMessage('User '+user.username+' diperbarui.');
              }}/>)}
              {!users.length&&<div className="p-8 text-center text-xs text-muted">Belum ada named internal user.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-navy-900">Role Permission Matrix</h2>
          <p className="mt-1 text-[11px] text-muted">Role default berasal dari migration dan permission dicek server-side pada API internal.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.roles.map((role)=><div key={role.id} className="rounded-xl border border-line p-4">
              <div className="text-xs font-extrabold text-navy-900">{role.name}</div>
              <div className="mt-1 text-[9px] font-bold text-gold-700">{role.code}</div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">{role.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{role.permissions.map((permission)=><span key={permission} className="rounded-full bg-grey-50 px-2 py-1 text-[9px] font-bold text-navy-900">{permission}</span>)}</div>
            </div>)}
          </div>
        </section>
      </>}
    </div>
  </main>;
}

function Field({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){
  return <label className="block text-xs font-bold text-navy-900">{label}<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal"/></label>;
}

function UserEditor({user,roles,working,onSave}:{user:UserRow;roles:RoleRow[];working:boolean;onSave:(payload:any)=>Promise<void>}){
  const [displayName,setDisplayName]=useState(user.displayName);
  const [email,setEmail]=useState(user.email);
  const [active,setActive]=useState(user.active);
  const [roleCodes,setRoleCodes]=useState(user.roles);
  const [resetPassword,setResetPassword]=useState('');

  useEffect(()=>{setDisplayName(user.displayName);setEmail(user.email);setActive(user.active);setRoleCodes(user.roles);},[user]);

  const toggle=(code:string)=>setRoleCodes((current)=>current.includes(code)?current.filter((x)=>x!==code):[...current,code]);

  return <div className="p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="text-xs font-extrabold text-navy-900">{user.username}</div><div className="mt-1 text-[9px] text-muted">Last login: {user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString('id-ID'):'never'} · {user.mustChangePassword?'must change password':'password active'}</div></div>
      <label className="flex items-center gap-2 text-[10px] font-bold text-navy-900"><input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)}/>Active</label>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Display name" value={displayName} onChange={setDisplayName}/>
      <Field label="Email" value={email} type="email" onChange={setEmail}/>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{roles.filter((r)=>r.active).map((role)=><label key={role.code} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-[9px] font-bold text-navy-900"><input type="checkbox" checked={roleCodes.includes(role.code)} onChange={()=>toggle(role.code)}/>{role.code}</label>)}</div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="password" value={resetPassword} onChange={(e)=>setResetPassword(e.target.value)} placeholder="Optional reset password" className="min-h-10 flex-1 rounded-xl border border-line px-3 text-xs"/>
      <button disabled={working||roleCodes.length===0} onClick={()=>void onSave({displayName,email,active,roleCodes,resetPassword:resetPassword||undefined})} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-[10px] font-extrabold text-white disabled:opacity-40">{resetPassword?<KeyRound className="h-3.5 w-3.5"/>:<Save className="h-3.5 w-3.5"/>}Save</button>
    </div>
  </div>;
}
