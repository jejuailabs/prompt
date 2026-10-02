// Canonical public origin for metadata, sitemap, robots and structured data.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'PLAYLAB';

// Search-console ownership codes (public by design; filled in after registering the site).
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'yTs0I2dhtLepBC1MSDiTTH4Y74Uh5EcV1AvNzhq63Bk';
export const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || '';
