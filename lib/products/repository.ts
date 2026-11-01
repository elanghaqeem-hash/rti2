import { getRuntimeDatabase } from '@/lib/server/runtime-database';

export type ProductCategory = {
  code: string; name: string; sort_order: number; is_supporting: number; is_active: number;
};
export type MasterProduct = {
  sku: string; category_code: string; name: string; description: string;
  unit: string; price_amount: number | null; currency: string;
  is_active: number; source_ref: string;
  scopes: MasterScope[];
};
export type MasterScope = {
  id: string; product_sku: string; name: string; sort_order: number; is_active: number;
};
export type ProductCatalog = { categories: ProductCategory[]; products: MasterProduct[] };

export async function listProductMaster(includeInactive = false): Promise<ProductCatalog> {
  const db = await getRuntimeDatabase();
  const categories = await db.queryAll<ProductCategory>(
    'SELECT code,name,sort_order,is_supporting,is_active FROM rti_product_categories ' +
    (includeInactive ? '' : 'WHERE is_active = 1 ') + 'ORDER BY sort_order,code',
  );
  const products = await db.queryAll<Omit<MasterProduct, 'scopes'>>(
    'SELECT sku,category_code,name,description,unit,price_amount,currency,is_active,source_ref ' +
    'FROM rti_products ' + (includeInactive ? '' : 'WHERE is_active = 1 ') + 'ORDER BY category_code,sku',
  );
  const scopes = await db.queryAll<MasterScope>(
    'SELECT id,product_sku,name,sort_order,is_active FROM rti_product_scopes ' +
    (includeInactive ? '' : 'WHERE is_active = 1 ') +
    'ORDER BY product_sku,sort_order,id',
  );
  const bySku = new Map<string,MasterScope[]>();
  for (const scope of scopes) bySku.set(scope.product_sku,[...(bySku.get(scope.product_sku)||[]),scope]);
  const activeCategoryCodes = new Set(categories.map(item=>item.code));
  return {
    categories,
    products: products.filter(product=>activeCategoryCodes.has(product.category_code))
      .map(product=>({...product,scopes:bySku.get(product.sku)||[]})),
  };
}

export type ProductInput = {
  sku: string; category_code: string; name: string; description: string;
  unit: string; is_active: boolean;
};
export async function saveMasterProduct(
  input: ProductInput, actor: string, create = false,
) {
  const db = await getRuntimeDatabase();
  const previous = await db.queryOne<Record<string,unknown>>(
    'SELECT sku,category_code,name,description,unit,is_active FROM rti_products WHERE sku = ?',
    [input.sku],
  );
  if (create && previous) throw new Error('SKU sudah digunakan.');
  if (!create && !previous) throw new Error('Produk tidak ditemukan.');
  const category = await db.queryOne<{code:string}>(
    'SELECT code FROM rti_product_categories WHERE code = ?', [input.category_code],
  );
  if (!category) throw new Error('Pilar produk tidak valid.');
  const next = {...input,is_active:input.is_active?1:0};
  const eventId = crypto.randomUUID();
  const queries = create ? [
    {
      sql: `INSERT INTO rti_products(sku,category_code,name,description,unit,is_active)
            VALUES (?,?,?,?,?,?)`,
      params:[next.sku,next.category_code,next.name,next.description,next.unit,next.is_active],
    },
  ] : [
    {
      sql: `UPDATE rti_products SET category_code=?, name=?, description=?, unit=?, is_active=?,
            updated_at=CURRENT_TIMESTAMP WHERE sku=?`,
      params:[next.category_code,next.name,next.description,next.unit,next.is_active,next.sku],
    },
  ];
  await db.batch([
    ...queries,
    {
      sql: `INSERT INTO rti_product_events(id,actor,action,target_type,target_id,before_json,after_json)
            VALUES (?,?,?,?,?,?,?)`,
      params:[eventId,actor,create?'CREATE':'UPDATE','product',next.sku,
        previous?JSON.stringify(previous):null,JSON.stringify(next)],
    },
  ]);
}

export type ScopeInput = {
  id?: string; product_sku: string; name: string; sort_order: number; is_active: boolean;
};
export async function saveMasterScope(input: ScopeInput, actor: string, create = false) {
  const db = await getRuntimeDatabase();
  const product = await db.queryOne<{sku:string}>(
    'SELECT sku FROM rti_products WHERE sku = ?', [input.product_sku],
  );
  if (!product) throw new Error('Produk induk tidak ditemukan.');
  const id = create ? input.product_sku + '-S' + crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase() : input.id;
  if (!id) throw new Error('Scope ID tidak valid.');
  const old = await db.queryOne<MasterScope>(
    'SELECT id,product_sku,name,sort_order,is_active FROM rti_product_scopes WHERE id = ?', [id],
  );
  if (create && old) throw new Error('Scope ID sudah ada.');
  if (!create && (!old || old.product_sku!==input.product_sku)) throw new Error('Scope tidak ditemukan.');
  const next = {...input,id,is_active:input.is_active?1:0};
  await db.batch([
    create ? {
      sql: 'INSERT INTO rti_product_scopes(id,product_sku,name,sort_order,is_active) VALUES (?,?,?,?,?)',
      params:[id,input.product_sku,input.name,input.sort_order,next.is_active],
    } : {
      sql: 'UPDATE rti_product_scopes SET name=?,sort_order=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND product_sku=?',
      params:[input.name,input.sort_order,next.is_active,id,input.product_sku],
    },
    {
      sql: 'INSERT INTO rti_product_events(id,actor,action,target_type,target_id,before_json,after_json) VALUES (?,?,?,?,?,?,?)',
      params:[crypto.randomUUID(),actor,create?'CREATE':'UPDATE','scope',id,
        old?JSON.stringify(old):null,JSON.stringify(next)],
    },
  ]);
  return id;
}
