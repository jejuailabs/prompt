import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { LITTLE_WORLDS } from '@/lib/little-worlds';
export function builtinGame(id:string){return LITTLE_WORLDS.find(game=>'builtin-'+game.slug===id);}
export async function findPlayableGame(id:string){
  const builtin=builtinGame(id);
  const row=builtin?await db.artifact.findFirst({where:{type:'game',contentUrl:builtin.contentUrl},orderBy:{createdAt:'asc'}}):await db.artifact.findUnique({where:{id}});
  if(row&&(row.type!=='game'||row.status!=='published'||row.visibility!=='public'))throw new HttpError('플레이할 수 없는 게임입니다.',404);
  return row;
}
/** Register a shipped game once on its first authenticated score, without replacing legacy IDs. */
export async function ensureScoreGame(id:string){
  const existing=await findPlayableGame(id);if(existing)return existing;
  const game=builtinGame(id);if(!game)throw new HttpError('게임을 찾을 수 없습니다.',404);
  const admin=await db.profile.findFirst({where:{role:'admin',banned:false},select:{id:true}});
  if(!admin)throw new HttpError('랭킹 등록을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.',503);
  const row=await db.artifact.upsert({where:{id:'builtin-'+game.slug},update:{},create:{id:'builtin-'+game.slug,ownerId:admin.id,type:'game',title:game.title,description:game.description,contentUrl:game.contentUrl,fileUrl:game.fileUrl,sourceModule:'game-room',visibility:'public',status:'published',metadata:JSON.stringify({collection:'little-worlds',tags:game.tags,controls:game.controls,emoji:game.emoji,params:{palette:game.palette}})}});
  if(row.status!=='published'||row.visibility!=='public')throw new HttpError('플레이할 수 없는 게임입니다.',404);
  return row;
}
export function periodStart(period:string,now=new Date()){
  const kst=new Date(now.getTime()+9*3600000),year=kst.getUTCFullYear(),month=kst.getUTCMonth(),day=kst.getUTCDate();
  if(period==='all')return new Date(0);
  return new Date(Date.UTC(year,month,period==='month'?1:period==='week'?day-((kst.getUTCDay()+6)%7):day)-9*3600000);
}
