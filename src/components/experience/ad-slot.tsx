'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global { interface Window { adsbygoogle?: Record<string, never>[] } }

/** No ad request until real publisher and placement IDs have been configured. */
export function AdSlot() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_GALLERY_SLOT;
  const configured = !!client && /^ca-pub-\d+$/.test(client) && !!slot && /^\d+$/.test(slot);
  const [loaded, setLoaded] = useState(false);
  const pushed = useRef(false);
  const node = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!configured || !loaded || pushed.current || !node.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !node.current?.offsetWidth || pushed.current) return;
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Ad blockers may prevent delivery. */ }
      observer.disconnect();
    });
    observer.observe(node.current);
    return () => observer.disconnect();
  }, [configured, loaded]);
  if (!configured) return null;
  return <aside className="gallery-ad" aria-label="광고"><span>ADVERTISEMENT</span><Script id="playlab-adsense" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" strategy="afterInteractive" onReady={() => setLoaded(true)} /><ins ref={node} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
