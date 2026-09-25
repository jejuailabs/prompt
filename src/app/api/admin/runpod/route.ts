import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { getRunpodInventory, RUNPOD_ENGINE_OPTIONS, setRunpodEndpointCapacity, type ManagedRunpodEngine } from '@/lib/server/runpod-admin';

const ENGINES = new Set(RUNPOD_ENGINE_OPTIONS.map((item) => item.id));

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getRunpodInventory());
  } catch (error) {
    return fail(error);
  }
}

/**
 * Update an existing endpoint only. This route cannot create endpoints, change
 * GPU types, templates, secrets, or billing configuration.
 */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await readJson<{ endpointId?: unknown; workersMax?: unknown; engine?: unknown }>(req);
    if (typeof body.endpointId !== 'string' || !/^[a-z0-9_-]{6,100}$/i.test(body.endpointId)) throw new HttpError('엔드포인트 ID를 확인해주세요.', 400);
    if (!Number.isInteger(body.workersMax) || (body.workersMax as number) < 0 || (body.workersMax as number) > 10) throw new HttpError('워커 수는 0~10으로 설정해주세요.', 400);
    const engine = body.engine === null || body.engine === undefined || body.engine === '' ? null : String(body.engine);
    if (engine !== null && !ENGINES.has(engine as ManagedRunpodEngine)) throw new HttpError('연결할 PLAYLAB 모델을 확인해주세요.', 400);
    return ok(await setRunpodEndpointCapacity({ endpointId: body.endpointId, workersMax: body.workersMax as number, engine: engine as ManagedRunpodEngine | null }));
  } catch (error) {
    return fail(error);
  }
}
