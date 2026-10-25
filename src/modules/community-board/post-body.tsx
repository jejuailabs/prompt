// React escapes all text; only explicit HTTP(S) URLs become clickable links.
export function PostBody({ body }: { body: string }) {
  return <>{body.split(/(https?:\/\/[^\s<>"\u0027]+)/g).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part;
    const url = part.replace(/[.,!?;:，。！？、)\]}]+$/u, '');
    return <span key={index}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{part.slice(url.length)}</span>;
  })}</>;
}
