import { HttpError, requireAdmin } from '@/lib/auth';
import { fail } from '@/lib/server/handler';

export async function POST() {
  try {
    await requireAdmin();
    throw new HttpError('YouTube 재생목록 가져오기는 지원하지 않습니다. 개별 영상 URL을 등록한 뒤, 등록 영상을 선택해 강의로 묶어주세요.', 410);
  } catch (error) { return fail(error); }
}
