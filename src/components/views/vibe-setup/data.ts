// vibe-setup content — single source for the board, the manual list and the motion guide.
// Each GuideStep is BOTH a manual line (text) and a mock screen the motion player animates.
// Targets: 'b0' button, 'o1' option, 'f0' field, 'l0' list-row action, 'p0' palette item.

export type DbChoice = 'firebase';
export type ColumnId = 'pc' | 'ai' | 'account' | 'project';

export interface MockOption { label: string; checked?: boolean; type?: 'radio' | 'check' | 'toggle' }
export interface MockField { label: string; value: string; mono?: boolean }
export interface MockRow { label: string; meta?: string; action?: string }
export interface MockButton { label: string; primary?: boolean }

interface MockBody {
  heading?: string;
  sub?: string;
  fields?: MockField[];
  options?: MockOption[];
  list?: MockRow[];
  code?: string[];
  buttons?: MockButton[];
}

export type MockScreen =
  | ({ kind: 'browser'; url: string } & MockBody)
  | ({ kind: 'installer'; app: string } & MockBody)
  | ({ kind: 'app'; app: string } & MockBody)
  | { kind: 'terminal'; app?: string; lines: { cmd?: string; out?: string[] }[] }
  | { kind: 'editor'; files: string[]; active?: number; code?: string[]; palette?: { query: string; items: string[] } };

export interface GuideStep {
  text: string;
  screen: MockScreen;
  target?: string;
  /** "기본값 그대로 Next" 구간 — 빨리감기 배지 */
  fast?: boolean;
  /** 터미널 화면의 복사 내용. 생략=화면 속 명령, ''=복사 버튼 숨김(아래 입력기 사용) */
  copy?: string;
}

export interface GuideLink { label: string; href: string; primary?: boolean }
export interface GuideCommand { label: string; code: string; note?: string }

export interface GuideItem {
  id: string;
  column: ColumnId;
  order: number;
  title: string;
  summary: string;
  minutes: number;
  icon: string;
  links: GuideLink[];
  steps: GuideStep[];
  commands?: GuideCommand[];
  verify?: { code: string; expect: string };
  troubles?: { q: string; a: string }[];
  notes?: string[];
  widget?: 'git-identity' | 'repo-commands' | 'env-vars' | 'ps-setup';
  /** 문제 해결처럼 준비 완료 조건에 포함하지 않는 안내 */
  optional?: boolean;
  /** 다른 항목을 먼저 끝내야 하는 경우 */
  after?: string;
}

export const COLUMNS: { id: ColumnId; step: number; title: string; desc: string }[] = [
  { id: 'pc', step: 1, title: 'PC에 설치할 것들', desc: '컴퓨터당 한 번만 하면 끝' },
  { id: 'ai', step: 2, title: '내가 쓸 AI 도구 골라 설치', desc: '하나만 골라도 OK' },
  { id: 'account', step: 3, title: '회원가입이 필요한 것들', desc: '계정은 한 번만 만들면 계속 사용' },
  { id: 'project', step: 4, title: '프로젝트마다 새로 만들 것', desc: '새 서비스를 만들 때마다 반복' },
];

// ─── shared mock helpers ───
const NEXT: MockButton[] = [{ label: '< Back' }, { label: 'Next >', primary: true }, { label: 'Cancel' }];
const INSTALL: MockButton[] = [{ label: '< Back' }, { label: 'Install', primary: true }, { label: 'Cancel' }];
const inst = (app: string, heading: string, extra: Partial<MockBody> = {}): MockScreen => ({ kind: 'installer', app, heading, buttons: NEXT, ...extra });
const term = (...lines: { cmd?: string; out?: string[] }[]): MockScreen => ({ kind: 'terminal', lines });

// ─── PowerShell commands (copy-ready) ───
// 한 번에 붙여넣는 전체 설정 스크립트 (실행 허용 → PATH 등록 → 바로 적용 → 확인)
export const PS_ALL = `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
$add = @("C:\\Program Files\\Git\\cmd", "C:\\Program Files\\nodejs", "$env:APPDATA\\npm", "$env:LOCALAPPDATA\\Programs\\Microsoft VS Code\\bin", "$env:USERPROFILE\\.local\\bin")
$user = [Environment]::GetEnvironmentVariable("Path", "User")
foreach ($p in $add) { if ((Test-Path $p) -and ($user -notlike "*$p*")) { $user = "$user;$p" } }
[Environment]::SetEnvironmentVariable("Path", $user.Trim(";"), "User")
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
git --version; node -v; npm -v; code -v`;

