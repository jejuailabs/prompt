# 06. 데이터 모델 (Firestore · Storage)

> 모든 문서에 공통으로 들어가는 필드: `createdAt`, `updatedAt` (serverTimestamp), `status`
> 다국어가 필요한 운영진 콘텐츠는 `i18n` 맵에 언어별 값을 넣습니다 (docs/10).
> 타입 정의는 `src/types/`에 같은 이름으로 둡니다. 이 문서와 타입이 다르면 이 문서를 먼저 고칩니다.

## 1. 컬렉션 목록

| 컬렉션 | 설명 |
|---|---|
| `users` | 회원 프로필 (공개 정보) |
| `users/{uid}/private` | 이메일, 알림 설정 등 본인과 운영진만 보는 정보 |
| `users/{uid}/bookmarks` | 저장한 콘텐츠 |
| `users/{uid}/notifications` | 알림 |
| `users/{uid}/progress`, `notes` | 학습 진행률, 영상 메모 (docs/09) |
| `nicknames` | 닉네임 중복 방지 (문서 ID = 닉네임) |
| `shortLinks` | URL 단축 (docs/09) |
| `news` | 뉴스 |
| `events` | 행사·모임 |
| `prompts` | 프롬프트 |
| `projects` | 만들어보기 작품 |
| `guideServices` | AI 서비스 사용설명서 |
| `guideTips` | 스킬·팁 |
| `courses` | 커리큘럼 |
| `videos` | 학습 영상 (유튜브 메타데이터, 요약, 타임스탬프) |
| `studies` | 스터디방 |
| `studies/{id}/sessions` | 스터디 회차 |
| `studies/{id}/members` | 참여자, 출석 |
| `posts` | 커뮤니티 글 |
| `comments` | 모든 콘텐츠의 댓글 (targetType + targetId) |
| `reactions` | 좋아요 (중복 방지용, 문서 ID = `{targetType}_{targetId}_{uid}`) |
| `reports` | 신고 |
| `banners` | 홈 히어로 포스터 |
| `tools` | 바로쓰기 도구 설정 (켜기/끄기, 한도) |
| `toolUsage` | 도구 사용량 (일별, 사용자별) |
| `siteSettings` | 사이트 설정 (점검 모드, 인기 검색어 등) — 문서 1개 |
| `adminLogs` | 어드민 작업 기록 |

## 2. 주요 스키마

### users/{uid}
```ts
{
  nickname: string;            // 고유, 2~12자
  photoURL?: string;
  bio?: string;
  role: 'member' | 'editor' | 'moderator' | 'admin';   // custom claims와 동기화 (표시용)
  level: 1 | 2 | 3 | 4 | 5;    // 등급 (docs/07)
  points: number;
  stats: { posts: number; comments: number; prompts: number; projects: number; acceptedAnswers: number; };
  locale: 'ko' | 'en';
  theme: 'light' | 'dark' | 'system';
  isBanned: boolean;
  createdAt; updatedAt;
}
```

### prompts/{id}
```ts
{
  authorId: string; authorNickname: string; authorLevel: number;   // 비정규화 (목록 표시용)
  title: string;
  description: string;
  promptText: string;
  variables?: string[];               // ['주제', '분위기'] — {주제} 형태에서 추출
  category: 'image' | 'video' | 'work' | 'writing' | 'coding' | 'etc';
  services: string[];                 // guideServices slug 목록 ['midjourney']
  model?: string; settings?: Record<string, string>;
  media: { type: 'image' | 'video'; path: string; thumbPath: string; width: number; height: number; }[];
  license: 'free' | 'non-commercial' | 'all-rights-reserved';
  tags: string[];
  remixOf?: string;                   // 원본 prompt id
  studySessionRef?: string;           // 'studies/{id}/sessions/{n}'
  featured: boolean;
  counts: { likes: number; saves: number; copies: number; comments: number; views: number; };
  searchKeywords: string[];
  status: 'published' | 'hidden' | 'deleted';
}
```

### projects/{id} (만들어보기)
```ts
{
  authorId; authorNickname; authorLevel;
  type: 'motion' | 'game' | 'vibe' | 'landing';
  title; description; process?: string;          // 만든 과정
  toolsUsed: string[];
  thumbnailPath: string; previewVideoPath?: string;
  source: {
    kind: 'link' | 'zip' | 'github';
    url?: string;                                // link, github
    zipPath?: string;                            // Storage 원본 ZIP
    buildId?: string;                            // 샌드박스에 배포된 빌드 식별자
    entry?: string;                              // 'index.html'
  };
  runnable: boolean;
  viewports?: ('desktop' | 'tablet' | 'mobile')[];
  downloads?: { label: string; path: string; size: number; }[];
  license: string;                               // 'MIT' | 'CC-BY-4.0' | 'non-commercial' | ...
  studySessionRef?: string;
  review: { state: 'pending' | 'approved' | 'rejected'; reviewerId?: string; reason?: string; reviewedAt?; };
  counts: { likes; saves; runs; comments; views; };
  status: 'published' | 'hidden' | 'deleted';    // review.state === 'approved' 일 때만 published 가능
}
```

