# 05. Database Schema — Supabase (Postgres)

## 설계 원칙

- Phase 1에서 다 안 쓰더라도 **핵심 테이블은 처음부터 생성**한다 (원칙: `CLAUDE.md` 참조).
- `artifacts`는 **범용 산출물 테이블**로 설계해 프롬프트 결과 이미지든, 3D 모델이든, 숏폼 영상이든, 바이브코딩 결과물(게임)이든 전부 하나의 스키마로 흡수한다 (`type` 필드로 분기).
- 모든 사용자 생성 콘텐츠는 `owner_id`, `visibility`, `status`를 공통으로 가진다.
- RLS(Row Level Security)는 이 문서의 설계 의도를 바탕으로 실제 마이그레이션에서 작성.

---

## 핵심 테이블 (Phase 1부터 존재)

### `profiles`
사용자 프로필 (Supabase `auth.users`와 1:1)
```
id            uuid (PK, references auth.users)
username      text unique
avatar_url    text
locale        text default 'ko'
role          text default 'user'   -- 'user' | 'admin'
created_at    timestamptz
```

### `modules`
모듈 레지스트리 (아키텍처 문서 `02`의 `ModuleConfig`를 DB에도 미러링 — 어드민에서 실시간 on/off 하기 위함)
```
id            text (PK)             -- 'prompt-wiki', 'model-lab' 등
phase         int
title_ko      text
title_en      text
icon          text
nav_order     int
enabled       bool default false
status        text default 'active' -- 'active' | 'new' | 'beta' | 'coming-soon'
new_until     timestamptz
main_screen_slot text              -- 'hero' | 'feed' | 'sidebar' | 'none'
entry_route   text
```

### `prompts`
```
id            uuid (PK)
owner_id      uuid (FK profiles)
title         text
body          text
category      text
model_tags    text[]
forked_from   uuid (FK prompts, nullable)  -- 버전업 추적
visibility    text default 'public'
status        text default 'active'
created_at    timestamptz
```

### `prompt_versions`
```
id            uuid (PK)
prompt_id     uuid (FK prompts)
body          text
version_note  text
created_by    uuid (FK profiles)
created_at    timestamptz
```

### `artifacts` (범용 산출물 — Phase 1~5 공용)
```
id            uuid (PK)
owner_id      uuid (FK profiles)
type          text   -- 'image' | 'text' | 'video' | '3d_asset' | 'landing_page' | 'game' | 'app'
source_prompt_id  uuid (FK prompts, nullable)
source_module     text (FK modules.id)  -- 어느 모듈에서 생성됐는지
file_url      text
metadata      jsonb   -- 모델명, 파라미터, 실행엔진 tier 등 자유 스키마
execution_tier text   -- 'iframe' | 'webcontainer' | 'microvm' | null (정적 파일이면 null)
visibility    text default 'public'
status        text default 'draft'   -- 'draft' | 'published' | 'archived'
created_at    timestamptz
```

### `votes`
```
id            uuid (PK)
target_type   text  -- 'prompt' | 'artifact'
target_id     uuid
user_id       uuid (FK profiles)
value         int   -- 1 (좋아요), 향후 -1도 고려
created_at    timestamptz
```

### `comments`
```
id            uuid (PK)
target_type   text
target_id     uuid
user_id       uuid (FK profiles)
body          text
created_at    timestamptz
```

### `events` (이벤트 로그 — 모듈 간 느슨한 연결용)
```
id            uuid (PK)
type          text  -- 'artifact.created', 'artifact.published', 'smoke_test.completed' 등
payload       jsonb
created_at    timestamptz
```

---

## Phase 2 — 멀티모델 비교

### `model_providers`
```
id            text (PK)   -- 'openai-image', 'anthropic-claude', 'runway-video' 등
display_name  text
category      text        -- 'image' | 'video' | 'text' | '3d'
cost_per_unit numeric      -- 원가 (내부 계측용)
margin_rate   float default 1.4  -- 관리자 조정 가능한 마진율 (원가 × marginRate = 과금 크레딧)
adapter_type  text default 'default'  -- 'default' | 'openai' | 'stability' | 'replicate'
adapter_config text default '{}'  -- 벤더별 추가 설정 JSON (모델명, API 엔드포인트 등)
active        bool
```

