const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');const sharp=require('sharp');
function load(file,mocks={},globals={}) {
  const exports={},absolute=path.resolve(file);
  const req=name=>{if(name in mocks)return mocks[name];if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);const target=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(absolute),name);return load(target.endsWith('.ts')?target:target+'.ts',mocks,globals);};
  const js=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(js,{exports,require:req,process,URL,URLSearchParams,Request,Response,File,FormData,Buffer,Date,console,...globals});return exports;
}
class HttpError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function fixture(){
  const rows=new Map(),uploaded=[],removed=[];let identity=null,failCreate=false,seq=0;
  const admin={id:'admin-1',role:'admin'},member={id:'member-1',role:'user'};
  const requireUser=async()=>{if(!identity)throw new HttpError('로그인이 필요합니다',401);return identity;};
  const requireAdmin=async()=>{const u=await requireUser();if(u.role!=='admin')throw new HttpError('관리자 권한이 필요합니다',403);return u;};
  const create=async({data})=>{if(failCreate)throw new HttpError('저장 실패',503);const row={id:'event-'+(++seq),metadata:'{}',fileUrl:null,title:'',description:'',ownerId:admin.id,type:'text',sourceModule:'ai-events',status:'published',visibility:'unlisted',createdAt:new Date('2026-10-07T01:00:00Z'),owner:{username:'관리자'},...data};rows.set(row.id,row);return row;};
  const update=async({where,data})=>{const row=rows.get(where.id);Object.assign(row,data);return row;};
  const db={artifact:{findUnique:async({where})=>rows.get(where.id)??null,findMany:async({where})=>[...rows.values()].filter(r=>r.sourceModule===where.sourceModule&&r.type===where.type&&where.status.in.includes(r.status)&&where.visibility.in.includes(r.visibility)),create,update,upsert:async opts=>rows.has(opts.where.id)?update({where:opts.where,data:opts.update}):create({data:opts.create})}};
  const mocks={'@/lib/auth':{HttpError,requireUser,requireAdmin},'@/lib/db':{db},'@/lib/server/storage':{uploadBuffer:async(p,data,type)=>{uploaded.push({p,data,type});return 'https://storage.test/storage/v1/object/public/uploads/'+p;},removeUpload:async p=>removed.push(p)}};
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://storage.test';
  const api=load('src/app/api/ai-events/route.ts',mocks),single=load('src/app/api/ai-events/[id]/route.ts',mocks),server=load('src/modules/ai-events/server.ts',mocks),input=load('src/modules/ai-events/input.ts',mocks);
  return {api,single,server,input,db,mocks,rows,uploaded,removed,admin,member,auth:u=>identity=u,failCreate:()=>failCreate=true};
}
const valid={kind:'course',title:'관리자 AI 워크숍',organizer:'PLAYLAB',summary:'AI 도구를 배우는 실습 수업입니다.',schedule:'2026년 10월 14일 오후 7시',sourceUrl:'https://example.org/course',applyUntil:'2026-10-12',startsAt:'2026-10-14T19:00',endsAt:'2026-10-14T21:00',tags:'입문, 실습'};
function form(data=valid,file){const body=new FormData();body.set('data',JSON.stringify(data));if(file)body.set('poster',file);return new Request('https://playlab.test/api/ai-events',{method:'POST',body});}
const context=id=>({params:Promise.resolve({id})});const publicRequest=()=>new Request('https://playlab.test/api/ai-events');
const json=data=>new Request('https://playlab.test/api/ai-events/x',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
async function data(response){return (await response.json()).data;}

test('anonymous and ordinary members cannot register, edit, change visibility or access management',async()=>{
  const f=fixture();for(const [u,status] of [[null,401],[f.member,403]]){f.auth(u);assert.equal((await f.api.POST(form())).status,status);assert.equal((await f.single.PUT(form(),context('ai-festa-2026'))).status,status);assert.equal((await f.single.PATCH(json({published:false}),context('ai-festa-2026'))).status,status);assert.equal((await f.api.GET(new Request('https://playlab.test/api/ai-events?scope=manage'))).status,status);}
  assert.equal(f.rows.size,0);assert.equal(f.uploaded.length,0);
});
test('admin registration persists, reloads publicly, edits and reversibly archives without duplicating records',async()=>{
  const f=fixture();f.auth(f.admin);const response=await f.api.POST(form());assert.equal(response.status,201);const created=await data(response);assert.equal(created.startsAt,'2026-10-14T19:00+09:00');assert.equal(created.ownerId,f.admin.id);
  assert.ok((await data(await f.api.GET(publicRequest()))).some(item=>item.id===created.id));
  assert.equal((await f.single.PUT(form({...valid,title:'수정한 수업'}),context(created.id))).status,200);assert.equal(f.rows.size,1);
  assert.equal((await f.single.PATCH(json({published:false}),context(created.id))).status,200);assert.ok(!(await data(await f.api.GET(publicRequest()))).some(item=>item.id===created.id));
  const managed=await data(await f.api.GET(new Request('https://playlab.test/api/ai-events?scope=manage')));assert.equal(managed.find(item=>item.id===created.id).published,false);
  assert.equal((await f.single.PATCH(json({published:true}),context(created.id))).status,200);assert.ok((await data(await f.api.GET(publicRequest()))).some(item=>item.id===created.id));
});
test('editing, hiding and restoring the built-in catalogue keeps the original deep-link identity',async()=>{
  const f=fixture();f.auth(f.admin);const id='ai-festa-2026';assert.equal((await f.single.PUT(form({...valid,title:'수정된 페스타'}),context(id))).status,200);
  let list=await data(await f.api.GET(publicRequest()));assert.equal(list.filter(x=>x.id===id).length,1);assert.equal(list.find(x=>x.id===id).title,'수정된 페스타');
  await f.single.PATCH(json({published:false}),context(id));list=await data(await f.api.GET(publicRequest()));assert.ok(!list.some(x=>x.id===id));
  await f.single.PATCH(json({published:true}),context(id));assert.equal((await data(await f.api.GET(publicRequest()))).filter(x=>x.id===id).length,1);
  const seed='claude-first-class';await f.single.PATCH(json({published:false}),context(seed));assert.ok(!(await data(await f.api.GET(publicRequest()))).some(x=>x.id===seed));
});
test('writes reject another module and never rewrite its record',async()=>{
  const f=fixture();f.auth(f.admin);f.rows.set('other',{id:'other',sourceModule:'academy',type:'text',ownerId:f.admin.id});
  assert.equal((await f.single.PUT(form(),context('other'))).status,404);assert.equal((await f.single.PATCH(json({published:false}),context('other'))).status,404);assert.equal(f.rows.get('other').sourceModule,'academy');
});
test('HTTPS links, valid calendar dates and chronological ranges are enforced before saving',async()=>{
  const f=fixture();f.auth(f.admin);
  for(const change of [{sourceUrl:'javascript:alert(1)'},{sourceUrl:'bad-url'},{sourceUrl:'https://name:secret@example.org'},{applyUntil:'2026-02-30'},{applyUntil:'2026-13-01'},{applyFrom:'2026-10-20',applyUntil:'2026-10-12'},{endsAt:'2026-10-14T18:00'},{applyTime:'25:00'},{posterText:'a\nb\nc\nd\ne'}])assert.equal((await f.api.POST(form({...valid,...change}))).status,400,JSON.stringify(change));
  assert.equal(f.rows.size,0);
});
test('real image decoding normalizes an uploaded PNG, rejects spoofed MIME and oversized files',async()=>{
  const f=fixture();f.auth(f.admin);const bytes=await sharp({create:{width:60,height:80,channels:3,background:'#23433d'}}).png().toBuffer();
  const result=await f.api.POST(form(valid,new File([bytes],'poster.png',{type:'image/png'})));assert.equal(result.status,201);const item=await data(result);assert.ok(item.posterUrl.includes('/ai-events/admin-1/'));assert.equal(f.uploaded[0].type,'image/webp');assert.equal((await sharp(f.uploaded[0].data).metadata()).format,'webp');
  assert.equal((await f.api.POST(form(valid,new File(['<script>bad</script>'],'fake.png',{type:'image/png'})))).status,400);
  assert.equal((await f.api.POST(form(valid,new File([Buffer.alloc(3*1024*1024+1)],'large.png',{type:'image/png'})))).status,400);assert.equal(f.rows.size,1);
});
test('image replacement and removal preserve the record; a failed save cleans up the new upload',async()=>{
  const f=fixture();f.auth(f.admin);const bytes=await sharp({create:{width:60,height:80,channels:3,background:'#23433d'}}).png().toBuffer();const file=()=>new File([bytes],'poster.png',{type:'image/png'});
  const item=await data(await f.api.POST(form(valid,file())));const edited=await data(await f.single.PUT(form({...valid,title:'유지 테스트'}),context(item.id)));assert.equal(edited.posterUrl,item.posterUrl);
  const removed=await data(await f.single.PUT(form({...valid,removePoster:true}),context(item.id)));assert.equal(removed.posterUrl,undefined);
  f.failCreate();assert.equal((await f.api.POST(form(valid,file()))).status,503);assert.equal(f.removed.length,1);assert.equal(f.rows.size,1);
});
test('generic artifact routes cannot bypass the administrator-only event policy',async()=>{
  const f=fixture();f.auth(f.member);f.rows.set('event-1',{id:'event-1',ownerId:f.member.id,sourceModule:'ai-events',type:'text'});
  const generic=load('src/app/api/artifacts/route.ts',{...f.mocks,'@/lib/supabase/admin':{},'@/lib/server/serialize':{},'@/lib/events':{}});
  const single=load('src/app/api/artifacts/[id]/route.ts',{...f.mocks,'@/lib/server/serialize':{},'@/lib/events':{},'@/lib/server/publish-to-prompt':{}});
  assert.equal((await generic.POST(json({sourceModule:'ai-events',type:'text',title:'우회'}))).status,403);
  assert.equal((await single.PATCH(json({title:'우회'}),context('event-1'))).status,403);assert.equal((await single.DELETE(json({}),context('event-1'))).status,403);assert.equal(f.rows.size,1);
});

test('title posters retain complete words and do not truncate long titles',()=>{
  const {input}=fixture();assert.deepEqual(Array.from(input.titleLines('AI 실무 워크숍')),['AI 실무','워크숍']);
  const title='가'.repeat(100),lines=input.titleLines(title);assert.ok(lines.length<=4);assert.equal(lines.join(''),title);
});
