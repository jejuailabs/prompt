import { getDomain } from "tldts";
import { LandingError } from "./errors";
export function isolatedOrigins(app: string, preview: string) {
  let a: URL, p: URL;
  try {
    a = new URL(app);
    p = new URL(preview);
  } catch {
    throw new LandingError("앱·분리된 미리보기 출처 설정이 필요합니다.", 503);
  }
  if (
    a.pathname !== "/" ||
    a.search ||
    a.hash ||
    !["http:", "https:"].includes(a.protocol) ||
    !["http:", "https:"].includes(p.protocol) ||
    a.username ||
    a.password ||
    p.username ||
    p.password ||
    p.pathname !== "/" ||
    p.search ||
    p.hash
  )
    throw new LandingError(
      "미리보기 출처는 경로 없는 별도 origin이어야 합니다.",
      503,
    );
  const aSite =
      getDomain(a.hostname, { allowPrivateDomains: true }) || a.hostname,
    pSite = getDomain(p.hostname, { allowPrivateDomains: true }) || p.hostname;
  if (aSite === pSite)
    throw new LandingError(
      "앱 쿠키와 분리된 다른 사이트의 미리보기 출처가 필요합니다. 포트만 바꾸거나 같은 상위 도메인을 사용할 수 없습니다.",
      503,
    );
  if (
    process.env.NODE_ENV === "production" &&
    (a.protocol !== "https:" || p.protocol !== "https:")
  )
    throw new LandingError("운영 미리보기는 HTTPS가 필요합니다.", 503);
  return { appOrigin: a.origin, previewOrigin: p.origin };
}
export function externalOrigin(value: string, appOrigin?: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.hostname === "localhost" ||
    /^(?:\d+\.){3}\d+$/.test(u.hostname) ||
    u.hostname.includes(":") ||
    /\.(?:localhost|local|internal)$/.test(u.hostname)
  )
    throw new LandingError(
      "외부 리소스는 공개 HTTPS URL만 지원합니다: " + value,
    );
  if (appOrigin) {
    const a = new URL(appOrigin);
    if (
      (getDomain(a.hostname, { allowPrivateDomains: true }) || a.hostname) ===
      (getDomain(u.hostname, { allowPrivateDomains: true }) || u.hostname)
    )
      throw new LandingError(
        "업로드 페이지가 앱 출처를 리소스로 참조할 수 없습니다: " + value,
      );
  }
  return u.origin;
}
