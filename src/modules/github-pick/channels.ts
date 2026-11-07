// Whitelisted YouTube channels that introduce GitHub repositories.
// Picked 2026-11-08 by measuring how many of each channel's latest 15 uploads link a GitHub repo
// in the description (빌더조쉬 11/15, Github Awesome 15/15, …). Channels that rarely link repos
// (Fireship, Matthew Berman, 조코딩, 노마드코더 …) were left out on purpose.
export type PickChannel = { id: string; handle: string; name: string; lang: 'ko' | 'en' };

export const PICK_CHANNELS: PickChannel[] = [
  { id: 'UCxj3eVTAv9KLdrowXcuCFDQ', handle: 'builderjoshkim', name: '빌더조쉬', lang: 'ko' },
  { id: 'UC9Rrud-8CaHokDtK9FszvRg', handle: 'GithubAwesome', name: 'Github Awesome', lang: 'en' },
  { id: 'UCuJikvxjO83abRfdqVZaYKw', handle: 'GithubTrends', name: 'GithubTrends', lang: 'en' },
  { id: 'UC0m81bQuthaQZmFbXEY9QSw', handle: 'AICodeKing', name: 'AICodeKing', lang: 'en' },
  { id: 'UC1weYqfDgX0ALlNOSzcyblQ', handle: 'ManuAGI', name: 'ManuAGI', lang: 'en' },
  { id: 'UC55ODQSvARtgSyc8ThfiepQ', handle: 'samwitteveenai', name: 'Sam Witteveen', lang: 'en' },
  { id: 'UCMwVTLZIRRUyyVrkjDpn4pA', handle: 'ColeMedin', name: 'Cole Medin', lang: 'en' },
  { id: 'UCDq7SjbgRKty5TgGafW8Clg', handle: 'engineerprompt', name: 'Prompt Engineering', lang: 'en' },
  { id: 'UCWTyktbw5JYoSBduu8LsBgQ', handle: 'MervinPraison', name: 'Mervin Praison', lang: 'en' },
  { id: 'UCLR3sD0KB_dWpvcsrLP0aUg', handle: 'todaycode', name: '오늘코드', lang: 'ko' },
];
