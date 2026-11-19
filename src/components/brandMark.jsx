// The Mouthkind mark: a smile holding a drop — kindness and moisture.
export function BrandMark({ size = 28 }) {
  return (
    <svg viewBox="150 150 724 680" width={size} height={size} aria-hidden="true" className="brand-mark">
      <defs>
<linearGradient id="bm-d" x1=".25" y1="0" x2=".75" y2="1"><stop offset="0" stopColor="#6fb6ec"/><stop offset="1" stopColor="#1f6fa8"/></linearGradient>
<linearGradient id="bm-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c9a7d"/><stop offset="1" stopColor="#0f6e59"/></linearGradient>
</defs>

<path d="M512 176 C 478 254, 356 358, 356 476 A 156 156 0 0 0 668 476 C 668 358, 546 254, 512 176 Z" fill="url(#bm-d)"/>
<path d="M436 452 C 442 410, 466 374, 494 346" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="24" strokeLinecap="round"/>
<path d="M206 574 C 236 552, 268 556, 290 578 C 380 668, 644 668, 734 578 C 756 556, 788 552, 818 574 C 820 600, 806 622, 784 640 C 652 790, 372 790, 240 640 C 218 622, 204 600, 206 574 Z" fill="url(#bm-s)"/>
    </svg>
  );
}
