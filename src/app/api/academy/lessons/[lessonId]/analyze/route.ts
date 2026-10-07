import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin,HttpError } from '@/lib/auth';
import { fail,ok } from '@/lib/server/handler';
import { analyzeAcademyVideo } from '@/lib/server/academy';
export const maxDuration=300;
export async function POST(_req:NextRequest,{params}:{params:Promise<{lessonId:string}>}) {
  try {
    const admin=await requireAdmin(); const {lessonId}=await params;
    if(!await db.academyVideo.findFirst({where:{id:lessonId,playlist:{published:true}}})) throw new HttpError('강의 영상을 찾을 수 없어요.',404);
    const result = await analyzeAcademyVideo(lessonId,admin.id);
    if (!result) throw new HttpError('강의 영상을 찾을 수 없어요.',404);
    return ok(result);
  } catch(e) { return fail(e); }
}
