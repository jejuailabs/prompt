import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { AI_EVENTS } from '@/modules/ai-events/catalogue';
import { EVENT_MODULE, eventData, mergeEventRows, readEventForm, rollbackPoster, serializeEvent, uploadEventPoster } from '@/modules/ai-events/server';
export const dynamic='force-dynamic';
export async function GET(req: Request) {
  try {
    const scope=new URL(req.url).searchParams.get('scope')??'public';
    if(!['public','manage'].includes(scope)) throw new HttpError('잘못된 조회 조건입니다.',400);
    const managing=scope==='manage';if(managing) await requireAdmin();
    // Archived overrides must also be read so hidden editorial records never reappear from the initial catalogue.
    const rows=await db.artifact.findMany({where:{sourceModule:EVENT_MODULE,type:'text',status:{in:['published','archived']},visibility:{in:['public','unlisted']}},
      include:{owner:{select:{username:true}}},orderBy:{createdAt:'desc'}});
    return ok(mergeEventRows(AI_EVENTS,rows,managing));
  } catch(error) { return fail(error); }
}
export async function POST(req: Request) {
  let upload:Awaited<ReturnType<typeof uploadEventPoster>>=null;
  try {
    const user=await requireAdmin(); const {input,file}=await readEventForm(req);
    upload=await uploadEventPoster(file,user.id);
    const row=await db.artifact.create({data:{ownerId:user.id,type:'text',sourceModule:EVENT_MODULE,status:'published',visibility:'unlisted',...eventData(input,upload?.url??null)},include:{owner:{select:{username:true}}}});
    return ok(serializeEvent(row),201);
  } catch(error) { await rollbackPoster(upload);return fail(error); }
}
