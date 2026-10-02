// Vibe-coding manual — crawlable documents built from the same GuideItem data the
// interactive guide uses, so the docs and the app never drift apart.
import { COLUMNS, getItems, type DbChoice, type GuideItem } from './data';

export const MANUAL_PATH = '/guide/vibe-coding';
export const MANUAL_TITLE = '바이브코딩 매뉴얼';
export const MANUAL_DESCRIPTION = '코딩을 몰라도 AI로 웹 서비스를 만드는 바이브코딩 준비 매뉴얼. Git·Node.js·VS Code 설치, PowerShell PATH 설정, Claude·ChatGPT Codex·Antigravity AI 코딩 도구, GitHub·Vercel·Firebase·Supabase 가입과 첫 배포까지 초보자 기준으로 정리했습니다.';
export const MANUAL_UPDATED = '2026-10-02';

interface DocSeo {
  title: string;
  description: string;
  keywords: string[];
  /** 검색·AI 답변에 그대로 인용될 수 있는 2~3문장 핵심 답 */
  answer: string;
  faq?: [string, string][];
}

const SEO: Record<string, DocSeo> = {
  'git-install': {
    title: '윈도우 Git 설치 방법 (초보자용)',
    description: 'Windows 10·11에 Git을 설치하는 방법. 설치 화면마다 무엇을 골라야 하는지, VS Code 기본 편집기·main 브랜치·PATH 설정까지 초보자 기준으로 설명합니다.',
    keywords: ['깃 설치', 'git 설치 방법', '윈도우 git 설치', 'git for windows', 'git 다운로드', '바이브코딩 git'],
    answer: 'Git은 git-scm.com에서 Windows 설치 파일을 받아 실행하면 됩니다. 대부분 Next만 누르면 되고, 기본 편집기는 VS Code로, 기본 브랜치 이름은 main으로, PATH는 가운데 (Recommended) 옵션으로 두는 것만 확인하세요. 설치 후 새 PowerShell에서 git --version 으로 버전이 나오면 성공입니다.',
    faq: [['Git과 GitHub는 다른가요?', 'Git은 내 PC에서 코드 변경 기록을 남기는 프로그램이고, GitHub는 그 기록을 인터넷에 보관하는 서비스입니다. 둘 다 필요합니다.']],
  },
  'nodejs-install': {
    title: 'Node.js 설치 방법 · LTS 버전 고르기',
    description: 'Windows에 Node.js LTS를 설치하고 node -v, npm -v로 확인하는 방법. Tools for Native Modules 체크 여부와 npm 스크립트 실행 오류 해결법까지.',
    keywords: ['node.js 설치', '노드js 설치 방법', 'nodejs lts', 'npm 설치', 'node -v', 'npm 스크립트를 실행할 수 없으므로'],
    answer: 'Node.js는 nodejs.org에서 LTS(장기 지원) 버전의 Windows 설치 프로그램(.msi)을 받아 설치합니다. 약관 동의 후 기본값으로 Next를 누르되, Tools for Native Modules 체크박스는 비워두세요. 설치 후 node -v와 npm -v에 버전이 나오면 성공입니다.',
    faq: [['LTS와 Current 중 무엇을 받아야 하나요?', '초보자는 무조건 LTS를 받으세요. 오래 지원되고 대부분의 라이브러리가 LTS 기준으로 동작합니다.']],
  },
  'vscode-install': {
    title: 'VS Code 설치 방법과 한국어 설정',
    description: 'Visual Studio Code를 설치할 때 꼭 체크해야 할 Add to PATH, Open with Code 옵션과 한국어 언어팩 설정, code -v 확인 방법.',
    keywords: ['vs code 설치', 'visual studio code 설치 방법', 'vscode 한국어 설정', 'vscode add to path', 'code 명령어'],
    answer: 'VS Code는 code.visualstudio.com에서 Windows 설치 파일을 받아 설치합니다. 추가 작업 화면에서 Add to PATH와 Open with Code 체크박스를 모두 체크하는 것이 핵심입니다. 한국어는 Ctrl+Shift+P → Configure Display Language → 한국어로 바꿀 수 있습니다.',
  },
  'powershell-path': {
    title: 'PowerShell 환경변수 PATH 등록 · 스크립트 실행 오류 해결',
    description: '어느 폴더에서든 git, node, npm, code, claude 명령이 먹히도록 PowerShell에서 사용자 PATH를 등록하고, "이 시스템에서 스크립트를 실행할 수 없으므로" 오류를 해결하는 한 번에 복사용 명령.',
    keywords: ['powershell path 설정', '환경변수 path 추가', '이 시스템에서 스크립트를 실행할 수 없으므로', 'set-executionpolicy remotesigned', "용어가 cmdlet 함수 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다", 'npm.ps1 오류'],
    answer: 'PowerShell을 열고 실행 정책을 RemoteSigned로 바꾼 뒤, Git·Node.js·VS Code·npm 경로를 사용자 PATH에 추가하면 어느 폴더에서든 명령이 동작합니다. 아래 스크립트를 한 번에 붙여넣으면 실행 허용, PATH 등록, 즉시 적용, 버전 확인까지 끝납니다. 관리자 권한은 필요 없습니다.',
    faq: [
      ['"이 시스템에서 스크립트를 실행할 수 없으므로" 오류는 왜 나나요?', 'Windows 기본 실행 정책이 .ps1 스크립트를 막기 때문입니다. Set-ExecutionPolicy -Scope CurrentUser RemoteSigned 로 현재 사용자만 허용하면 해결됩니다.'],
      ["'git' 용어가 cmdlet... 으로 인식되지 않는다고 나와요", '프로그램 경로가 PATH에 없거나 창을 새로 열지 않아서입니다. 이 문서의 스크립트를 실행한 뒤 터미널을 모두 닫고 새로 여세요.'],
    ],
  },
  'git-config-user': {
    title: 'git config user.name / user.email 설정 방법',
    description: 'Git 커밋에 이름표를 붙이는 git config --global user.name, user.email 설정 방법과 GitHub noreply 이메일로 이메일을 숨기는 법. Author identity unknown 오류 해결.',
    keywords: ['git config user.name', 'git config user.email', 'git 사용자 설정', 'author identity unknown', 'github noreply 이메일', 'git config --global'],
    answer: 'PowerShell에서 git config --global user.name "GitHub아이디"와 git config --global user.email "이메일" 두 줄을 실행하면 됩니다. --global 옵션이라 PC당 한 번만 하면 모든 프로젝트에 적용됩니다. 이메일을 공개하기 싫다면 GitHub Settings → Emails의 noreply 주소를 쓰세요.',
    faq: [['Author identity unknown 오류가 나요', '사용자 이름과 이메일이 등록되지 않은 상태에서 커밋했기 때문입니다. 위 두 줄을 실행한 뒤 다시 커밋하세요.']],
  },
  'claude-desktop': {
    title: 'Claude 데스크톱 앱 설치 · Claude Code 사용법',
    description: 'Claude 데스크톱 앱을 Windows에 설치하고 Code 탭에서 프로젝트 폴더를 열어 AI로 코딩하는 방법. 바이브코딩 초보자를 위한 Claude Code 시작 가이드.',
    keywords: ['클로드 코드', 'claude code 설치', 'claude 데스크톱 앱', '클로드 데스크탑 다운로드', '바이브코딩 클로드', 'ai 코딩 도구'],
    answer: 'claude.ai/download에서 Windows용 Claude 데스크톱 앱을 받아 설치하고 로그인한 뒤, Code 탭에서 프로젝트 폴더를 고르면 됩니다. 그다음 "이 폴더에 랜딩페이지 만들어줘"처럼 한국어로 요청하면 Claude가 파일을 직접 만들고 고칩니다. Code 기능은 Pro 이상 구독이 필요합니다.',
  },
  'chatgpt-codex': {
    title: 'ChatGPT 데스크톱 앱 Codex 모드로 코딩하기',
    description: 'ChatGPT Windows 앱을 설치하고 Codex 모드로 내 프로젝트 폴더의 코드를 AI가 직접 수정하게 하는 방법. Chat·Work·Codex 모드 차이.',
    keywords: ['chatgpt codex', 'codex 사용법', 'chatgpt 데스크톱 앱', 'chatgpt windows 앱', 'openai codex 코딩'],
    answer: 'Microsoft Store나 chatgpt.com/download에서 ChatGPT 앱을 받아 로그인한 뒤 Codex 모드를 고르면 됩니다. 프로젝트 폴더를 연결하면 Codex가 코드를 읽고 직접 수정합니다. 2026년 7월부터 Codex는 별도 앱이 아니라 ChatGPT 데스크톱 앱 안의 모드입니다.',
  },
  'antigravity-install': {
    title: 'Google Antigravity 설치 방법 (Windows)',
    description: '구글의 AI 에이전트 에디터 Antigravity를 Windows에 설치하고 구글 계정으로 로그인해 프로젝트 폴더를 여는 방법.',
    keywords: ['antigravity 설치', '구글 안티그래비티', 'google antigravity', 'antigravity 다운로드', 'ai 에디터'],
    answer: 'antigravity.google/download에서 Download for x64를 받아 설치하고, 실행 후 Sign in with Google로 로그인합니다. Open Folder로 프로젝트 폴더를 연 다음 Agent 창에 원하는 작업을 입력하면 됩니다. VS Code 기반이라 화면과 단축키가 비슷합니다.',
  },
  'github-signup': {
    title: 'GitHub 회원가입 방법 (무료 플랜)',
    description: 'GitHub 가입 순서: 이메일·비밀번호·아이디 입력, 퍼즐 인증, 이메일 코드 확인, Free 플랜 선택. 아이디 정하는 팁까지.',
    keywords: ['깃허브 가입', 'github 회원가입', 'github 가입 방법', 'github 무료', '깃허브 아이디'],
    answer: 'github.com/signup에서 이메일, 비밀번호, 아이디(Username)를 입력하고 퍼즐 인증과 메일로 온 8자리 코드를 입력하면 가입이 끝납니다. 플랜은 Free로 충분합니다. 아이디는 github.com/아이디 주소가 되므로 영문 소문자로 정하세요.',
  },
  'vercel-signup': {
    title: 'Vercel 회원가입 · GitHub 연동 방법',
    description: 'Vercel에 Hobby(무료) 플랜으로 가입하고 Continue with GitHub로 리포지토리를 연동하는 방법.',
    keywords: ['vercel 가입', '버셀 회원가입', 'vercel github 연동', 'vercel hobby 무료', '버셀 사용법'],
    answer: 'vercel.com/signup에서 Hobby(개인·무료)를 고르고 이름을 입력한 뒤, 반드시 Continue with GitHub로 가입하세요. GitHub 권한 화면에서 Authorize Vercel을 누르면 리포지토리가 자동으로 연결되어 나중에 버튼 한 번으로 배포할 수 있습니다.',
  },
  'firebase-signup': {
    title: 'Firebase 시작하기 · 콘솔 가입 방법',
    description: '구글 계정으로 Firebase 콘솔에 들어가 약관에 동의하고 시작하는 방법. 별도 회원가입 없이 무료 Spark 요금제로 사용.',
    keywords: ['firebase 가입', '파이어베이스 시작하기', 'firebase 콘솔', 'firebase 무료', '파이어베이스 사용법'],
    answer: 'Firebase는 별도 회원가입 없이 구글 계정으로 console.firebase.google.com에 로그인하고 약관에 동의하면 바로 사용할 수 있습니다. 무료 Spark 요금제로 시작하면 카드 등록이 필요 없습니다.',
  },
  'supabase-signup': {
    title: 'Supabase 회원가입 · 조직 만들기',
    description: 'Continue with GitHub로 Supabase에 가입하고 Personal·Free 조직을 만드는 방법.',
    keywords: ['supabase 가입', '수파베이스 회원가입', 'supabase 무료', 'supabase github 로그인', '수파베이스 사용법'],
    answer: 'supabase.com/dashboard/sign-up에서 Continue with GitHub로 가입하고 Authorize supabase를 누른 뒤, 조직(Organization)을 Type: Personal, Plan: Free로 만들면 됩니다. 무료 플랜은 프로젝트 2개까지 쓸 수 있습니다.',
  },
  'github-repo-push': {
    title: 'GitHub 리포지토리 만들고 첫 push 하기',
    description: 'GitHub에서 새 리포지토리를 만들고 내 PC 프로젝트 폴더를 git init, git remote add origin, git push -u origin main으로 올리는 방법과 자주 나는 오류 해결.',
    keywords: ['github 리포지토리 만들기', 'git push 방법', 'git remote add origin', 'git push -u origin main', 'remote origin already exists', '깃허브 업로드'],
    answer: 'github.com/new에서 리포지토리를 만든 뒤, 프로젝트 폴더 터미널에서 git init → git add . → git commit → git branch -M main → git remote add origin 주소 → git push -u origin main 순서로 실행하면 됩니다. 첫 push 때 뜨는 GitHub 로그인 창은 브라우저로 승인하세요.',
  },
  'firebase-project': {
    title: 'Firebase 프로젝트 생성 · 웹 앱 firebaseConfig 받기',
    description: 'Firebase 프로젝트를 만들고 웹 앱(</>)을 등록해 firebaseConfig 키를 받는 방법. Authentication·Firestore 활성화와 보안 규칙 주의점.',
    keywords: ['firebase 프로젝트 만들기', 'firebaseconfig', 'firebase 웹 앱 추가', 'firestore 시작', 'firebase authentication 설정', 'firebase apikey 노출'],
    answer: 'Firebase 콘솔에서 프로젝트를 만들고, 프로젝트 개요의 웹(</>) 아이콘으로 앱을 등록하면 firebaseConfig가 나옵니다. 이 값을 .env.local과 Vercel 환경변수에 넣어 사용합니다. 필요한 기능은 빌드 메뉴에서 Authentication과 Firestore Database를 켜세요.',
  },
  'supabase-project': {
    title: 'Supabase 프로젝트 생성 · URL과 Publishable key 찾기',
    description: 'Supabase 새 프로젝트를 서울 리전으로 만들고 Project URL과 Publishable key(anon key)를 복사하는 방법.',
    keywords: ['supabase 프로젝트 생성', 'supabase url key', 'supabase anon key', 'supabase publishable key', '수파베이스 서울 리전'],
    answer: 'Supabase 대시보드에서 New project를 누르고 이름, DB 비밀번호(꼭 저장), 지역 Northeast Asia (Seoul)을 정해 만듭니다. 1~2분 뒤 상단 Connect 또는 Settings → API Keys에서 Project URL과 Publishable key를 복사하세요. Secret key는 절대 공개하면 안 됩니다.',
  },
  'env-firebase': {
    title: 'Next.js .env.local에 Firebase 환경변수 넣기',
    description: 'firebaseConfig 값을 NEXT_PUBLIC_FIREBASE_ 환경변수로 바꿔 .env.local과 Vercel에 넣는 방법. undefined 오류 해결.',
    keywords: ['env.local 설정', 'next.js 환경변수', 'next_public_firebase', 'firebase 환경변수', '환경변수 undefined'],
    answer: '프로젝트 최상위 폴더에 .env.local 파일을 만들고 NEXT_PUBLIC_FIREBASE_API_KEY=값 형식으로 firebaseConfig 값을 한 줄씩 넣습니다. .gitignore에 .env*가 있는지 확인하고, 개발 서버를 재시작해야 적용됩니다. 같은 내용을 Vercel 환경변수에도 넣으세요.',
  },
  'env-supabase': {
    title: 'Next.js .env.local에 Supabase 환경변수 넣기',
    description: 'Supabase Project URL과 Publishable key를 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY로 .env.local과 Vercel에 넣는 방법.',
    keywords: ['supabase 환경변수', 'next_public_supabase_url', 'next.js supabase env', 'env.local 설정', '환경변수 undefined'],
    answer: '프로젝트 최상위 폴더의 .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 두 줄을 넣으면 됩니다. 저장 후 개발 서버를 재시작하고, 같은 값을 Vercel 프로젝트 환경변수에도 등록하세요.',
  },
  'vercel-deploy': {
    title: 'Vercel 배포 방법 · GitHub 리포지토리 Import',
    description: 'vercel.com/new에서 GitHub 리포지토리를 Import하고 환경변수를 붙여넣어 Deploy하는 방법. 이후 git push만으로 자동 재배포, Build Failed 해결.',
    keywords: ['vercel 배포', '버셀 배포 방법', 'next.js 배포', 'vercel 환경변수', 'vercel build failed', 'vercel redeploy'],
    answer: 'vercel.com/new에서 GitHub 리포지토리 옆 Import를 누르고, Environment Variables에 .env.local 내용을 붙여넣은 뒤 Deploy를 누르면 1~2분 안에 xxx.vercel.app 주소가 생깁니다. 이후로는 코드를 고치고 git push만 하면 자동으로 다시 배포됩니다.',
  },
};