### `generation_jobs`
```
id            uuid (PK)
user_id       uuid (FK profiles)
prompt_id     uuid (FK prompts, nullable)
provider_id   text (FK model_providers)
status        text  -- 'queued' | 'running' | 'done' | 'failed'
result_artifact_id uuid (FK artifacts, nullable)
cost_actual   numeric
credit_charged numeric   -- 원가 * (1 + 마진율)
created_at    timestamptz
```

### `credits`
```
user_id       uuid (PK, FK profiles)
balance       numeric default 0
```

### `credit_transactions`
```
id            uuid (PK)
user_id       uuid (FK profiles)
amount        numeric      -- + 충전, - 사용
reason        text         -- 'purchase' | 'generation_job' | 'refund'
related_id    uuid nullable
created_at    timestamptz
```

---

## Phase 3 — 파이프라인

### `pipelines`
```
id            text (PK)   -- 'pipeline-3d', 'pipeline-shortform', 'pipeline-detailpage'
display_name  text
input_schema  jsonb        -- 파이프라인별 입력 폼 정의
active        bool
```

### `pipeline_runs`
```
id            uuid (PK)
pipeline_id   text (FK pipelines)
user_id       uuid (FK profiles)
input_payload jsonb
status        text
result_artifact_id uuid (FK artifacts, nullable)
created_at    timestamptz
```

---

## Phase 4 — 결제 / 스모크테스트

### `payment_accounts`
```
user_id       uuid (PK, FK profiles)
provider      text  -- 'stripe_connect' 등
external_account_id text
status        text  -- 'pending' | 'active' | 'restricted'
```

### `revenue_shares`
```
id            uuid (PK)
artifact_id   uuid (FK artifacts)
payee_user_id uuid (FK profiles)
share_percent numeric
```

### `ad_campaigns`
```
id            uuid (PK)
artifact_id   uuid (FK artifacts)
budget        numeric
start_at      timestamptz
end_at        timestamptz
status        text
```

### `smoke_tests`
```
id            uuid (PK)
artifact_id   uuid (FK artifacts)
requested_by  uuid (FK profiles)
status        text   -- 'requested' | 'running' | 'completed'
ad_campaign_id uuid (FK ad_campaigns, nullable)
requested_at  timestamptz
completed_at  timestamptz
```

### `smoke_test_reports`
```
id            uuid (PK)
smoke_test_id uuid (FK smoke_tests)
metrics       jsonb   -- CTR, 전환율, 리텐션 등
recommendation text
success_score numeric
created_at    timestamptz
```

### `marketplace_listings` (Phase4 입점형 수익공유용, Phase5 매칭과는 별개)
```
id            uuid (PK)
artifact_id   uuid (FK artifacts)
listed_by     uuid (FK profiles)
revenue_model text  -- 'ad_share' | 'paid' | 'freemium'
status        text
created_at    timestamptz
```

---

## Phase 5 — 문제-개발자 매칭

### `problem_briefs`
```
id            uuid (PK)
author_id     uuid (FK profiles)
raw_text      text
structured_spec jsonb   -- AI가 구조화한 요구사항
status        text  -- 'draft' | 'submitted' | 'approved' | 'rejected'
created_at    timestamptz
```

### `bids`
```
id            uuid (PK)
brief_id      uuid (FK problem_briefs)
developer_id  uuid (FK profiles)
proposal      text
price         numeric
status        text
created_at    timestamptz
```

### `matches`
```
id            uuid (PK)
brief_id      uuid (FK problem_briefs)
bid_id        uuid (FK bids)
matched_at    timestamptz
```

### `contracts`
```
id            uuid (PK)
match_id      uuid (FK matches)
revenue_share_terms jsonb
status        text
created_at    timestamptz
```

---

## Phase 3+ — AI Video Studio / 3D Asset Studio (공유 인프라)

### `reference_packs` (Identity Pack — 캐릭터/소품/장소 참조 세트)
```
id            uuid (PK)
owner_id      uuid (FK profiles)
name          text                    -- '주인공', '악당', '마을 배경' 등
category      text                    -- 'character' | 'prop' | 'location'
metadata      jsonb                   -- 스타일 노트, 체형, 의상 설명 등
created_at    timestamptz
```

### `reference_images` (Pack 내 개별 이미지)
```
id            uuid (PK)
pack_id       uuid (FK reference_packs)
role          text                    -- 'front' | 'three_quarter' | 'profile' | 'full_body' | 'expression' | 'costume' | 'prop'
file_url      text
sort_order    int default 0
metadata      jsonb                   -- 표정명, 의상명 등
```