### events/{id}
```ts
{
  i18n: { ko: { title; summary; body }, en?: { title; summary; body } };
  kind: 'seminar' | 'study' | 'education' | 'meetup';
  posterPath: string;
  startAt: Timestamp; endAt: Timestamp;
  place: { name: string; address?: string; mapUrl?: string; online?: boolean; };
  capacity?: number; fee?: number;
  applyUrl?: string;                 // 1단계: 외부 신청 링크
  recruitState: 'open' | 'closed' | 'ended';
  studyId?: string;
  status: 'published' | 'draft';
}
```

### guideServices/{slug}
```ts
{
  slug: string;                      // 'chatgpt', 'claude', ...
  logoPath: string;
  i18n: { ko: { name; oneLiner; recommendedFor; pricingSummary; signupSteps; firstSteps; examples }, en?: {...} };
  situations: string[];              // ['writing', 'image', 'summary']
  officialUrl: string;
  lastVerifiedAt: Timestamp;         // 최종 확인일 — 90일 넘으면 갱신 필요 표시
  pinned: boolean; order: number;
  status: 'published' | 'draft';
}
```

### posts/{id} (커뮤니티)
```ts
{
  board: 'free' | 'qna' | 'notice';
  prefix: 'general' | 'question' | 'tip' | 'review' | 'meetup';   // 말머리
  authorId; authorNickname; authorLevel;
  title; body;                       // body는 정제된 HTML 또는 마크다운
  images?: string[];
  tags: string[];
  linkedContent?: { type: 'prompt' | 'project' | 'guide'; id: string; };
  acceptedCommentId?: string;        // Q&A 채택 답변
  pinned: boolean;
  number: number;                    // 게시판 글번호 (트랜잭션으로 증가)
  counts: { likes; comments; views; };
  searchKeywords: string[];
  status: 'published' | 'hidden' | 'deleted';
}
```

### comments/{id}
```ts
{ targetType: 'prompt' | 'project' | 'post' | 'news' | 'event' | 'guide' | 'video';
  targetId: string; parentId?: string;   // 대댓글은 1단계까지만
  authorId; authorNickname; authorLevel; body;
  videoTimestamp?: number;               // 영상 타임스탬프 댓글 (초)
  counts: { likes }; status; }
```

### banners/{id}
```ts
{ theme: 'event' | 'feature' | 'challenge' | 'news';   // docs/03 포스터 테마
  i18n: { ko: { badge; title; subtitle; ctaLabel }, en?: {...} };
  imagePath: string; linkUrl: string;
  startAt; endAt; order: number; active: boolean; }
```

### toolUsage/{yyyyMMdd}_{uid}
```ts
{ uid; date: 'yyyyMMdd'; counts: { tts: number; stt: number; summarize: number; ... } }
```

### reports/{id}
```ts
{ targetType; targetId; reporterId; reason: 'spam' | 'abuse' | 'copyright' | 'malicious-code' | 'etc';
  detail?: string; state: 'open' | 'resolved' | 'dismissed'; handledBy?; handledAt?; }
```

## 3. 카운터 집계 규칙
- 좋아요: `reactions` 문서 생성·삭제와 대상 문서의 `counts.likes` 증감을 **같은 트랜잭션**에서 처리 (API 라우트)
- 조회수: 같은 사용자(또는 기기)의 중복 조회는 24시간에 1회만 집계. 집계는 API 라우트에서 `FieldValue.increment` 사용
- 복사 수, 실행 수: 클릭할 때 API 호출 (중복 제한 1시간)

## 4. 인덱스 (예시)
```json
[
  { "collectionGroup": "prompts", "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"category","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] },
  { "collectionGroup": "posts", "fields": [{"fieldPath":"board","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"number","order":"DESCENDING"}] },
  { "collectionGroup": "projects", "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"type","order":"ASCENDING"},{"fieldPath":"counts.runs","order":"DESCENDING"}] },
  { "collectionGroup": "comments", "fields": [{"fieldPath":"targetType","order":"ASCENDING"},{"fieldPath":"targetId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"ASCENDING"}] }
]
```