// ─── DB-dependent pieces ───
function dbAccount(): GuideItem {
  return {
    id: 'db-account', column: 'account', order: 11, icon: 'flame', minutes: 2,
    title: 'Firebase 계정',
    summary: '구글 계정 하나로 DB·로그인·파일 저장소를 바로 쓰게 해주는 서비스',
    links: [{ label: 'Firebase 콘솔 열기', href: 'https://console.firebase.google.com/', primary: true }, { label: '공식 문서', href: 'https://firebase.google.com/docs/web/setup?hl=ko' }],
    steps: [
      { text: 'firebase.google.com에서 "콘솔로 이동(Go to console)"을 눌러요.', target: 'b0', screen: { kind: 'browser', url: 'firebase.google.com', heading: 'Firebase', sub: '앱 개발과 운영을 위한 Google 플랫폼', buttons: [{ label: '콘솔로 이동', primary: true }, { label: '시작하기' }] } },
      { text: '평소 쓰는 구글 계정을 선택해 로그인해요. (Gmail 계정이면 OK)', target: 'l0', screen: { kind: 'browser', url: 'accounts.google.com', heading: '계정 선택', sub: 'Firebase(으)로 이동', list: [{ label: '내 이름', meta: 'me@gmail.com', action: '선택' }, { label: '다른 계정 사용' }] } },
      { text: '처음이면 약관 동의 체크 후 "계속". 이제 콘솔 첫 화면이 보이면 가입 끝!', target: 'b0', screen: { kind: 'browser', url: 'console.firebase.google.com', heading: 'Firebase에 오신 것을 환영합니다', options: [{ label: 'Firebase 약관에 동의합니다', checked: true, type: 'check' }], buttons: [{ label: '계속', primary: true }] } },
    ],
    notes: ['별도 회원가입 없이 구글 계정이 곧 Firebase 계정이에요.', '무료(Spark) 요금제로 시작하면 카드 등록 없이 쓸 수 있어요.'],
  };
}

function dbProject(): GuideItem {
  return {
    id: 'db-project', column: 'project', order: 13, icon: 'flame', minutes: 5,
    title: 'Firebase 프로젝트 만들기',
    summary: '이 서비스 전용 DB·로그인 공간을 만들고 연결 키(firebaseConfig)를 받기',
    links: [{ label: 'Firebase 콘솔', href: 'https://console.firebase.google.com/', primary: true }, { label: '웹 앱 추가 문서', href: 'https://firebase.google.com/docs/web/setup?hl=ko' }],
    steps: [
      { text: '콘솔 첫 화면에서 "Firebase 프로젝트 만들기"를 눌러요.', target: 'b0', screen: { kind: 'browser', url: 'console.firebase.google.com', heading: '프로젝트', buttons: [{ label: '+ Firebase 프로젝트 만들기', primary: true }] } },
      { text: '프로젝트 이름을 입력하고(GitHub 리포지토리와 같게 추천) 약관 체크 → 계속.', target: 'f0', screen: { kind: 'browser', url: 'console.firebase.google.com/u/0/', heading: '프로젝트 이름 지정', fields: [{ label: '프로젝트 이름', value: 'my-first-app' }], options: [{ label: 'Firebase 약관에 동의합니다', checked: true, type: 'check' }], buttons: [{ label: '계속', primary: true }] } },
      { text: 'Gemini·Google 애널리틱스는 처음엔 꺼도 돼요 → "프로젝트 만들기". 30초 정도 기다려요.', target: 'b0', fast: true, screen: { kind: 'browser', url: 'console.firebase.google.com/u/0/', heading: 'Google 애널리틱스', options: [{ label: '이 프로젝트에서 Google 애널리틱스 사용 설정', checked: false, type: 'toggle' }], buttons: [{ label: '프로젝트 만들기', primary: true }, { label: '이전' }] } },
      { text: '프로젝트 개요 화면에서 웹 아이콘 "</>"를 눌러 웹 앱을 추가해요.', target: 'b2', screen: { kind: 'browser', url: 'console.firebase.google.com/project/my-first-app/overview', heading: '앱에 Firebase를 추가하여 시작하기', buttons: [{ label: 'iOS+' }, { label: 'Android' }, { label: '</> 웹', primary: true }, { label: 'Unity' }] } },
      { text: '앱 닉네임 입력. "Firebase 호스팅"은 체크하지 않아요(배포는 Vercel로 할 거라서) → 앱 등록.', target: 'b0', screen: { kind: 'browser', url: 'console.firebase.google.com/project/my-first-app/overview', heading: '웹 앱에 Firebase 추가', fields: [{ label: '앱 닉네임', value: 'my-first-app-web' }], options: [{ label: '이 앱의 Firebase 호스팅도 설정하세요.', checked: false, type: 'check' }], buttons: [{ label: '앱 등록', primary: true }] } },
      { text: '화면에 나온 firebaseConfig { ... } 블록을 통째로 복사해 두세요. 다음 "환경변수" 단계에 붙여넣어요.', target: 'b0', screen: { kind: 'browser', url: 'console.firebase.google.com/project/my-first-app/overview', heading: 'Firebase SDK 추가', code: ['const firebaseConfig = {', '  apiKey: "AIza...",', '  authDomain: "my-first-app.firebaseapp.com",', '  projectId: "my-first-app",', '  storageBucket: "my-first-app.firebasestorage.app",', '  messagingSenderId: "1234567890",', '  appId: "1:1234567890:web:abc123"', '};'], buttons: [{ label: '📋 복사', primary: true }, { label: '콘솔로 이동' }] } },
      { text: '왼쪽 "빌드" 메뉴에서 필요한 기능을 켜요: Authentication → 시작하기 → Google 사용 설정 / Firestore Database → 데이터베이스 만들기.', target: 'l0', screen: { kind: 'browser', url: 'console.firebase.google.com/project/my-first-app', heading: '빌드', list: [{ label: 'Authentication', meta: '로그인', action: '시작하기' }, { label: 'Firestore Database', meta: 'DB', action: '만들기' }, { label: 'Storage', meta: '파일 저장' }] } },
    ],
    troubles: [
      { q: 'apiKey가 노출돼도 괜찮나요?', a: 'Firebase 웹 설정은 브라우저에 전달되는 공개 설정이에요. 데이터 접근은 Authentication과 Firestore 보안 규칙으로 제어해요. 서비스 계정 비공개 키를 여기에 넣으면 안 돼요.' },
      { q: 'Storage가 결제 정보를 요구해요', a: '파일 저장소 설정은 이번 입문 과정에서 생략해요. 먼저 Authentication과 Firestore를 연결하세요.' },
    ],
    notes: ['Firestore는 프로덕션 모드로 시작해요. AI 도구에 로그인한 사용자가 자기 데이터만 읽고 쓰도록 보안 규칙을 작성해 달라고 요청하세요.'],
    commands: [{ label: 'AI 코딩 도구에 붙여넣기', code: '이 프로젝트에 Firebase 웹 SDK를 설치하고 .env.local의 NEXT_PUBLIC_FIREBASE_ 환경변수로 초기화해줘. Firebase Authentication의 Google 로그인과 로그아웃, Firestore의 사용자별 데이터 저장을 구현해줘. 보안 규칙은 로그인한 사용자가 자기 데이터만 읽고 쓸 수 있도록 작성해줘. 서비스 계정 키는 브라우저에 넣지 마. 로컬에서 로그인과 저장을 확인하는 방법도 알려줘.' }],
  };
}

