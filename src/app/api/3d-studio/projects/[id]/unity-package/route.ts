import { zipSync, strToU8 } from 'fflate';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail } from '@/lib/server/handler';
import { parseMeta } from '../../route';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다.', 404);
    const output = parseMeta(project.metadata).outputs?.[0];
    if (!output?.riggedGlbUrl || !output.riggedFbxUrl || !output.animationUrls || !Object.keys(output.animationUrls).some(name => name.endsWith('.fbx'))) {
      throw new HttpError('리깅과 애니메이션을 완료한 뒤 Unity 파일을 내려받을 수 있습니다.', 409);
    }
    const sourceRoot = `${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin}/storage/v1/object/public/uploads/3d/${user.id}/${id}/`;
    const entries: Array<[string, string]> = [
      ...(output.glbUrl ? [['Source/character-original.glb', output.glbUrl] as [string, string]] : []),
      ['Character/character-rigged.glb', output.riggedGlbUrl],
      ['Character/character-rigged.fbx', output.riggedFbxUrl],
      ...Object.entries(output.animationUrls).filter(([name]) => /^[a-z0-9-]+\.(glb|fbx)$/.test(name)).map(([name, url]) => [`Animations/${name}`, url] as [string, string]),
    ];
    if (entries.some(([, url]) => !url.startsWith(sourceRoot))) throw new HttpError('파일 저장 경로를 확인해주세요.', 400);
    const files: Record<string, Uint8Array> = {};
    let totalBytes = 0;
    for (const [name, url] of entries) {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new HttpError(`${name} 파일을 읽지 못했습니다.`, 502);
      const data = new Uint8Array(await response.arrayBuffer());
      totalBytes += data.byteLength;
      if (data.byteLength > 50 * 1024 * 1024 || totalBytes > 120 * 1024 * 1024) throw new HttpError('Unity 묶음 파일이 너무 큽니다.', 413);
      files[name] = data;
    }
    const motions = await db.artifact.findMany({ where: { ownerId: user.id, type: '3d_motion', sourceModule: '3d-studio', status: 'done' }, select: { id: true, title: true, metadata: true } });
    const included = motions.filter(row => { try { return JSON.parse(row.metadata).projectId === id; } catch { return false; } })
      .map(row => ({ id: row.id, name: row.title, fbx: `Animations/${row.id}.fbx`, glb: `Animations/${row.id}.glb` }))
      .filter(motion => files[motion.fbx] && files[motion.glb]);
    files['manifest.json'] = strToU8(JSON.stringify({ version: 1, projectId: id, character: 'Character/character-rigged.fbx', animations: included }, null, 2));
    files['README-UNITY.txt'] = strToU8([
      'PLAYLAB character files for Unity', '',
      '1. Copy the Character and Animations folders into your Unity project Assets folder.',
      '2. Select Character/character-rigged.fbx. In the Rig tab choose Generic and set the root bone, then Apply.',
      '3. Each Animations/*.fbx contains the skinned character and one baked motion clip. Open its Animation tab to inspect the clip.',
      '4. You may try Humanoid, but configure and validate the Avatar manually. Generated skeletons are not guaranteed to satisfy Unity Humanoid requirements.',
      '5. GLB files are provided for web preview. Unity requires a glTF importer package to use them directly.',
      '6. Inspect materials and textures in Unity; FBX material conversion can differ from the web GLB preview.',
      '', 'See manifest.json for motion names and file mapping.',
    ].join('\n'));
    const archive = zipSync(files, { level: 0 });
    return new Response(new Uint8Array(archive), { headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="playlab-${id}-unity.zip"`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (error) { return fail(error); }
}
