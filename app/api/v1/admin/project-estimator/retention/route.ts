import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import {
  previewEstimatorRetention,
  runEstimatorRetention,
} from '@/lib/project-estimator/retention';

export const runtime = 'nodejs';

function noStore(status=200){
  return {status,headers:{'Cache-Control':'no-store'}};
}

export async function GET(req:Request){
  const auth=adminSessionFromRequest(req);
  if(!auth)return NextResponse.json({success:false,error:'Admin authentication required.'},noStore(401));
  try{
    return NextResponse.json({success:true,retention:await previewEstimatorRetention()},noStore());
  }catch(error){
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Retention preview failed.'},noStore(503));
  }
}

export async function POST(req:Request){
  const auth=adminSessionFromRequest(req);
  if(!auth)return NextResponse.json({success:false,error:'Admin authentication required.'},noStore(401));
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed)return NextResponse.json({success:false,error:origin.reason||'Cross-origin request denied.'},noStore(403));
  const body=await req.json().catch(()=>null) as any;
  try{
    const result=await runEstimatorRetention({
      actor:auth.sub,
      confirmation:String(body?.confirmation||''),
    });
    return NextResponse.json({success:true,result,retention:await previewEstimatorRetention()},noStore());
  }catch(error){
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Retention run failed.'},noStore(422));
  }
}
