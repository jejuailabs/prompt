import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { HttpError, type DbSessionUser } from '@/lib/auth';
import { uploadBuffer, removeUpload } from '@/lib/server/storage';
import { eventInputSchema, inputToEvent, type EventInput } from './input';
import type { AiEvent } from './catalogue';

export const EVENT_MODULE = 'ai-events';
export const MAX_POSTER_BYTES = 3 * 1024 * 1024;
const MIME_FORMATS: Record<string,string> = {'image/png':'png','image/jpeg':'jpeg','image/webp':'webp'};
export type EventRow = { id:string;ownerId:string;title:string;description:string;fileUrl:string|null;metadata:string;sourceModule:string|null;type:string;status:string;visibility:string;createdAt:Date;owner?:{username:string}|null };
export function canEditEvent(user: Pick<DbSessionUser,'role'>|null) { return Boolean(user&&user.role==='admin'); }
export function assertEventAccess(row: EventRow|null,user: DbSessionUser) {
  if(!row||row.sourceModule!==EVENT_MODULE||row.type!=='text') throw new HttpError('일정을 찾을 수 없습니다.',404);
  if(!canEditEvent(user)) throw new HttpError('관리자 권한이 필요합니다.',403);
}
export function parseEventInput(raw: unknown): EventInput {
  const parsed=eventInputSchema.safeParse(raw);
  if(!parsed.success) throw new HttpError(parsed.error.issues[0]?.message||'입력 내용을 확인해주세요.',400);
  return parsed.data;
}
export function serializeEvent(row: EventRow): AiEvent|null {
  try {
    if(row.sourceModule!==EVENT_MODULE||row.type!=='text') return null;
    const {aiEvent}=JSON.parse(row.metadata); const input=parseEventInput(aiEvent);
    const item=inputToEvent(input,row.id,row.createdAt);
    // The file must be in this module's upload namespace, including for records edited via generic artifact APIs.
    const storageRoot=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'')+'/storage/v1/object/public/uploads/ai-events/';
    const posterUrl=row.fileUrl?.startsWith(storageRoot)?row.fileUrl:undefined;
    return {...item,posterUrl,ownerId:row.ownerId,authorName:row.owner?.username??'',published:row.status==='published'};
  } catch { return null; }
}
export async function readEventForm(req: Request) {
  const form=await req.formData(); const raw=form.get('data');
  if(typeof raw!=='string'||raw.length>20000) throw new HttpError('입력 내용을 확인해주세요.',400);
  let value:unknown;try { value=JSON.parse(raw); } catch { throw new HttpError('잘못된 입력 형식입니다.',400); }
  const input=parseEventInput(value),file=form.get('poster');
  if(file!==null&&!(file instanceof File)) throw new HttpError('포스터 이미지 파일을 확인해주세요.',400);
  if(file instanceof File&&(file.size===0||file.size>MAX_POSTER_BYTES||!MIME_FORMATS[file.type])) throw new HttpError('포스터는 PNG·JPG·WebP, 3MB 이하로 올려주세요.',400);
  return {input,file:file instanceof File?file:null};
}
export async function uploadEventPoster(file: File|null,ownerId:string): Promise<{url:string;path:string}|null> {
  if(!file) return null;
  let data:Buffer;
  try {
    const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000,animated:false});
    const info=await image.metadata();
    if(info.format!==MIME_FORMATS[file.type]||(info.pages??1)>1) throw new Error('format');
    data=await image.rotate().resize({width:1800,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
  } catch { throw new HttpError('이미지를 읽을 수 없습니다. PNG·JPG·WebP 파일을 다시 선택해주세요.',400); }
  const path='ai-events/'+ownerId+'/'+randomUUID()+'.webp';
  return {path,url:await uploadBuffer(path,data,'image/webp')};
}
export async function rollbackPoster(upload: {path:string}|null) { if(upload) await removeUpload(upload.path).catch(error=>console.error('[ai-events] upload rollback failed',error)); }
export function eventData(input: EventInput,fileUrl:string|null) {
  return {title:input.title,description:input.summary,fileUrl,metadata:JSON.stringify({aiEvent:{...input,removePoster:false}})};
}

/** A stored editorial override replaces its seed, including archived records. */
export function mergeEventRows(seeds: AiEvent[],rows: EventRow[],managing=false): AiEvent[] {
  const stored=rows.map(serializeEvent).filter((item):item is AiEvent=>item!==null);
  const overridden=new Set(stored.map(item=>item.id));
  return [...seeds.filter(item=>!overridden.has(item.id)),...stored.filter(item=>managing||item.published)];
}