## 5. Firestore 보안 규칙 (뼈대)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn()   { return request.auth != null; }
    function role()       { return signedIn() ? request.auth.token.role : null; }
    function isStaff()    { return role() in ['editor', 'moderator', 'admin']; }
    function isAdmin()    { return role() == 'admin'; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function notBanned()  { return signedIn() && request.auth.token.banned != true; }
    // 작성자가 바꿀 수 없는 필드: counts, featured, review, status(hidden 처리), role, level, points
    function onlyEditable(fields) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields); }

    match /users/{uid} {
      allow read: if true;
      allow create: if isOwner(uid) && request.resource.data.role == 'member' && request.resource.data.level == 1;
      allow update: if isOwner(uid) && onlyEditable(['nickname','photoURL','bio','locale','theme','updatedAt'])
                    || isAdmin();
      match /private/{doc}       { allow read, write: if isOwner(uid) || isAdmin(); }
      match /bookmarks/{doc}     { allow read, write: if isOwner(uid); }
      match /notifications/{doc} { allow read, update: if isOwner(uid); }   // 생성은 서버만
      match /progress/{doc}      { allow read, write: if isOwner(uid); }
      match /notes/{doc}         { allow read, write: if isOwner(uid); }
    }

    // 닉네임 중복 방지: 문서 ID = 닉네임, 생성만 가능 (변경은 서버 API에서 트랜잭션 처리)
    match /nicknames/{name} {
      allow read: if true;
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    match /prompts/{id} {
      allow read: if resource.data.status == 'published' || isOwner(resource.data.authorId) || isStaff();
      allow create: if notBanned() && request.resource.data.authorId == request.auth.uid
                    && request.resource.data.counts.likes == 0 && request.resource.data.featured == false;
      allow update: if isOwner(resource.data.authorId) && notBanned()
                    && onlyEditable(['title','description','promptText','variables','category','services','model','settings','media','license','tags','updatedAt','searchKeywords'])
                    || isStaff();
      allow delete: if isStaff();   // 작성자 삭제는 status='deleted' 업데이트로 처리
    }

    match /projects/{id} {
      allow read: if resource.data.status == 'published' || isOwner(resource.data.authorId) || isStaff();
      allow create: if notBanned() && request.resource.data.authorId == request.auth.uid
                    && request.resource.data.review.state == 'pending'
                    && request.resource.data.status == 'hidden';
      allow update: if (isOwner(resource.data.authorId) && notBanned()
                    && onlyEditable(['title','description','process','toolsUsed','thumbnailPath','previewVideoPath','license','downloads','updatedAt']))
                    || isStaff();
    }

    match /posts/{id} {
      allow read: if resource.data.status == 'published' || isStaff();
      allow create: if notBanned() && request.resource.data.authorId == request.auth.uid
                    && (request.resource.data.board != 'notice' || isStaff());
      allow update: if (isOwner(resource.data.authorId) && onlyEditable(['title','body','images','tags','prefix','acceptedCommentId','updatedAt','searchKeywords']))
                    || isStaff();
    }

    // 운영진 콘텐츠: 누구나 읽기, 스태프만 쓰기
    match /{col}/{id} {
      allow read: if col in ['news','events','guideServices','guideTips','courses','videos','banners','tools','siteSettings'];
      allow write: if isStaff() && col in ['news','events','guideServices','guideTips','courses','videos','banners'];
    }
    match /tools/{id}        { allow write: if isAdmin(); }
    match /siteSettings/{id} { allow write: if isAdmin(); }

    // 서버(Admin SDK)만 쓰는 컬렉션
    match /reactions/{id}  { allow read: if signedIn(); allow write: if false; }
    match /toolUsage/{id}  { allow read: if isAdmin(); allow write: if false; }
    match /adminLogs/{id}  { allow read: if isAdmin(); allow write: if false; }
    match /reports/{id}    { allow create: if notBanned(); allow read, update: if role() in ['moderator','admin']; }
    match /comments/{id} {
      allow read: if true;
      allow create: if notBanned() && request.resource.data.authorId == request.auth.uid;
      allow update: if isOwner(resource.data.authorId) && onlyEditable(['body','updatedAt']) || isStaff();
    }
  }
}
```

> 위 규칙은 **출발점**입니다. 실제 배포 전에 Firebase Emulator로 역할별(비로그인, 회원, 정지 회원, 에디터, 관리자) 테스트를 작성해 통과시켜야 합니다.

## 6. Storage 경로와 규칙

```
/users/{uid}/avatar.webp
/prompts/{promptId}/{fileId}.webp | .mp4        # 업로드는 작성자, 최대 이미지 10MB / 영상 50MB
/projects/{projectId}/source.zip                # 원본 ZIP (비공개, 서버만 읽음)
/projects/{projectId}/thumb.webp, preview.mp4
/projects/{projectId}/downloads/{file}
/banners/{bannerId}.webp                        # 스태프만
/guide/{slug}/{file}                            # 스태프만
```

- 이미지·영상은 `contentType`과 크기를 규칙에서 검사합니다.
- `source.zip`은 공개 읽기를 금지합니다. 샌드박스 배포는 서버가 처리합니다 (docs/08).
