import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';
import { buildAcademyLibrary } from '@/modules/academy/curriculum';

export const academyInclude = { videos: { orderBy: { sortOrder: 'asc' as const }, include: { analysis: true } } };
type CollectionRow = Prisma.AcademyPlaylistGetPayload<{ include: typeof academyInclude }>;
type VideoRow = CollectionRow['videos'][number];

export function serializeAcademyCollection(p: CollectionRow) {
  return { id:p.id, title:p.title, description:p.description, thumbnailUrl:p.thumbnailUrl, sortOrder:p.sortOrder,
    videos:p.videos.map(v=>({ id:v.id, videoId:v.videoId, title:v.title, description:v.description, thumbnailUrl:v.thumbnailUrl, sortOrder:v.sortOrder, analysis:v.analysis ? toYoutubeAnalysisDTO(v.analysis) : null })) };
}
export async function getAcademyLibrary() {
  const rows = await db.academyPlaylist.findMany({ where:{published:true}, orderBy:[{sortOrder:'asc'},{createdAt:'desc'}], include:academyInclude });
  return buildAcademyLibrary(rows.map(serializeAcademyCollection));
}
export function copyLesson(v: Pick<VideoRow,'videoId'|'title'|'description'|'thumbnailUrl'|'analysisId'>, sortOrder:number) {
  return { videoId:v.videoId, title:v.title, description:v.description, thumbnailUrl:v.thumbnailUrl, analysisId:v.analysisId, sortOrder };
}
export async function courseLessons(tx:Prisma.TransactionClient, lessonIds:string[]) {
  const rows = await tx.academyVideo.findMany({ where:{id:{in:lessonIds},playlist:{published:true}}, include:{analysis:true} });
  const ordered = lessonIds.map(id=>rows.find(row=>row.id===id));
  if (ordered.some(row=>!row)) throw new HttpError('선택한 영상을 찾을 수 없어요. 목록을 새로고침해주세요.',404);
  const videos = ordered as VideoRow[];
  if (new Set(videos.map(v=>v.videoId)).size !== videos.length) throw new HttpError('같은 영상은 한 강의에 한 번만 넣을 수 있어요.');
  return videos;
}
/** Preserve legacy course-only videos when a course is unlinked or reorganized. */
export async function preserveStandaloneLessons(tx:Prisma.TransactionClient, videos:VideoRow[]) {
  if (!videos.length) return;
  const collections = await tx.academyPlaylist.findMany({ where:{published:true,videos:{some:{videoId:{in:videos.map(v=>v.videoId)}}}}, include:{videos:true} });
  const standalone = new Set(collections.filter(c=>c.videos.length===1).map(c=>c.videos[0].videoId));
  for (const video of videos) {
    if (standalone.has(video.videoId)) continue;
    await tx.academyPlaylist.create({data:{title:video.title,description:video.description,thumbnailUrl:video.thumbnailUrl,published:true,videos:{connect:{id:video.id}}}});
    // Move the original membership into its own collection: direct lesson links and notes keep their ID.
    await tx.academyVideo.update({where:{id:video.id},data:{sortOrder:0}});
    standalone.add(video.videoId);
  }
}