function envVars(): GuideItem {
  return {
    id: 'env-vars', column: 'project', order: 14, icon: 'key', minutes: 3,
    title: '환경변수(.env.local) 넣기',
    summary: 'Firebase 웹 앱 설정을 .env.local과 Vercel 환경변수에 연결하기',
    links: [{ label: 'Next.js 환경변수 문서', href: 'https://nextjs.org/docs/app/guides/environment-variables', primary: true }],
    widget: 'env-vars',
    steps: [
      { text: 'VS Code 왼쪽 탐색기에서 프로젝트 최상위 폴더에 새 파일 ".env.local"을 만들어요.', target: 'p0', screen: { kind: 'editor', files: ['app/', 'public/', 'package.json', '.gitignore'], palette: { query: '새 파일 이름', items: ['.env.local'] } } },
      { text: '아래 변환기가 만들어준 "키=값" 줄을 그대로 붙여넣고 저장(Ctrl+S).', screen: { kind: 'editor', files: ['app/', 'public/', '.env.local', 'package.json', '.gitignore'], active: 2, code: ['NEXT_PUBLIC_FIREBASE_API_KEY=AIza...', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-first-app.firebaseapp.com', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-first-app', 'NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc'] } },
      { text: '.gitignore 안에 ".env*" 줄이 있는지 확인! 있어야 키가 GitHub에 안 올라가요.', screen: { kind: 'editor', files: ['app/', 'public/', '.env.local', 'package.json', '.gitignore'], active: 4, code: ['# env files', '.env*', '', 'node_modules', '.next'] } },
      { text: '개발 서버를 껐다 켜야(Ctrl+C → npm run dev) 새 값이 적용돼요.', screen: term({ cmd: 'npm run dev', out: ['▲ Next.js', '- Local: http://localhost:3000', '- Environments: .env.local'] }) },
    ],
    notes: ['NEXT_PUBLIC_ 값은 브라우저에 공개되는 Firebase 웹 설정이에요. 서비스 계정 비공개 키는 넣지 마세요.', '같은 키=값을 다음 단계(Vercel)에도 그대로 붙여넣어요.'],
    troubles: [
      { q: '값이 undefined로 나와요', a: '① 파일 이름이 정확히 .env.local 인지(.txt 붙지 않았는지) ② 프로젝트 최상위 폴더인지 ③ 서버를 재시작했는지 확인하세요.' },
    ],
  };
}

