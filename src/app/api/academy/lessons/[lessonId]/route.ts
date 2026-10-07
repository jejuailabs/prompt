import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin,HttpError } from '@/lib/auth';
import { fail,ok,readJson } from '@/lib/server/handler';
const schema=z.object({title:z.string().trim().min(1).max(160),description:z.string().max(500),studyContent:z.string().max(50000)});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{lessonId:string}>}) {
  try {
    await requireAdmin();
    const {lessonId}=await params;
    const parsed=schema.safeParse(await readJson<unknown>(req));
    if(!parsed.success) throw new HttpError('영상 제목과 학습내용을 확인해주세요.');
    await db.$transaction(async tx=>{
      const lesson=await tx.academyVideo.findFirst({where:{id:lessonId,playlist:{published:true}}});
      if(!lesson) throw new HttpError('강의 영상을 찾을 수 없어요.',404);
      const analysisId = lesson.analysisId ?? (await tx.youtubeAnalysis.upsert({where:{videoId:lesson.videoId},update:{},create:{videoId:lesson.videoId,sourceUrl:'https://www.youtube.com/watch?v='+lesson.videoId,title:lesson.title}})).id;
      await tx.academyVideo.updateMany({where:{videoId:lesson.videoId},data:{title:parsed.data.title,description:parsed.data.description,analysisId}});
      await tx.youtubeAnalysis.update({where:{id:analysisId},data:{studyContent:parsed.data.studyContent,...(parsed.data.studyContent.trim()?{status:'done',error:null}:{})}});
    });
    return ok(null);
  } catch(e) { return fail(e); }
}
