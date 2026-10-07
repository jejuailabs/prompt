import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { AI_EVENTS } from '@/modules/ai-events/catalogue';
import { eventToInput } from '@/modules/ai-events/input';
import { assertEventAccess, EVENT_MODULE, eventData, readEventForm, rollbackPoster, serializeEvent, uploadEventPoster } from '@/modules/ai-events/server';
type Context={params:Promise<{id:string}>};
export async function PUT(req: Request,{params}: Context) {
  let upload:Awaited<ReturnType<typeof uploadEventPoster>>=null;
  try {
    const user=await requireAdmin(),{id}=await params;
    const row=await db.artifact.findUnique({where:{id}}),seed=AI_EVENTS.find(item=>item.id===id);
    if(row) assertEventAccess(row,user);else if(!seed) throw new HttpError('일정을 찾을 수 없습니다.',404);
    const {input,file}=await readEventForm(req);upload=await uploadEventPoster(file,row?.ownerId??user.id);
    const data=eventData(input,upload?.url??(input.removePoster?null:row?.fileUrl??null));
    const updated=await db.artifact.upsert({where:{id},update:data,create:{id,ownerId:user.id,type:'text',sourceModule:EVENT_MODULE,status:'published',visibility:'unlisted',...data},include:{owner:{select:{username:true}}}});
    return ok(serializeEvent(updated));
  } catch(error) { await rollbackPoster(upload);return fail(error); }
}
// Archiving is reversible. The poster file stays attached for a later restore.
export async function PATCH(req: Request,{params}: Context) {
  try {
    const user=await requireAdmin(),{id}=await params;
    const row=await db.artifact.findUnique({where:{id}}),seed=AI_EVENTS.find(item=>item.id===id);
    if(row) assertEventAccess(row,user);else if(!seed) throw new HttpError('일정을 찾을 수 없습니다.',404);
    const body=await readJson<{published?:boolean}>(req);
    if(typeof body.published!=='boolean') throw new HttpError('공개 상태를 확인해주세요.',400);
    const status=body.published?'published':'archived';
    const updated=row?await db.artifact.update({where:{id},data:{status},include:{owner:{select:{username:true}}}}):await db.artifact.create({data:{id,ownerId:user.id,type:'text',sourceModule:EVENT_MODULE,status,visibility:'unlisted',...eventData(eventToInput(seed!),null)},include:{owner:{select:{username:true}}}});
    return ok(serializeEvent(updated));
  } catch(error) { return fail(error); }
}
