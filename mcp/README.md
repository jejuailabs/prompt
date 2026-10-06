# PLAYLAB MCP 연결

Codex 또는 Claude Code가 PLAYLAB의 기존 영상·3D·음악 API를 호출하는 로컬 stdio 서버입니다. 별도 GPU 작업기를 실행하지 않습니다. 생성 작업은 PLAYLAB 크레딧을 차감합니다.

## 준비

1. 서버 배포 DB에 `npx prisma db push`를 적용하고 PLAYLAB 서버를 재배포합니다. 계정별 키 해시를 보관하는 `McpToken` 테이블이 추가됩니다. 로컬 개발에도 동일하게 적용해야 합니다.
2. 배포된 PLAYLAB에 로그인한 뒤 `/mcp-connect`에서 연결 키를 만듭니다. 새 키를 만들면 이전 키는 즉시 무효입니다. 키는 한 번만 표시됩니다.
3. Node.js 20 이상을 설치하고 이 저장소를 사용할 컴퓨터에 둡니다. `mcp/server.mjs`는 별도 npm 패키지를 설치하지 않아도 실행됩니다.
4. PLAYLAB 주소, 키, Supabase Storage 주소를 설정합니다. `PLAYLAB_STORAGE_ORIGIN`은 `NEXT_PUBLIC_SUPABASE_URL` 값입니다. 결과 저장 도구를 쓸 때 필요합니다.

키를 `.mcp.json`, 저장소 파일, 채팅 메시지에 직접 적지 마세요. 로컬 환경 변수 또는 개인용 MCP 설정에만 넣으세요.

## Codex

`~/.codex/config.toml`에 아래를 추가합니다. 경로와 주소는 실제 값으로 바꿉니다. Windows에서도 경로에 `/`를 쓰면 TOML 이스케이프 문제가 없습니다.

```toml
[mcp_servers.playlab]
command = "node"
args = ["C:/path/to/prompt/mcp/server.mjs"]

[mcp_servers.playlab.env]
PLAYLAB_URL = "https://your-playlab-domain.example"
PLAYLAB_MCP_TOKEN = "pl_mcp_여기에_연결_키"
PLAYLAB_STORAGE_ORIGIN = "https://your-project.supabase.co"
PLAYLAB_OUTPUT_DIR = "C:/Users/you/Downloads/playlab-outputs"
```

Codex를 다시 시작한 뒤 `playlab_create_video` 등 도구가 보이는지 확인합니다.

## Claude Code

Claude Code의 사용자 범위 로컬 서버로 추가하는 예시입니다. PowerShell에서 실제 값을 넣으세요.

```powershell
claude mcp add --scope user --transport stdio --env PLAYLAB_URL=https://your-playlab-domain.example --env PLAYLAB_MCP_TOKEN=pl_mcp_YOUR_KEY --env PLAYLAB_STORAGE_ORIGIN=https://your-project.supabase.co --env PLAYLAB_OUTPUT_DIR=C:/Users/you/Downloads/playlab-outputs playlab -- node C:/path/to/prompt/mcp/server.mjs
```

`claude mcp list`로 연결을 확인합니다.

## 도구와 실제 동작

| 도구 | 동작 |
| --- | --- |
| `playlab_upload_image` | 로컬 PNG/JPEG/WebP(5MB 이하)를 업로드하고 3D 생성에 쓸 `imageUrl` 반환. |
| `playlab_create_video` | 비공개 영상 프로젝트 생성 후 첫 샷 렌더 시작. 4~15초. 크레딧 사용. |
| `playlab_video_status` | 렌더 상태 조회 및 완성된 영상 URL 반환. |
| `playlab_create_3d_asset` | PLAYLAB Supabase `uploads`에 이미 올린 이미지 1장으로 TRELLIS 생성 시작. 크레딧 사용. |
| `playlab_3d_status` | GLB, 리깅된 FBX, 텍스처, 단계 상태 조회. 자동 워크플로는 후속 단계를 진행할 수 있음. |
| `playlab_generate_music` | ACE-Step 음악 생성 시작. 크레딧 사용. |
| `playlab_music_status` | 두 MP3 결과 URL 및 상태 조회. |
| `playlab_save_result` | 완료된 결과를 `PLAYLAB_OUTPUT_DIR`에 저장하고 로컬 경로 반환. 영상 `primary`, 음악 `primary`/`alternate`, 3D `glb`/`fbx`. |

3D는 `playlab_upload_image`로 받은 주소를 `playlab_create_3d_asset.imageUrl`에 전달합니다. 공개 생성은 서버의 `TRELLIS_GENERATION_VERIFIED=true` 또는 관리자 계정이 필요합니다. 음악은 `RUNPOD_ACE_STEP_ENDPOINT_ID`와 실행 가능한 워커가 필요합니다. 영상도 설정된 RunPod 워커와 크레딧이 필요합니다. 조건이 충족되지 않으면 사이트 API의 오류가 MCP 도구에 그대로 표시됩니다. 로컬 디자인 미리보기(`PLAYLAB_DESIGN_PREVIEW=1`)에서는 모든 생성 요청이 차단됩니다.

작업은 비동기입니다. 생성 도구에서 받은 `projectId` 또는 `artifactId`로 상태를 다시 조회하고, `COMPLETED` 이후 `playlab_save_result`를 호출하세요. 기본적으로 Supabase 공개 `uploads` URL만 로컬에 저장합니다.
영상 워커가 Supabase 대신 외부 HTTPS URL을 반환한다면, 해당 워커의 정확한 출처(origin)를 `PLAYLAB_VIDEO_RESULT_ORIGINS`에 설정해야 로컬 저장이 가능합니다. 여러 출처는 쉼표로 구분합니다. 설정하지 않아도 완료 URL은 상태 조회 결과에 표시됩니다.
