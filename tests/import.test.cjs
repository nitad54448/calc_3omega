const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const parser=html.slice(html.indexOf('function parseData(text){'),html.indexOf('async function handleFileSelect'));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:undefined;
const ctx=vm.createContext({finite:Number.isFinite,d3:{mean,deviation:a=>a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/(a.length-1)):undefined}});
vm.runInContext(parser,ctx);
const header='time /sec\ttemp /K\tcurrent /mA\tfreq /Hz\tR0 /Ohms\tesd R0\tV3X /V_rms\tesd V3X\tV3Y /V_rms\tesd V3Y\tData_Valid?';
const body='***\n--- > R0 : 65.73348\n'+header+'\n0 291.96 17.81996 12 65.73348 0 0.0001214 0.0000003 -0.0000742 0.0000002 1\n';
test('versioned measurements retain temperature and convert peak mA to RMS A exactly once', () => {
  const r=ctx.parseData(JSON.stringify({data_format:'3omega-measurements-v1',conversion_source:'sim.html output'})+'\n'+body);
  assert.equal(r.skipped,0);assert.equal(r.datasets.length,1);
  const d=r.datasets[0];assert.equal(d.avg_temp,291.96);assert.equal(d.data[0].isValid,true);
  assert.equal(d.data[0].current,17.81996*1e-3/Math.sqrt(2));
  assert.equal(d.data[0].v3_in_phase,0.0001214);assert.equal(d.data[0].v3_out_of_phase,-0.0000742);
});
test('old converter JSON is rejected with reconversion instructions', () => {
  assert.throws(()=>ctx.parseData(JSON.stringify({conversion_source:'sim.html output'})+'\n'+body),/old converter format.*Reconvert/);
});
test('the old Phase3 header is rejected even without JSON', () => {
  assert.throws(()=>ctx.parseData(body.replace(header,'time /sec I /mA Ipeak /mA freq /Hz V1 /V Phase1 /deg V3x /V esdV3X /V V3y /V esdV3Y /V Phase3 /deg')),/Phase3 column is not a validity flag/);
});
test('unknown versioned formats are rejected', () => {
  assert.throws(()=>ctx.parseData('{"data_format":"3omega-measurements-v2"}\n'+body),/Unsupported measurement format/);
});
test('native files without a format marker remain supported and invalid rows stay excluded', () => {
  const r=ctx.parseData(body+'1 100 17.81996 1 65.73348 0 0.0002 0 -0.00008 0 0\n');
  assert.equal(r.datasets[0].avg_temp,291.96);
  assert.deepEqual(Array.from(r.datasets[0].data,d=>d.isValid),[true,false]);
});
test('bundled instrument files retain all datasets and recorded temperatures', () => {
  const counts={'data__single_current.txt':3,'data__27-07-2025 00-04-35.dat':6,'data__29-07-2025 13-28-59.dat':20,'2D_3omega_text new config WB__11-08-2025 15-40-52.dat':59};
  for(const [file,count] of Object.entries(counts)) {
    const r=ctx.parseData(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
    assert.equal(r.datasets.length,count,file);
    assert(r.datasets.some(d=>d.data.some(row=>row.isValid)),file);
    if(file==='data__27-07-2025 00-04-35.dat')assert(r.datasets.every(d=>Number.isNaN(d.avg_temp)),file);
    else assert(r.datasets.every(d=>d.avg_temp>0&&d.avg_temp<1000),file);
  }
});
test('all inline scripts parse and release versions are consistent', () => {
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
  assert(html.includes('v4.0.4'));assert(!html.includes('4.0.3'));
  const pkg=require('../package.json'),lock=require('../package-lock.json');
  assert.equal(pkg.version,'1.0.1');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
});
