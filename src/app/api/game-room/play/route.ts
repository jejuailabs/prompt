// POST /api/game-room/play — finite integer scores, authenticated rankings and one record per round.
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { getSessionUser, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { builtinGame, ensureScoreGame, findPlayableGame } from '@/lib/server/game-records';
export async function POST(req: Request) {
  try {
    const body=await readJson<{artifactId?:unknown;durationMs?:unknown;score?:unknown;roundId?:unknown}>(req);
    if(typeof body.artifactId!=='string'||!body.artifactId||body.artifactId.length>120)throw new HttpError('게임을 선택해주세요.',400);
    const score=body.score??0,durationMs=body.durationMs??0;
    if(typeof score!=='number'||!Number.isSafeInteger(score)||score<0||score>100000000)throw new HttpError('올바른 점수가 아닙니다.',400);
    if(typeof durationMs!=='number'||!Number.isSafeInteger(durationMs)||durationMs<0||durationMs>86400000)throw new HttpError('올바른 플레이 시간이 아닙니다.',400);
    if(body.roundId!==undefined&&(typeof body.roundId!=='string'||!/^\w[\w-]{7,79}$/.test(body.roundId)))throw new HttpError('올바른 라운드가 아닙니다.',400);
    const user=await getSessionUser().catch(()=>null);
    if(score>0&&!user)throw new HttpError('로그인하면 점수를 랭킹에 남길 수 있습니다.',401);
    const game=score>0?await ensureScoreGame(body.artifactId):await findPlayableGame(body.artifactId);
    if(!game){if(builtinGame(body.artifactId))return ok({recorded:false});throw new HttpError('게임을 찾을 수 없습니다.',404);}
    const data={artifactId:game.id,userId:user?.id??null,durationMs,score};
    let recorded;
    if(score>0&&body.roundId){const id='round-'+createHash('sha256').update(game.id+':'+user!.id+':'+body.roundId).digest('hex');recorded=await db.gamePlay.upsert({where:{id},update:{},create:{id,...data}});}
    else recorded=await db.gamePlay.create({data});
    return ok({recorded:true,ranked:score>0,gameId:game.id,score:recorded.score});
  } catch(error){return fail(error);}
}
