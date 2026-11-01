import { NextResponse } from 'next/server';
import { listProductMaster } from '@/lib/products/repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const catalog = await listProductMaster();
    return NextResponse.json({success:true,...catalog}, {
      headers:{'Cache-Control':'no-store'},
    });
  } catch {
    return NextResponse.json({
      success:false,error:'Master Produk belum siap. Database/migrasi produk perlu diaktifkan oleh Admin.',
    },{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
