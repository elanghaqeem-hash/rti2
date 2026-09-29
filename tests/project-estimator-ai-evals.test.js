import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const suite=JSON.parse(fs.readFileSync(path.join(root,'tests/ai-evals/project-estimator-scenarios.json'),'utf8'));

test('Estimator F6 AI eval suite contains at least 30 synthetic scenarios',()=>{
  assert.equal(suite.synthetic,true);
  assert.ok(Array.isArray(suite.scenarios));
  assert.ok(suite.scenarios.length>=30);
  assert.equal(new Set(suite.scenarios.map((item)=>item.id)).size,suite.scenarios.length);
});

test('Estimator F6 AI eval suite covers required scoping domains',()=>{
  const services=new Set(suite.scenarios.map((item)=>item.serviceCode));
  for(const service of ['SWDEV-WEB','SWDEV-MOB','SWDEV-API','SWDEV-AI','SUPPORT','VAPT-WEB','VAPT-MOB','VAPT-API','VAPT-NET','CODEREV','GOV-ISO','GOV-PDP','GOV-AUDIT','ADVISORY','TRAIN']){
    assert.ok(services.has(service),service+' scenario missing');
  }
});

test('Estimator F6 AI eval suite covers prompt injection, unknown answers and risk flags',()=>{
  assert.ok(suite.scenarios.some((item)=>item.expectedRiskFlags?.includes('PROMPT_INJECTION_IN_DOC')));
  assert.ok(suite.scenarios.some((item)=>item.unknownHeavy===true));
  assert.ok(suite.scenarios.some((item)=>item.expectedRiskFlags?.includes('UNREALISTIC_TIMELINE')));
  assert.ok(suite.scenarios.some((item)=>item.expectedRiskFlags?.includes('REGULATED_DATA')));
  assert.ok(suite.scenarios.every((item)=>item.mustNotInventNumbers===true));
});

test('Estimator F6 eval harness enforces target thresholds in live mode',()=>{
  const script=fs.readFileSync(path.join(root,'scripts/run-estimator-ai-evals.mjs'),'utf8');
  assert.match(script,/extractionAccuracy<0\.90/);
  assert.match(script,/flagAccuracy<1/);
  assert.match(script,/hallucinations!==0/);
  assert.match(script,/questions\.length>3/);
  assert.match(script,/RUN_LIVE_AI_EVALS/);
});
