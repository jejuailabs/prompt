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

// DELETE — remove a video lesson from the academy: its standalone lesson and its
// place in every course. A course that would be left with fewer than two videos
// blocks the delete so no course silently turns into a single-video lesson.
// The shared YouTube analysis cache is kept (the summary tool uses it too).
export async function DELETE(_req:NextRequest,{params}:{params:Promise<{lessonId:string}>}) {
  try {
    await requireAdmin();
    const {lessonId}=await params;
    await db.$transaction(async tx=>{
      const lesson=await tx.academyVideo.findFirst({where:{id:lessonId,playlist:{published:true}}});
      if(!lesson) throw new HttpError('강의 영상을 찾을 수 없어요.',404);
      const collections=await tx.academyPlaylist.findMany({where:{published:true,videos:{some:{videoId:lesson.videoId}}},include:{videos:{orderBy:{sortOrder:'asc'}}}});
      const courses=collections.filter(c=>c.videos.length>=2);
      const blocking=courses.filter(c=>c.videos.length<=2);
      if(blocking.length) throw new HttpError(`이 영상이 들어 있는 강의 "${blocking.map(c=>c.title).join('", "')}"는 영상이 두 개뿐이라 삭제할 수 없어요. 강의에 다른 영상을 추가하거나 강의 묶음을 먼저 해제해주세요.`,409);
      for(const course of courses){
        await tx.academyVideo.deleteMany({where:{playlistId:course.id,videoId:lesson.videoId}});
        for(const [sortOrder,entry] of course.videos.filter(v=>v.videoId!==lesson.videoId).entries()) await tx.academyVideo.update({where:{id:entry.id},data:{sortOrder}});
      }
      const standalone=collections.filter(c=>c.videos.length===1).map(c=>c.id);
      if(standalone.length) await tx.academyPlaylist.deleteMany({where:{id:{in:standalone}}});
    },{isolationLevel:'Serializable',timeout:30_000});
    return ok(null);
  } catch(e) { return fail(e); }
}
