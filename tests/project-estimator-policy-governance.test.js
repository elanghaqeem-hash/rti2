import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('Estimator F6 policy governance migration tracks simulations and K-1 through K-8',()=>{
  const sql=read('migrations/0009_project_estimator_policy_governance.sql');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS estimator_policy_simulations/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS estimator_policy_publish_checks/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS estimator_go_live_decisions/i);
  for(let i=1;i<=8;i++) assert.match(sql,new RegExp("'K-"+i+"'"));
});

test('Estimator F6 policy API is admin protected',()=>{
  const route=read('app/api/v1/admin/project-estimator/policy/route.ts');
  assert.match(route,/adminSessionFromRequest/);
  assert.match(route,/Admin authentication required/);
  assert.match(route,/publishEstimatorPolicy/);
  assert.match(route,/simulateEstimatorPolicy/);
});

test('Estimator F6 simulation is capped at twenty latest sessions and uses deterministic pricing bands',()=>{
  const service=read('lib/project-estimator/policy.ts');
  assert.match(service,/Math\.min\(20/);
  assert.match(service,/ORDER BY pe\.created_at DESC/);
  assert.match(service,/computePricingBands/);
  assert.match(service,/internal BoQ \/ quotation cost/i);
});

test('Estimator F6 publish gate blocks uncalibrated data and open decisions',()=>{
  const service=read('lib/project-estimator/policy.ts');
  for(const code of ['RATE_CARD','CLIENT_SEGMENTS','APPROVAL_MATRIX','OPEN_DECISIONS','POLICY_SIMULATION']){
    assert.match(service,new RegExp(code));
  }
  assert.match(service,/checks\.every\(\(check\) => check\.status !== 'block'\)/);
  assert.match(service,/PUBLISH RTI POLICY/);
});

test('Estimator F6 policy remains draft until explicit publish',()=>{
  const migration=read('migrations/0006_project_estimator_ai_scoping.sql');
  const service=read('lib/project-estimator/policy.ts');
  assert.match(migration,/'policy-2026-1'[\s\S]*'draft'/);
  assert.match(service,/Only a draft policy can be published/);
  assert.match(service,/SET status='active'/);
});

test('Estimator admin mutation returns resolved dashboard rather than a Promise',()=>{
  const route=read('app/api/v1/admin/project-estimator/route.ts');
  assert.match(route,/dashboard: await getEstimatorAdminDashboard\(\)/);
});

test('Estimator F6 policy UI exposes simulation and controlled publication',()=>{
  const page=read('app/admin/project-estimator/policy/page.tsx');
  assert.match(page,/Simulate Last 20 Sessions/);
  assert.match(page,/Go-Live Decisions K-1–K-8/);
  assert.match(page,/Run Publish Checks/);
  assert.match(page,/PUBLISH RTI POLICY/);
});
