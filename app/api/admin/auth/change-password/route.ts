import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import { changeOwnPassword } from '@/lib/admin/rbac';

export const runtime = 'nodejs';

export async function POST(req:Request){
  const session=adminSessionFromRequest(req);
  if(!session){
    return NextResponse.json({success:false,error:'Internal authentication required.'},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  if(!session.userId){
    return NextResponse.json(
      {success:false,error:'Bootstrap environment administrator does not use database password rotation.'},
      {status:409,headers:{'Cache-Control':'no-store'}},
    );
  }
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed){
    return NextResponse.json({success:false,error:origin.reason||'Cross-origin request denied.'},{status:403,headers:{'Cache-Control':'no-store'}});
  }
  const body=await req.json().catch(()=>null) as any;
  try{
    await changeOwnPassword({
      userId:session.userId,
      currentPassword:String(body?.currentPassword||''),
      newPassword:String(body?.newPassword||''),
      actor:session.sub,
    });
    return NextResponse.json(
      {success:true,message:'Password berhasil diubah. Silakan login kembali untuk mendapatkan permission session terbaru.'},
      {headers:{'Cache-Control':'no-store'}},
    );
  }catch(error){
    return NextResponse.json(
      {success:false,error:error instanceof Error?error.message:'Password change failed.'},
      {status:422,headers:{'Cache-Control':'no-store'}},
    );
  }
}
