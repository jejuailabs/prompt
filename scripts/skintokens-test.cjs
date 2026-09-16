// Bounded single-character smoke test. No paid automatic retries.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve('local-skintokens-test');
const recordPath = path.join(dir, 'deployment.json');
const image = 'ghcr.io/jejuailabs/playlab-skintokens@sha256:664ba37b000bc1c0fbff5d04e6f7d44616b4f1f2db6e01a6fa44d5ed778bfdef';
const donor = 'yuusogvb9kbzzb';
async function api(url, method = 'GET', data) {
  const r = await fetch(url, {method, headers: {Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json'}, ...(data ? {body: JSON.stringify(data)} : {}), signal: AbortSignal.timeout(60000)});
  if (!r.ok) throw Error(`RunPod ${r.status}: ${(await r.text()).slice(0,200)}`);
  return r.json();
}
const rest = (route, method, data) => api('https://rest.runpod.io/v1/'+route, method, data);
const save = r => fs.writeFileSync(recordPath, JSON.stringify(r,null,2));
async function main() {
  fs.mkdirSync(dir,{recursive:true});
  const mode=process.argv[2];
  let r=fs.existsSync(recordPath)?JSON.parse(fs.readFileSync(recordPath)):null;
  if(mode==='deploy') {
    if(r) throw Error('Deployment record exists: inspect instead of duplicating');
    const d=await rest('endpoints/'+donor);
    const h=await api(`https://api.runpod.ai/v2/${donor}/health`);
    if(d.workersMax!==2 || d.workersMin!==0 || h.jobs?.inProgress || h.jobs?.inQueue) throw Error('Donor baseline changed or busy');
    r={image,donor,previousMax:d.workersMax,state:'PREPARING',createdAt:new Date().toISOString()}; save(r);
    const t=await rest('templates','POST',{name:'playlab-skintokens-rigging',imageName:image,category:'NVIDIA',isServerless:true,isPublic:false,containerDiskInGb:35,volumeInGb:0,volumeMountPath:'/runpod-volume',dockerEntrypoint:[],dockerStartCmd:[],env:{}});
    r.templateId=t.id; save(r);
    await rest('endpoints/'+donor,'PATCH',{workersMax:1}); r.state='DONOR_REDUCED';save(r);
    try {
      const e=await rest('endpoints','POST',{name:'playlab-skintokens-test',templateId:t.id,gpuTypeIds:['NVIDIA A100-SXM4-80GB','NVIDIA A100 80GB PCIe'],gpuCount:1,workersMin:0,workersMax:1,idleTimeout:5,executionTimeoutMs:600000,scalerType:'QUEUE_DELAY',scalerValue:4});
      r.endpointId=e.id;r.state='DEPLOYED';save(r);
    } catch(e) {await rest('endpoints/'+donor,'PATCH',{workersMax:r.previousMax});r.state='DEPLOY_FAILED_DONOR_RESTORED';save(r);throw e;}
    console.log(JSON.stringify(r));
  } else if(mode==='submit') {
    if(!r?.endpointId || r.jobId || r.submissionAttemptedAt) throw Error('Missing deployment or already submitted');
    const file=process.argv[3]; const model=fs.readFileSync(file);
    r.submissionAttemptedAt=new Date().toISOString();save(r);
    const j=await api(`https://api.runpod.ai/v2/${r.endpointId}/run`,'POST',{input:{model_base64:model.toString('base64'),settings:{height_meters:1.7}},policy:{executionTimeout:600000,ttl:900000}});
    r.jobId=j.id;r.state=j.status;save(r);console.log(JSON.stringify({jobId:j.id,status:j.status}));
  } else if(mode==='status') {
    if(!r?.jobId) throw Error('No submitted job');
    const j=await api(`https://api.runpod.ai/v2/${r.endpointId}/status/${r.jobId}`);
    r.state=j.status;r.delayTime=j.delayTime;r.executionTime=j.executionTime;r.error=j.error;save(r);
    if(j.output) {
      fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(j.output.report??j.output,null,2));
      for(const [name,encoded] of Object.entries(j.output.files??{})) {
        if(!/^(rigged\.(glb|fbx)|unity-materials\.json|textures\/[\w.-]+\.png)$/.test(name)) continue;
        const target=path.join(dir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,Buffer.from(encoded,'base64'));
      }
    }
    console.log(JSON.stringify({status:j.status,delayTime:j.delayTime,executionTime:j.executionTime,error:j.error,report:j.output?.report,outputError:j.output?.error}));
  } else if(mode==='restore') {
    if(!r?.endpointId) throw Error('No endpoint');
    const health=await api(`https://api.runpod.ai/v2/${r.endpointId}/health`);
    if(health.jobs?.inProgress||health.jobs?.inQueue) throw Error('Test still running; wait or explicitly cancel first');
    await rest('endpoints/'+r.endpointId,'PATCH',{workersMin:0,workersMax:0});
    await rest('endpoints/'+donor,'PATCH',{workersMax:r.previousMax});
    r.restoredAt=new Date().toISOString();save(r);console.log('Test disabled; H3 test allocation restored');
  } else throw Error('Use deploy/submit/status/restore');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
