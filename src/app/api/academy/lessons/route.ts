import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin,HttpError } from '@/lib/auth';
import { fail,ok,readJson } from '@/lib/server/handler';
import { createLessonSchema,youtubeVideoId } from '@/modules/academy/curriculum';
import { getAcademyLibrary } from '@/lib/server/academy-library';
import { analyzeAcademyVideo } from '@/lib/server/academy';

export const maxDuration=300;
export async function POST(req:NextRequest) {
  try {
    const admin=await requireAdmin();
    const parsed=createLessonSchema.safeParse(await readJson<unknown>(req));
    if(!parsed.success) throw new HttpError(parsed.error.issues[0]?.message??'영상 정보를 확인해주세요.');
    const body=parsed.data;
    const videoId=youtubeVideoId(body.url)!;
    // Already registered: reopen that lesson instead of refusing. Re-run the
    // transcript/study-note extraction when it never finished (e.g. a provider
    // outage), so registering the same URL again is a way to retry.
    const existing=await db.academyVideo.findFirst({where:{videoId,playlist:{published:true}},include:{analysis:{select:{status:true}}},orderBy:{createdAt:'asc'}});
    if(existing){
      if(body.studyContent.trim()&&existing.analysisId) await db.youtubeAnalysis.update({where:{id:existing.analysisId},data:{studyContent:body.studyContent,status:'done',error:null}});
      else if(body.analyze&&existing.analysis?.status!=='done') await analyzeAcademyVideo(existing.id,admin.id);
      if(body.title) await db.academyVideo.updateMany({where:{videoId},data:{title:body.title}});
      const library=await getAcademyLibrary();
      return ok({...library.lessons.find(lesson=>lesson.videoId===videoId),existing:true});
    }
    const collection=await db.$transaction(async tx=>{
      if(await tx.academyVideo.findFirst({where:{videoId,playlist:{published:true}}})) throw new HttpError('방금 같은 영상이 등록됐어요. 목록을 새로고침해주세요.',409);
      const analysis=await tx.youtubeAnalysis.upsert({where:{videoId},update:{},create:{videoId,sourceUrl:`https://www.youtube.com/watch?v=${videoId}`,thumbnailUrl:`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}});
      if(body.studyContent.trim()) await tx.youtubeAnalysis.update({where:{id:analysis.id},data:{studyContent:body.studyContent,status:'done',error:null}});
      const title=body.title||analysis.title||`YouTube 영상 ${videoId}`;
      return tx.academyPlaylist.create({data:{title,description:body.description,thumbnailUrl:analysis.thumbnailUrl,published:true,videos:{create:[{videoId,title,description:body.description.slice(0,500),thumbnailUrl:analysis.thumbnailUrl,analysisId:analysis.id,sortOrder:0}]}},include:{videos:true}});
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    const video=collection.videos[0];
    const cached=await db.youtubeAnalysis.findUnique({where:{id:video.analysisId!},select:{status:true}});
    if(body.analyze&&!body.studyContent.trim()&&cached?.status!=='done') await analyzeAcademyVideo(video.id,admin.id);
    if(body.title) await db.academyVideo.update({where:{id:video.id},data:{title:body.title}});
    const library=await getAcademyLibrary();
    return ok(library.lessons.find(lesson=>lesson.videoId===videoId),201);
  } catch(e) { return fail(e); }
}
