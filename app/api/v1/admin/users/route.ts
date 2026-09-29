import { NextResponse } from 'next/server';
import {
  adminSessionFromRequest,
  adminSessionHasPermission,
} from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import {
  createInternalUser,
  listInternalAccess,
  updateInternalUser,
} from '@/lib/admin/rbac';

export const runtime = 'nodejs';

function noStore(status=200){
  return {status,headers:{'Cache-Control':'no-store'}};
}

export async function GET(req:Request){
  const session=adminSessionFromRequest(req);
  if(!session)return NextResponse.json({success:false,error:'Internal authentication required.'},noStore(401));
  if(!adminSessionHasPermission(session,'users:read')){
    return NextResponse.json({success:false,error:session.mustChangePassword?'Password change required.':'Insufficient permission.'},noStore(403));
  }
  try{
    return NextResponse.json({success:true,access:await listInternalAccess()},noStore());
  }catch(error){
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Internal user registry unavailable.'},noStore(503));
  }
}

export async function POST(req:Request){
  const session=adminSessionFromRequest(req);
  if(!session)return NextResponse.json({success:false,error:'Internal authentication required.'},noStore(401));
  if(!adminSessionHasPermission(session,'users:write')){
    return NextResponse.json({success:false,error:session.mustChangePassword?'Password change required.':'Insufficient permission.'},noStore(403));
  }
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed)return NextResponse.json({success:false,error:origin.reason||'Cross-origin request denied.'},noStore(403));
  const body=await req.json().catch(()=>null) as any;
  try{
    const id=await createInternalUser({
      username:String(body?.username||''),
      displayName:String(body?.displayName||''),
      email:body?.email?String(body.email):undefined,
      initialPassword:String(body?.initialPassword||''),
      roleCodes:Array.isArray(body?.roleCodes)?body.roleCodes.map(String):[],
      actor:session.sub,
    });
    return NextResponse.json({success:true,id,access:await listInternalAccess()},noStore(201));
  }catch(error){
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'User creation failed.'},noStore(422));
  }
}

export async function PATCH(req:Request){
  const session=adminSessionFromRequest(req);
  if(!session)return NextResponse.json({success:false,error:'Internal authentication required.'},noStore(401));
  if(!adminSessionHasPermission(session,'users:write')){
    return NextResponse.json({success:false,error:session.mustChangePassword?'Password change required.':'Insufficient permission.'},noStore(403));
  }
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed)return NextResponse.json({success:false,error:origin.reason||'Cross-origin request denied.'},noStore(403));
  const body=await req.json().catch(()=>null) as any;
  try{
    await updateInternalUser({
      userId:String(body?.userId||''),
      displayName:body?.displayName===undefined?undefined:String(body.displayName),
      email:body?.email===undefined?undefined:String(body.email),
      active:body?.active===undefined?undefined:body.active===true,
      roleCodes:Array.isArray(body?.roleCodes)?body.roleCodes.map(String):undefined,
      resetPassword:body?.resetPassword?String(body.resetPassword):undefined,
      actor:session.sub,
    });
    return NextResponse.json({success:true,access:await listInternalAccess()},noStore());
  }catch(error){
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'User update failed.'},noStore(422));
  }
}