### `compute_jobs` (RunPod GPU 작업 추적 — 영상/3D 공용)
```
id            uuid (PK)
owner_id      uuid (FK profiles)
track         text                    -- 'video' | '3d'
provider      text default 'runpod'   -- 'runpod' | 'local' 등 확장 가능
external_job_id text                  -- RunPod job ID
gpu_type      text                    -- 'rtx-5090' 등
status        text                    -- 'queued' | 'running' | 'done' | 'failed'
cost_usd      numeric                 -- 실제 GPU 비용
duration_sec   int                    -- 실행 시간(초)
metadata      jsonb                   -- 엔진, 모델명, 파라미터 등
created_at    timestamptz
completed_at  timestamptz
```

### `video_projects` (AI 영상 프로젝트)
```
id            uuid (PK)
owner_id      uuid (FK profiles)
title         text
script        text                    -- 원고 전문
style         text                    -- 'informative' | 'cinematic' | 'humor' 등
target_duration_sec int default 60
status        text                    -- 'draft' | 'storyboard' | 'generating' | 'editing' | 'rendering' | 'done' | 'failed'
director_bible jsonb                  -- Story/Character/Location/Cinematography/Audio Bible
master_audio_url text                 -- TTS 마스터 오디오 파일
timeline      jsonb                   -- Forced Alignment 타임스탬프
result_artifact_id uuid (FK artifacts, nullable)
credit_charged numeric default 0
created_at    timestamptz
updated_at    timestamptz
```

### `video_shots` (개별 샷)
```
id            uuid (PK)
project_id    uuid (FK video_projects)
shot_index    int                     -- 순서
narration     text                    -- 이 샷의 나레이션 텍스트
prompt        text                    -- 생성 프롬프트
start_sec     numeric                 -- 타임라인 시작 (초)
end_sec       numeric                 -- 타임라인 끝 (초)
model         text default 'h3'       -- 'h3-fl2va' | 'h3-ref2va' | 'wan22' | 'ltx2'
render_profile text default 'standard' -- 'preview' | 'standard' | 'hero'
importance    numeric default 0.5     -- 0~1, Director가 평가한 중요도
reference_pack_ids uuid[]             -- 사용할 Identity Pack IDs
continuity_frame_url text             -- 이전 샷 Last Frame URL
status        text                    -- 'pending' | 'preview' | 'generating' | 'qc' | 'passed' | 'failed' | 'done'
result_url    text                    -- 생성된 영상 클립 URL
thumbnail_url text
qc_result     jsonb                   -- { identity, costume, flicker, motion, lipSync } 각 pass/fail + score
qc_attempts   int default 0           -- 재생성 시도 횟수
compute_job_id uuid (FK compute_jobs, nullable)
seed          bigint
generation_params jsonb               -- step, strength, 기타 파라미터
created_at    timestamptz
updated_at    timestamptz
```

### `asset3d_projects` (3D 에셋 프로젝트)
```
id            uuid (PK)
owner_id      uuid (FK profiles)
title         text
subtrack      text                    -- 'character' | 'product' | 'floorplan'
status        text                    -- 'draft' | 'generating' | 'processing' | 'done' | 'failed'
input_image_urls text[]               -- 입력 이미지/도면 URL 배열
style_options jsonb                   -- 스타일 설정
result_artifact_id uuid (FK artifacts, nullable)
credit_charged numeric default 0
created_at    timestamptz
updated_at    timestamptz
```

### `asset3d_outputs` (생성된 3D 에셋)
```
id            uuid (PK)
project_id    uuid (FK asset3d_projects)
glb_url       text                    -- GLB 파일 URL
fbx_url       text                    -- FBX 파일 URL (선택)
texture_urls  jsonb                   -- PBR 텍스처 맵 URLs
thumbnail_url text                    -- 미리보기 이미지
poly_count    int                     -- 폴리곤 수
dimensions    jsonb                   -- { width, height, depth } (실측 치수, 도면용)
qc_result     jsonb                   -- mesh quality, texture, scale 검사
compute_job_id uuid (FK compute_jobs, nullable)
created_at    timestamptz
```

---

## RLS 설계 방향 (요약)

- `profiles`: 본인만 수정, 전체 조회 가능
- `prompts`, `artifacts`: `visibility='public'`이면 전체 조회, 수정/삭제는 `owner_id`만
- `modules`: 조회는 전체 허용, 수정은 `role='admin'`만
- `credits`, `payment_accounts`, `smoke_test_reports`: 본인 데이터만 조회 가능 (admin 예외)
