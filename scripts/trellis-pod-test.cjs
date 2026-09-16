const fs = require('node:fs');
const path = require('node:path');
const a100 = process.argv.includes('--a100');
const dir = path.resolve(a100 ? 'local-character-test/pod-a100' : 'local-character-test/pod-blackwell');
const file = path.join(dir, 'pod.json');
const name = a100 ? 'playlab-trellis-a100-test-20260916' : 'playlab-trellis-bounded-test-20260916';
async function api(route, method='GET', body) {
  const r = await fetch('https://rest.runpod.io/v1'+route, {method, headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'}, ...(body?{body:JSON.stringify(body)}:{}), signal:AbortSignal.timeout(45000)});
  if (!r.ok) throw Error('RunPod HTTP '+r.status+': '+(await r.text()).slice(0,300));
  return r.status===204?{}:r.json();
}
async function main() {
  const mode=process.argv[2];
  if(mode==='create') {
    if(fs.existsSync(file)) throw Error('Existing test record: inspect before resubmitting');
    if((await api('/pods')).some(p=>p.name===name)) throw Error('Pod already exists');
    const key=fs.readFileSync('local-h3-benchmark/id_ed25519.pub','utf8').trim();
    const template=await api('/templates/9e884o6s14');
    const boot='set -eu\napt-get update\napt-get install -y --no-install-recommends openssh-server\nmkdir -p /root/.ssh /run/sshd\nchmod 700 /root/.ssh\nprintf "%s\\n" "$PUBLIC_KEY" > /root/.ssh/authorized_keys\nchmod 600 /root/.ssh/authorized_keys\nssh-keygen -A\n/usr/sbin/sshd\necho TRELLIS_SSH_READY\nsleep 1800';
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(file,JSON.stringify({name,state:'SUBMITTING',createdAt:new Date().toISOString()}));
    const imageName=a100?'ghcr.io/jejuailabs/playlab-trellis-blackwell@sha256:cf14bff91491995c33f2fd48211f6418a3cd795c9213dd92289948f4df09d5ae':template.imageName;
    const gpuTypeIds=a100?['NVIDIA A100-SXM4-80GB','NVIDIA A100 80GB PCIe']:['NVIDIA RTX PRO 6000 Blackwell Server Edition'];
    const p=await api('/pods','POST',{name,imageName,cloudType:'SECURE',computeType:'GPU',gpuCount:1,gpuTypeIds,containerDiskInGb:100,volumeInGb:0,minVCPUPerGPU:8,minRAMPerGPU:64,supportPublicIp:true,ports:['22/tcp'],env:{...template.env,PUBLIC_KEY:key,NVIDIA_VISIBLE_DEVICES:'all',NVIDIA_DRIVER_CAPABILITIES:'compute,utility'},dockerEntrypoint:[],dockerStartCmd:['bash','-lc',boot]});
    fs.writeFileSync(file,JSON.stringify({id:p.id,name,createdAt:new Date().toISOString()},null,2));
    console.log(JSON.stringify({id:p.id,costPerHr:p.costPerHr}));
    if(p.costPerHr>(a100?1.62:2.12)) {await api('/pods/'+p.id,'DELETE');throw Error('Price exceeds approved rate; Pod deleted');}
    return;
  }
  const s=JSON.parse(fs.readFileSync(file));
  if(!s.id) throw Error('Uncertain creation; inspect named Pod first');
  const p=await api('/pods/'+s.id);
  if(p.name!==name) throw Error('Identity mismatch');
  if(mode==='delete') {await api('/pods/'+s.id,'DELETE');console.log('Test Pod deleted');return;}
  console.log(JSON.stringify({id:p.id,status:p.desiredStatus,publicIp:p.publicIp,portMappings:p.portMappings,costPerHr:p.costPerHr,runtime:p.runtime}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
