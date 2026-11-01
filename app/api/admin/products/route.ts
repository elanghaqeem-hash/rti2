import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import { listProductMaster,saveMasterProduct,saveMasterScope } from '@/lib/products/repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'no-store'};
function unauthorized() {return NextResponse.json({success:false,error:'Admin authentication required.'},{status:401,headers});}
function errorResponse(error:unknown) {
 const message = error instanceof Error ? error.message : 'Product master unavailable.';
 const invalid = /tidak valid|tidak ditemukan|sudah|Invalid/.test(message);
 return NextResponse.json({success:false,error:message},{status:invalid?400:503,headers});
}
function validate(input:unknown) {
 if(!input || typeof input !== 'object')throw new Error('Input tidak valid.');
 const x=input as Record<string,unknown>;
 const entity=x.entity==='scope'?'scope':'product',create=x.create===true;
 const name=String(x.name||'').trim(),active=x.is_active!==false&&x.is_active!==0;
 if(!name||name.length>220)throw new Error('Nama produk atau cakupan tidak valid.');
 if(entity==='product'){
  const sku=String(x.sku||'').trim().toUpperCase(),category_code=String(x.category_code||'').trim().toUpperCase();
  if(!/^RTI-(GRC|OFF|DEF|ADV|TAL|RES)-[0-9]{3,5}$/.test(sku)||sku.split('-')[1]!==category_code)throw new Error('SKU/pilar tidak valid.');
  const description=String(x.description||'').trim(),unit=String(x.unit||'project').trim();
  if(description.length>1500||!['project','day','month','year','session','participant','asset','service'].includes(unit))throw new Error('Deskripsi/satuan tidak valid.');
  return {entity,create,product:{sku,category_code,name,description,unit,is_active:active}};
 }
 const product_sku=String(x.product_sku||'').trim().toUpperCase();
 const id=String(x.id||'').trim(),sort_order=Number(x.sort_order??10);
 if(!/^RTI-(GRC|OFF|DEF|ADV|TAL|RES)-[0-9]{3,5}$/.test(product_sku)
    ||(!create&&!/^RTI-(GRC|OFF|DEF|ADV|TAL|RES)-[0-9]{3,5}-S[A-Z0-9]{2,16}$/.test(id))
    ||!Number.isInteger(sort_order)||sort_order<0||sort_order>100000)throw new Error('Scope tidak valid.');
 return {entity,create,scope:{id,product_sku,name,sort_order,is_active:active}};
}
export async function GET(req:Request){
 if(!adminSessionFromRequest(req))return unauthorized();
 try{return NextResponse.json({success:true,...await listProductMaster(true)},{headers});}
 catch{return NextResponse.json({success:false,error:'Database/migrasi Master Produk belum tersedia.'},{status:503,headers});}
}
export async function PUT(req:Request){
 const session=adminSessionFromRequest(req);if(!session)return unauthorized();
 try{
  const value=validate(await req.json().catch(()=>null));
  if(value.entity==='product')await saveMasterProduct(value.product!,session.sub,value.create);
  else await saveMasterScope(value.scope!,session.sub,value.create);
  return NextResponse.json({success:true},{headers});
 }catch(error){return errorResponse(error);}
}
export async function POST(req:Request){return PUT(req);}
