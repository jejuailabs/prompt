// Notify IndexNow search engines (Naver, Bing → also used by ChatGPT search) about every URL in the sitemap.
// Usage (after a production deploy):  node scripts/indexnow.mjs [https://your-domain]
const site = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app').replace(/\/$/, '');
const key = process.env.INDEXNOW_KEY || '0f71e66af8d543a0221928e4020383df'; // matches public/<key>.txt
const host = new URL(site).host;

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (urlList.length === 0) throw new Error('sitemap.xml에서 URL을 찾지 못했습니다');

const body = JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList });
for (const endpoint of ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow']) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
  console.log(`${endpoint} → ${res.status} ${res.statusText} (${urlList.length} URLs)`);
}