export interface ManualDoc {
  slug: string;
  item: GuideItem;
  step: (typeof COLUMNS)[number];
  seo: DocSeo;
}

function slugFor(item: GuideItem, db: DbChoice): string {
  const map: Record<string, string> = {
    git: 'git-install', node: 'nodejs-install', vscode: 'vscode-install', powershell: 'powershell-path',
    'git-identity': 'git-config-user', 'claude-code': 'claude-desktop', chatgpt: 'chatgpt-codex', antigravity: 'antigravity-install',
    'github-signup': 'github-signup', 'vercel-signup': 'vercel-signup', 'github-repo': 'github-repo-push', 'vercel-project': 'vercel-deploy',
    'db-account': `${db}-signup`, 'db-project': `${db}-project`, 'env-vars': `env-${db}`,
  };
  return map[item.id] ?? item.id;
}

/** All manual documents in reading order (Firebase variants before Supabase). */
export function getManualDocs(): ManualDoc[] {
  const seen = new Set<string>();
  const docs: ManualDoc[] = [];
  for (const db of ['firebase', 'supabase'] as const) {
    for (const item of getItems(db)) {
      const slug = slugFor(item, db);
      if (seen.has(slug) || !SEO[slug]) continue;
      seen.add(slug);
      docs.push({ slug, item, step: COLUMNS.find((c) => c.id === item.column)!, seo: SEO[slug] });
    }
  }
  const stepOrder = (d: ManualDoc) => d.step.step * 100 + d.item.order;
  return docs.sort((a, b) => stepOrder(a) - stepOrder(b));
}

export function getManualDoc(slug: string): ManualDoc | undefined {
  return getManualDocs().find((d) => d.slug === slug);
}

/** Item id + db → doc slug, for "문서로 보기" links inside the app. */
export function manualSlug(item: GuideItem, db: DbChoice): string {
  return slugFor(item, db);
}
