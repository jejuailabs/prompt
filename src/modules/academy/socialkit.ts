import 'server-only';
import { HttpError } from '@/lib/auth';
import { socialKitLessons, youtubePlaylistUrl } from './curriculum';

/** Metadata import only. Study-note generation remains an explicit per-lesson action. */
export async function importSocialKitPlaylist(value: string) {
  const url = youtubePlaylistUrl(value);
  if (!url) throw new HttpError('YouTube 재생목록 주소를 입력해주세요. (list= 항목이 있는 주소)');
  const key = process.env.SOCIALKIT_API_KEY;
  if (!key) throw new HttpError('서버에 SocialKit 연결 키가 설정되지 않았습니다.', 503);
  let response: Response;
  try {
    response = await fetch(`https://api.socialkit.dev/youtube/videos?${new URLSearchParams({ url, limit: '100' })}`, {
      headers: { 'x-access-key': key }, cache: 'no-store', signal: AbortSignal.timeout(130_000),
    });
  } catch { throw new HttpError('재생목록을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', 504); }
  if (!response.ok) throw new HttpError(response.status === 401 || response.status === 403 ? 'SocialKit 연결 키를 확인해주세요.' : 'SocialKit에서 재생목록을 가져오지 못했습니다. 공개 재생목록인지 확인해주세요.', 502);
  let videos;
  try { videos = socialKitLessons(await response.json()); }
  catch { throw new HttpError('재생목록 응답을 읽지 못했습니다. 공개 YouTube 재생목록인지 확인해주세요.', 502); }
  if (!videos.length) throw new HttpError('이 재생목록에서 공개된 영상을 찾지 못했습니다.');
  return { sourceUrl: url, videos, reachedLimit: videos.length >= 100 };
}
