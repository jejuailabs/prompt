// GET rankings — each player's best score per game, numeric ranks, Korean date windows.
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { builtinGame, findPlayableGame, periodStart } from '@/lib/server/game-records';
export async function GET(req:Request){
  try{
    const params=new URL(req.url).searchParams,requested=params.get('gameId'),period=['today','week','month','all'].includes(params.get('period')??'')?params.get('period')!:'today';
    const limit=Math.max(1,Math.min(50,Math.floor(Number(params.get('limit'))||20)));
    let gameId=requested;if(requested){const game=await findPlayableGame(requested);if(!game&&builtinGame(requested))return ok({rankings:[],period});gameId=game?.id??requested;}
    const best=await db.gamePlay.groupBy({by:['artifactId','userId'],where:{score:{gt:0},userId:{not:null},user:{banned:false},createdAt:{gte:periodStart(period)},artifact:{type:'game',status:'published',visibility:'public',owner:{banned:false}},...(gameId?{artifactId:gameId}:{})},_max:{score:true}});
    const entries=best.sort((a,b)=>(b._max.score??0)-(a._max.score??0)||(a.userId??'').localeCompare(b.userId??'')||a.artifactId.localeCompare(b.artifactId)).slice(0,limit);
    const details=await Promise.all(entries.map(entry=>db.gamePlay.findFirst({where:{artifactId:entry.artifactId,userId:entry.userId,score:entry._max.score??0,createdAt:{gte:periodStart(period)}},orderBy:{createdAt:'asc'},include:{user:{select:{id:true,username:true,avatarUrl:true}},artifact:{select:{id:true,title:true}}}})));
    const rankings=details.filter(play=>play&&play.user).map((play,index)=>({rank:index+1,userId:play!.user!.id,username:play!.user!.username,avatarUrl:play!.user!.avatarUrl,score:play!.score,gameId:play!.artifact.id,gameTitle:play!.artifact.title,playedAt:play!.createdAt.toISOString()}));
    return ok({rankings,period});
  }catch(error){return fail(error);}
}