export function getItems(db: DbChoice): GuideItem[] {
  const items: GuideItem[] = [
    // ═══ PC ═══
    {
      id: 'git', column: 'pc', order: 1, icon: 'git-branch', minutes: 5,
      title: 'Git',
      summary: '코드의 "저장 기록"을 남기고 GitHub에 올리게 해주는 프로그램',
      links: [{ label: 'Git 다운로드 (Windows)', href: 'https://git-scm.com/downloads/win', primary: true }, { label: '공식 매뉴얼', href: 'https://git-scm.com/book/ko/v2' }],
      steps: [
        { text: '공식 사이트에서 "Click here to download"를 눌러 설치 파일을 받아요.', target: 'b0', screen: { kind: 'browser', url: 'git-scm.com/downloads/win', heading: 'Download for Windows', sub: 'The latest version is automatically selected (x64)', buttons: [{ label: 'Click here to download', primary: true }] } },
        { text: '받은 파일을 실행하고 옵션은 바꾸지 말고 Next를 계속 눌러요.', target: 'b1', fast: true, screen: inst('Git Setup', 'Installing Git', { sub: '기본 설정 그대로 진행하세요.' }) },
        { text: 'Install → Finish를 누르면 설치 끝.', target: 'b0', screen: inst('Git Setup', 'Ready to Install', { buttons: INSTALL }) },
        { text: '새 PowerShell에서 git --version을 입력해 버전이 나오면 완료예요.', screen: term({ cmd: 'git --version', out: ['git version 2.xx.x.windows.1'] }) },
      ],
      verify: { code: 'git --version', expect: 'git version 2.xx.x.windows.1' },
      troubles: [
        { q: "'git' 용어가 cmdlet... 으로 인식되지 않습니다", a: 'PowerShell 창을 닫고 새로 열어보세요. 그래도 안 되면 "PowerShell 오류 해결" 안내를 확인하세요.' },
      ],
    },
    {
      id: 'node', column: 'pc', order: 2, icon: 'hexagon', minutes: 4,
      title: 'Node.js',
      summary: '웹앱(Next.js 등)을 내 PC에서 실행하는 엔진. 패키지 설치 도구 npm 포함',
      links: [{ label: 'Node.js LTS 다운로드', href: 'https://nodejs.org/ko/download', primary: true }, { label: '공식 문서', href: 'https://nodejs.org/ko/learn' }],
      steps: [
        { text: '다운로드 페이지에서 꼭 "LTS(장기 지원)" 버전을 고르고 Windows 설치 프로그램(.msi)을 받아요.', target: 'b0', screen: { kind: 'browser', url: 'nodejs.org/ko/download', heading: 'Node.js® 다운로드', options: [{ label: 'LTS (장기 지원) — 추천', checked: true, type: 'radio' }, { label: 'Current (최신 기능)', type: 'radio' }], buttons: [{ label: 'Windows 설치 프로그램 (.msi)', primary: true }] } },
        { text: '설치 파일을 실행하고 약관에 동의한 뒤, 옵션은 기본값 그대로 Next를 눌러요.', target: 'b1', fast: true, screen: inst('Node.js Setup', 'Custom Setup', { list: [{ label: 'Node.js runtime' }, { label: 'npm package manager' }, { label: 'Add to PATH' }] }) },
        { text: 'Install → Finish를 누르면 설치 끝.', target: 'b0', screen: inst('Node.js Setup', 'Ready to install Node.js', { buttons: INSTALL }) },
        { text: '새 PowerShell에서 node -v와 npm -v를 입력해 버전을 확인해요.', screen: term({ cmd: 'node -v', out: ['v24.x.x'] }, { cmd: 'npm -v', out: ['11.x.x'] }) },
      ],
      verify: { code: 'node -v; npm -v', expect: 'v24.x.x / 11.x.x (숫자는 달라도 OK)' },
      troubles: [
        { q: 'npm : 이 시스템에서 스크립트를 실행할 수 없으므로…', a: '설치는 끝난 상태예요. "PowerShell 오류 해결" 안내를 확인하세요.' },
      ],
    },
    {
      id: 'vscode', column: 'pc', order: 3, icon: 'code', minutes: 4,
      title: 'VS Code',
      summary: '코드를 보고 고치는 편집기. AI 도구와 터미널을 한 화면에서 같이 써요',
      links: [{ label: 'VS Code 다운로드', href: 'https://code.visualstudio.com/download', primary: true }, { label: '공식 문서', href: 'https://code.visualstudio.com/docs' }],
      steps: [
        { text: '다운로드 페이지에서 "Windows 10, 11" 버튼을 눌러요.', target: 'b0', screen: { kind: 'browser', url: 'code.visualstudio.com/download', heading: 'Download Visual Studio Code', sub: 'Free and built on open source', buttons: [{ label: '⊞ Windows 10, 11', primary: true }, { label: '.deb' }, { label: 'Mac' }] } },
        { text: '파일을 실행하고 약관에 동의한 뒤, 옵션은 바꾸지 말고 Next를 눌러요.', target: 'b1', fast: true, screen: inst('Visual Studio Code Setup', 'Select Additional Tasks', { sub: '기본 설정 그대로 진행하세요.' }) },
        { text: 'Install → Finish를 누르고 VS Code가 열리면 완료예요.', target: 'b0', screen: inst('Visual Studio Code Setup', 'Ready to Install', { buttons: INSTALL }) },
      ],
      notes: ['한국어 화면이 필요하면 설치 후 VS Code에서 표시 언어를 바꾸면 돼요.'],
    },
    {
      id: 'powershell', column: 'pc', order: 4, icon: 'terminal', minutes: 1,
      title: 'PowerShell 오류 해결 (필요할 때만)', optional: true,
      summary: '설치 후 git · node · npm · code 명령이 안 될 때만 확인해요',
      links: [],
      widget: 'ps-setup',
      steps: [
        { text: '명령이 안 될 때만 PowerShell을 모두 닫고 새로 열어 다시 확인해요. 설치 직후라면 이것만으로 해결될 수 있어요.', target: 'l0', screen: { kind: 'app', app: '검색', fields: [{ label: '', value: '🔍 powershell' }], list: [{ label: 'Windows PowerShell', meta: '앱', action: '열기' }] } },
        { text: '그래도 오류가 날 때만 "전체 한번에 복사" 버튼을 눌러 PowerShell에 붙여넣고 Enter를 눌러요.', copy: PS_ALL, screen: term({ cmd: 'Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force' }, { cmd: '$add = @("C:\\Program Files\\Git\\cmd", "C:\\Program Files\\nodejs", ...)' }, { cmd: 'git --version; node -v; npm -v; code -v', out: ['git version 2.xx.x.windows.1', 'v24.x.x', '11.x.x', '1.xx.x'] }) },
        { text: '버전 숫자가 나오면 해결됐어요. 오류가 남으면 설치한 프로그램만 다시 확인해요.', screen: term({ out: ['git version 2.xx.x.windows.1', 'v24.x.x', '11.x.x', '1.xx.x'] }) },
      ],
    },
    {
      id: 'git-identity', column: 'pc', order: 6, icon: 'user-check', minutes: 1, after: 'GitHub 가입 후',
      title: 'Git 사용자 등록',
      summary: '내 커밋에 "누가 저장했는지" 이름표를 붙이는 설정 (PC당 1번)',
      links: [],
      widget: 'git-identity',
      steps: [
        { text: '이 화면의 입력칸에 GitHub 아이디와 이메일을 넣어요. 명령어가 자동으로 만들어져요.', screen: { kind: 'app', app: 'PLAYLAB', heading: 'Git 사용자 등록', fields: [{ label: 'GitHub 아이디', value: 'my-id' }, { label: '이메일', value: 'me@example.com' }] } },
        { copy: '', text: '"명령어 전체 복사"를 누르고 VS Code 터미널(Ctrl+`)에 붙여넣어 Enter를 눌러요.', screen: { kind: 'terminal', app: 'Visual Studio Code · 터미널', lines: [{ cmd: 'git config --global user.name "my-id"' }, { cmd: 'git config --global user.email "me@example.com"' }] } },
        { text: '같은 VS Code 터미널에서 git config --global --list를 입력해 등록된 값을 확인해요.', screen: { kind: 'terminal', app: 'Visual Studio Code · 터미널', lines: [{ cmd: 'git config --global --list', out: ['user.name=my-id', 'user.email=me@example.com'] }] } },
      ],
      notes: ['VS Code에서 터미널은 Ctrl+`로 열어요.', '"--global"이라 이 PC에서 한 번만 설정하면 돼요.'],
    },
    // ═══ AI ═══
    {
      id: 'claude-code', column: 'ai', order: 7, icon: 'sparkles', minutes: 3,
      title: 'Claude 데스크톱 (Claude Code)',
      summary: 'Claude 앱의 "Code" 탭에서 한국어로 말하면 내 폴더의 코드를 직접 만들고 고쳐줘요',
      links: [{ label: 'Claude 데스크톱 다운로드', href: 'https://claude.ai/download', primary: true }, { label: '사용 안내', href: 'https://code.claude.com/docs/en/desktop' }],
      steps: [
        { text: 'claude.ai/download 에서 "Windows용 다운로드"를 눌러요.', target: 'b0', screen: { kind: 'browser', url: 'claude.ai/download', heading: 'Claude 데스크톱 앱 다운로드', sub: 'Windows · macOS', buttons: [{ label: 'Windows용 다운로드', primary: true }, { label: 'macOS' }] } },
        { text: '받은 설치 파일(Claude Setup)을 더블클릭. 따로 누를 것 없이 자동으로 설치되고 앱이 열려요.', fast: true, screen: { kind: 'app', app: 'Claude Setup', heading: 'Claude 설치 중…', sub: '잠시만 기다려 주세요', buttons: [] } },
        { text: '로그인(구글 계정 또는 이메일). Code 기능은 Pro 이상 요금제가 필요해요.', target: 'b0', screen: { kind: 'app', app: 'Claude', heading: 'Claude에 로그인', buttons: [{ label: 'Google로 계속하기', primary: true }, { label: '이메일로 계속하기' }] } },
        { text: '왼쪽 위에서 "Code" 탭을 선택해요. (Chat = 대화, Code = 코딩)', target: 'o1', screen: { kind: 'app', app: 'Claude', heading: '탭 선택', options: [{ label: 'Chat', type: 'radio' }, { label: 'Code', checked: true, type: 'radio' }] } },
        { text: '작업할 프로젝트 폴더를 고르고, 하고 싶은 걸 한국어로 입력하면 끝! 예: "이 폴더에 Next.js 랜딩페이지 만들어줘"', target: 'b0', screen: { kind: 'app', app: 'Claude · Code', heading: '폴더 선택', list: [{ label: 'C:\projects\my-first-app' }], buttons: [{ label: '폴더 열기', primary: true }] } },
      ],
      notes: ['Claude Pro 이상 구독이 필요해요.', 'Windows에서는 Git이 먼저 설치돼 있어야 해요.', '앱 안에서 미리보기 브라우저 · 터미널도 같이 쓸 수 있어요.'],
    },
    {
      id: 'chatgpt', column: 'ai', order: 8, icon: 'message-circle', minutes: 3,
      title: 'ChatGPT 데스크톱 (Codex)',
      summary: '대화 · 업무 · 코딩(Codex) 모드가 한 앱에. Codex 모드가 내 폴더의 코드를 직접 수정',
      links: [{ label: 'ChatGPT 앱 다운로드', href: 'https://chatgpt.com/download', primary: true }, { label: 'Microsoft Store', href: 'https://apps.microsoft.com/search?query=ChatGPT' }],
      steps: [
        { text: 'Microsoft Store(또는 chatgpt.com/download)에서 OpenAI의 "ChatGPT"를 "받기".', target: 'b0', screen: { kind: 'app', app: 'Microsoft Store', heading: 'ChatGPT', sub: 'OpenAI · 무료', buttons: [{ label: '받기', primary: true }] } },
        { text: '앱을 열고 로그인(구글/이메일). 계정이 없으면 회원가입.', target: 'b0', screen: { kind: 'app', app: 'ChatGPT', heading: 'ChatGPT에 오신 것을 환영합니다', buttons: [{ label: '로그인', primary: true }, { label: '회원가입' }] } },
        { text: '모드에서 "Codex"를 골라요. (Chat = 질문, Work = 업무, Codex = 코딩)', target: 'o2', screen: { kind: 'app', app: 'ChatGPT', heading: '모드 선택', options: [{ label: 'Chat', type: 'radio' }, { label: 'Work', type: 'radio' }, { label: 'Codex', checked: true, type: 'radio' }] } },
        { text: '작업할 프로젝트 폴더를 연결하고, 하고 싶은 일을 입력해요.', target: 'b0', screen: { kind: 'app', app: 'ChatGPT · Codex', heading: '프로젝트를 선택하세요', list: [{ label: 'C:\\projects\\my-first-app' }], buttons: [{ label: '폴더 열기', primary: true }] } },
      ],
      notes: ['2026년 7월부터 Codex는 별도 앱이 아니라 ChatGPT 데스크톱 앱 안의 모드예요.', '플랜별 사용량 한도는 바뀔 수 있으니 공식 안내를 확인하세요.'],
    },
    {
      id: 'antigravity', column: 'ai', order: 9, icon: 'orbit', minutes: 4,
      title: 'Google Antigravity',
      summary: '구글의 AI 에이전트 에디터. VS Code와 비슷한 화면에서 AI가 코드를 짜고 실행까지',
      links: [{ label: 'Antigravity 다운로드', href: 'https://antigravity.google/download', primary: true }, { label: '공식 문서', href: 'https://antigravity.google/docs' }],
      steps: [
        { text: '다운로드 페이지에서 "Download for x64"를 눌러요. (대부분의 PC는 x64)', target: 'b0', screen: { kind: 'browser', url: 'antigravity.google/download', heading: 'Download Google Antigravity', sub: 'Windows 10 / 11 (64-bit)', buttons: [{ label: 'Download for x64', primary: true }, { label: 'Download for ARM64' }] } },
        { text: '설치 파일 실행 → 라이선스 동의 → Next.', target: 'o0', screen: inst('Antigravity Setup', 'License Agreement', { options: [{ label: 'I accept the agreement', checked: true, type: 'radio' }] }) },
        { text: '설치 경로 확인 후 Install.', target: 'b1', screen: inst('Antigravity Setup', 'Ready to Install', { buttons: INSTALL }) },
        { text: '시작 메뉴에서 Antigravity 실행 → "Sign in with Google".', target: 'b0', screen: { kind: 'app', app: 'Antigravity', heading: 'Welcome to Antigravity', buttons: [{ label: 'Sign in with Google', primary: true }] } },
        { text: '"Open Folder"로 프로젝트 폴더를 열고 오른쪽 Agent 창에 요청을 입력해요.', target: 'b0', screen: { kind: 'app', app: 'Antigravity', heading: '시작', buttons: [{ label: 'Open Folder', primary: true }, { label: 'Clone Repository' }] } },
      ],
      notes: ['VS Code 기반이라 단축키 · 확장이 거의 같아요.'],
    },
    // ═══ ACCOUNT ═══
    {
      id: 'github-signup', column: 'account', order: 5, icon: 'github', minutes: 4,
      title: 'GitHub',
      summary: '내 코드를 인터넷에 보관하는 저장소. Vercel이 여기서 코드를 가져와 배포해요',
      links: [{ label: 'GitHub 가입하기', href: 'https://github.com/signup', primary: true }, { label: 'GitHub 문서', href: 'https://docs.github.com/ko/get-started' }],
      steps: [
        { text: '이메일 · 비밀번호 · 아이디(Username) 입력. 아이디는 영문 소문자로 — 주소가 github.com/아이디 가 돼요.', target: 'b0', screen: { kind: 'browser', url: 'github.com/signup', heading: 'Sign up to GitHub', fields: [{ label: 'Email', value: 'me@example.com' }, { label: 'Password', value: '••••••••••' }, { label: 'Username', value: 'my-id' }, { label: 'Your Country/Region', value: 'South Korea ▾' }], buttons: [{ label: 'Continue', primary: true }] } },
        { text: '"Verify your account" 퍼즐은 직접 풀어요. (로봇 확인)', target: 'b0', screen: { kind: 'browser', url: 'github.com/signup', heading: 'Verify your account', sub: '사람인지 확인하는 퍼즐이에요', buttons: [{ label: 'Visual puzzle', primary: true }, { label: 'Audio' }] } },
        { text: '메일함에 온 8자리 코드를 입력해요.', target: 'f0', screen: { kind: 'browser', url: 'github.com/account_verifications', heading: 'Confirm your email address', fields: [{ label: 'Enter code', value: '1 2 3 4 5 6 7 8', mono: true }] } },
        { text: '로그인하고 플랜은 Free로 계속해요.', target: 'b0', screen: { kind: 'browser', url: 'github.com', heading: 'Welcome to GitHub!', list: [{ label: 'Free', meta: '$0 · 무제한 공개/비공개 리포지토리' }], buttons: [{ label: 'Continue for free', primary: true }] } },
      ],
      troubles: [
        { q: '코드 메일이 안 와요', a: '스팸함을 확인하고, 몇 분 뒤 "Resend the code"를 누르세요.' },
      ],
    },
    {
      id: 'vercel-signup', column: 'account', order: 10, icon: 'triangle', minutes: 2,
      title: 'Vercel',
      summary: 'GitHub에 올린 코드를 버튼 한 번으로 인터넷 주소(xxx.vercel.app)에 배포',
      links: [{ label: 'Vercel 가입하기', href: 'https://vercel.com/signup', primary: true }, { label: 'Vercel 문서', href: 'https://vercel.com/docs/getting-started-with-vercel' }],
      steps: [
        { text: '"Hobby (개인 프로젝트, 무료)"를 선택하고 이름 입력 → Continue.', target: 'o0', screen: { kind: 'browser', url: 'vercel.com/signup', heading: "Let's create your account", options: [{ label: "I'm working on personal projects (Hobby)", checked: true, type: 'radio' }, { label: "I'm working on commercial projects (Pro)", type: 'radio' }], fields: [{ label: 'Your Name', value: '홍길동' }], buttons: [{ label: 'Continue', primary: true }] } },
        { text: '꼭 "Continue with GitHub"! 그래야 리포지토리가 자동 연결돼요.', target: 'b0', screen: { kind: 'browser', url: 'vercel.com/signup', heading: 'Connect a Git Provider', buttons: [{ label: 'Continue with GitHub', primary: true }, { label: 'Continue with GitLab' }, { label: 'Continue with Bitbucket' }] } },
        { text: 'GitHub 권한 화면에서 "Authorize Vercel".', target: 'b0', screen: { kind: 'browser', url: 'github.com/login/oauth/authorize', heading: 'Authorize Vercel', sub: 'Vercel by vercel wants to access your account', buttons: [{ label: 'Authorize Vercel', primary: true }, { label: 'Cancel' }] } },
      ],
      notes: ['Hobby는 개인·비상업용 무료 플랜이에요. 수익화하면 Pro 전환을 검토하세요.'],
    },
    dbAccount(),
    // ═══ PROJECT ═══
    {
      id: 'github-repo', column: 'project', order: 12, icon: 'folder-git', minutes: 3,
      title: 'GitHub 리포지토리 만들기',
      summary: '이 프로젝트 전용 코드 보관함을 만들고 내 PC 폴더와 연결(push)',
      links: [{ label: '새 리포지토리 만들기', href: 'https://github.com/new', primary: true }, { label: '문서', href: 'https://docs.github.com/ko/repositories/creating-and-managing-repositories/quickstart-for-repositories' }],
      widget: 'repo-commands',
      steps: [
        { text: '리포지토리 이름(영문 소문자-하이픈) 입력, Public/Private 선택. 내 PC에 이미 코드가 있다면 "Add README"는 체크하지 않아요 → Create repository.', target: 'b0', screen: { kind: 'browser', url: 'github.com/new', heading: 'Create a new repository', fields: [{ label: 'Repository name *', value: 'my-first-app' }], options: [{ label: 'Public', type: 'radio' }, { label: 'Private', checked: true, type: 'radio' }, { label: 'Add a README file', checked: false, type: 'check' }], buttons: [{ label: 'Create repository', primary: true }] } },
        { text: '나타난 Quick setup 화면의 주소(…/my-first-app.git)를 확인해요. 아래 입력칸이 이 주소를 자동으로 만들어줘요.', target: 'f0', screen: { kind: 'browser', url: 'github.com/my-id/my-first-app', heading: 'Quick setup', fields: [{ label: 'HTTPS', value: 'https://github.com/my-id/my-first-app.git', mono: true }] } },
        { copy: '', text: 'VS Code에서 프로젝트 폴더를 열고 터미널(Ctrl+`)에 아래 명령을 붙여넣어요.', screen: term({ cmd: 'git init' }, { cmd: 'git add .' }, { cmd: 'git commit -m "first commit"' }, { cmd: 'git branch -M main' }, { cmd: 'git remote add origin https://github.com/my-id/my-first-app.git' }, { cmd: 'git push -u origin main', out: ['To https://github.com/my-id/my-first-app.git', ' * [new branch]  main -> main'] }) },
        { text: '첫 push 때 로그인 창이 뜨면 "Sign in with your browser" → 브라우저에서 승인. (PC당 한 번)', target: 'b0', screen: { kind: 'installer', app: 'Connect to GitHub', heading: 'GitHub', sub: 'Git Credential Manager', buttons: [{ label: 'Sign in with your browser', primary: true }, { label: 'Token' }] } },
      ],
      troubles: [
        { q: 'Author identity unknown', a: '"Git 사용자 등록" 단계를 아직 안 했어요. 먼저 이름/이메일을 등록하세요.' },
        { q: 'remote origin already exists', a: 'git remote set-url origin <주소> 로 바꾸세요.' },
        { q: 'rejected (fetch first)', a: '리포지토리를 만들 때 README를 체크했다면 git pull origin main --allow-unrelated-histories 후 다시 push 하세요.' },
      ],
    },
    dbProject(),
    envVars(),
    {
      id: 'vercel-project', column: 'project', order: 15, icon: 'rocket', minutes: 3,
      title: 'Vercel 프로젝트 연결 · 배포',
      summary: 'GitHub 리포지토리를 가져와 인터넷 주소로 배포. 이후엔 push만 하면 자동 재배포',
      links: [{ label: 'Vercel 새 프로젝트', href: 'https://vercel.com/new', primary: true }, { label: '환경변수 문서', href: 'https://vercel.com/docs/environment-variables' }],
      steps: [
        { text: 'vercel.com/new 에서 방금 만든 리포지토리 옆 "Import"를 눌러요. (안 보이면 "Adjust GitHub App Permissions")', target: 'l0', screen: { kind: 'browser', url: 'vercel.com/new', heading: 'Import Git Repository', list: [{ label: 'my-first-app', meta: '방금 전', action: 'Import' }, { label: 'old-project', meta: '3일 전', action: 'Import' }] } },
        { text: 'Framework Preset은 자동(Next.js). "Environment Variables"를 펼쳐 .env.local 내용을 통째로 붙여넣어요.', target: 'f2', screen: { kind: 'browser', url: 'vercel.com/new/import', heading: 'Configure Project', fields: [{ label: 'Project Name', value: 'my-first-app' }, { label: 'Framework Preset', value: 'Next.js ▾' }, { label: 'Environment Variables', value: '📋 .env 내용 붙여넣기 (Key=Value 자동 분리)' }], buttons: [{ label: 'Deploy', primary: true }] } },
        { text: 'Deploy를 누르고 1~2분 기다려요.', target: 'b0', screen: { kind: 'browser', url: 'vercel.com/new/import', heading: 'Configure Project', sub: 'Building…', buttons: [{ label: 'Deploy', primary: true }] } },
        { text: '🎉 Congratulations! 나온 주소(my-first-app.vercel.app)가 내 서비스 주소예요.', target: 'f0', screen: { kind: 'browser', url: 'vercel.com/my-id/my-first-app', heading: 'Congratulations!', fields: [{ label: 'Domains', value: 'my-first-app.vercel.app', mono: true }], buttons: [{ label: 'Continue to Dashboard', primary: true }] } },
        { text: 'Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 배포 주소(예: my-first-app.vercel.app)를 추가해요. 로컬 로그인을 테스트할 때는 localhost도 등록해요.', screen: { kind: 'browser', url: 'console.firebase.google.com', heading: 'Authentication · 승인된 도메인', fields: [{ label: '도메인', value: 'my-first-app.vercel.app' }], buttons: [{ label: '추가', primary: true }] } },
        { text: '배포 주소에서 Google 로그인 → 데이터 저장 → 새로고침 후 다시 보이는지 확인하면 끝이에요.', screen: { kind: 'browser', url: 'my-first-app.vercel.app', heading: '내 첫 서비스', sub: '로그인과 데이터 저장 확인', buttons: [{ label: 'Google로 로그인', primary: true }] } },
        { text: '이후로는 코드를 고치고 push만 하면 Vercel이 자동으로 다시 배포해요.', screen: term({ cmd: 'git add .' }, { cmd: 'git commit -m "update"' }, { cmd: 'git push', out: ['→ Vercel: Building… → Ready ✓'] }) },
      ],
      commands: [
        { label: '수정 후 배포 (매번)', code: 'git add .\ngit commit -m "update"\ngit push' },
      ],
      troubles: [
        { q: '배포가 실패해요 (Build Failed)', a: '프로젝트 → Deployments → 실패한 항목 → Build Logs의 빨간 줄을 복사해 AI 도구에 "이 에러 고쳐줘"라고 붙여넣으세요.' },
        { q: '환경변수를 나중에 추가했는데 반영이 안 돼요', a: 'Settings → Environment Variables에서 추가한 뒤 Deployments → 최신 배포 ⋯ → Redeploy 해야 적용돼요.' },
      ],
    },
  ];
  return items.sort((a, b) => a.order - b.order);
}
