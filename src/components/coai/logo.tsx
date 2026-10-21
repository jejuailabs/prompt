// COAI brand logo (owner-supplied guideline, docs/coai/design/coai_logo.png).
// The raster wordmark is cut from the guideline sheet; logo-dark.png lightens
// the deep-blue "c" so it stays visible on dark surfaces.

/** Wordmark logo; height in px, width follows the 461:166 artwork ratio. */
export function CoaiLogo({ height = 30, className }: { height?: number; className?: string }) {
  const width = Math.round((height * 461) / 166);
  return (
    <span className={`coai-logo ${className ?? ''}`} style={{ height }}>
      <img className="coai-logo-light" src="/coai/brand/logo.png" alt="COAI" width={width} height={height} />
      <img className="coai-logo-dark" src="/coai/brand/logo-dark.png" alt="" aria-hidden="true" width={width} height={height} />
    </span>
  );
}
