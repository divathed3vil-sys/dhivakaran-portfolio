# Phase 0 — Baseline Snapshot

**Captured:** Optimization branch start, before any code changes.
**Branch:** `optimization` (off `main` @ `1d8d10b`)
**Method:** dev server on port 3000, `curl` byte-level measurements, `du` on disk.

> NOTE: dev-server JS byte counts include dev-only packages (react-devtools, next-devtools, HMR client, polyfill-nomodule, unminified React). **Production numbers will be much smaller.** This baseline is for **relative comparison across phases** (same measurement method each time), not absolute production claims.

---

## 1. HTML Document (`GET /`)

| Metric | Value |
|---|---:|
| Status | 200 |
| Size | 127,546 B (~125 KB) |
| TTFB | ~47 ms |
| Compile | ~3 ms (cached) |
| Render | ~50 ms |

---

## 2. JS Chunks (dev server, all references in HTML)

Total of 21 chunks fetched on `/` load = **5,355,804 B (~5.10 MB)** — of which the following are **dev-only and will NOT ship to production**:

- `next-devtools` (816,027 B)
- `react-dom` dev build (1,047,866 B → ~130 KB minified+gzip in prod)
- `react-server-dom-turbopack` (169,892 B)
- `polyfill-nomodule.js` (112,594 B)
- `hmr-client` (671 B)
- Various `node_modules_next_dist_*` dev chunks (~620 KB combined)

**Realistic production estimate (after minify + gzip + tree-shake):** ~350–500 KB initial JS on `/` (will be measured precisely in Phase 4 with the bundle-analyzer build).

### Notable application chunks (likely to ship to prod, dev sizes):
| Chunk | Size |
|---|---:|
| `src_ae025396._.js` | 507,253 B |
| `node_modules_eebbafcd._.js` | 1,156,612 B |
| `node_modules_394613a2._.js` | 338,549 B |
| `node_modules_next_dist_client_17643121._.js` | 621,040 B |
| `node_modules_next_dist_f3530cac._.js` | 208,383 B |
| `src_2bc135c0._.js` | 26,391 B |

---

## 3. CSS

| Asset | Size |
|---|---:|
| `src_app_globals_91e4631d.css` | 136,843 B (~134 KB, unminified dev) |
| Google Fonts CSS (Fraunces + JetBrains Mono, 2 requests) | 10,180 B (render-blocking external) |

**Total CSS on first paint:** ~147 KB (dev). Production minified+gzip likely ~25–35 KB.

---

## 4. Fonts (Google Fonts, browser-UA negotiated)

**Fraunces variable** (ital + opsz + weights 300–700):
- CSS: 2,722 B
- 6 unique WOFF2 subsets (vietnamese, latin-ext, latin, etc.): **321,500 B total**
- Browser downloads only the subset matching page content (typically Latin only → ~50 KB on first paint, but the FULL font set is negotiated and downloaded across the site)

**JetBrains Mono** (weights 400, 500, 600):
- CSS: 7,458 B
- 6 unique WOFF2 subsets: **66,292 B total**

**Combined font ceiling: 387,792 B (~378 KB) + 10 KB CSS.**

### Cost on the critical path:
1. Blocking Google Fonts CSS request (extra round-trip to `fonts.googleapis.com`)
2. Then WOFF2 download from `fonts.gstatic.com` (another round-trip)
3. `font-display: swap` means FOIT→FOUT, but layout shift risk on the swap

**Phase 2 target:** self-host WOFF2, Latin-only subset, preload critical weights → expected **~50–80% reduction**.

---

## 5. Local Image Assets (`public/images/`)

| File | Size | Used as |
|---|---:|---|
| `landing.jpg` (source) | 2,651,885 B | Master, not served to browser |
| `landing-full.webp` | 312,432 B | **Hero LCP background-image (served to ALL viewports)** |
| `landing-med.webp` | 5,998 B | Intro loader chip fallback |
| `landing-low.webp` | 1,972 B | Visual Lab card placeholder + intro loader chip |
| `about.jpg` (source) | 411,450 B | Master |
| `about-med.webp` | 32,388 B | About portrait |
| `about-low.webp` | 8,730 B | Unused (no reference found) |
| **Total disk** | **3,425,855 B (~3.27 MB)** | |

### Critical issue (Phase 1 target):
- Hero serves `landing-full.webp` (312 KB) to **every device**, including 400 px mobiles. With AVIF + responsive srcset, a phone would receive **~30–50 KB** instead.
- No `fetchpriority="high"`, no `<link rel="preload">` for the LCP asset → discovered late, after CSS parse.
- All images rendered via CSS `background-image`, so no `loading=lazy` / `decoding=async` / intrinsic dimensions / aspect-ratio reservation.

---

## 6. Remote Images (Supabase Storage)

- Public work + lab images come from `*.supabase.co` at runtime.
- `lowResUrl()` adds `?width=400&quality=55&resize=contain` — but **no format negotiation** (no AVIF), no srcset, no responsive variants.
- `next.config.ts` has no `remotePatterns` for Supabase → can't use `next/image` for these today.

---

## 7. NPM Dependency Disk Sizes (sanity, not bundle size)

| Package | Disk size | Used on `/`? |
|---|---:|---|
| `@radix-ui/*` (58 packages) | 11 MB | Only in Studio (gated) |
| `@supabase/*` | 9.1 MB | Yes (data fetch) |
| `@tanstack/*` | 8.7 MB | Studio only |
| `react-syntax-highlighter` | 8.9 MB | **Not used on `/` — verify transitively** |
| `recharts` | 5.4 MB | **Not used on `/`** |
| `framer-motion` | 5.4 MB | **Sparingly used — audit in Phase 4** |
| `@mdxeditor/editor` | 1.2 MB | **Not used on `/`** |
| `react-day-picker` | 4.8 MB | **Not used on `/`** |
| `lenis` | 520 KB | Yes (smooth scroll) |

---

## 8. Rendering Characteristics (code audit, no runtime trace)

| Pattern | Status |
|---|---|
| `next/image` usage | **None** anywhere in codebase |
| Responsive `<picture>` / srcset | **None** |
| `fetchpriority="high"` on LCP | **None** |
| `<link rel="preload">` for LCP image | **None** |
| `loading="lazy"` on below-fold images | **None** (all CSS `background-image`) |
| `decoding="async"` | **None** |
| `aspect-ratio` reservation | **None** (images are CSS backgrounds) |
| `content-visibility: auto` | **None** |
| `contain: layout paint` | **None** |
| `will-change` | Used on hero portrait (correctly scoped) |
| Hero scroll-driven `filter: blur(0→8px)` per frame | **Yes — real GPU cost on 1920 px element** |
| Dynamic imports | Only for Supabase data fetch (inside `useEffect`) — **not** for Studio/VisualLab/VisualLabCard components |

---

## 9. Targets for End-of-Project Comparison

| Metric | Phase 0 baseline | Phase 6 target |
|---|---:|---:|
| HTML size | 127 KB | ~30–50 KB (after prerendering optimizations) |
| Initial JS (production) | ~350–500 KB (estimated) | ≤ 150 KB (stretch goal from brief §4.6) |
| LCP image transfer on mobile | 312 KB | ≤ 50 KB |
| Font transfer ceiling | 378 KB + 10 KB CSS | ≤ 80 KB + 0 external CSS |
| Render-blocking external requests | 1 (Google Fonts CSS) | 0 |
| `next/image` usages | 0 | Hero + About + all cells + lab tiles |
| `content-visibility: auto` sections | 0 | 7 (About, SelectedWork, Video, LabCard, Skillset, Contact, Footer) |
| Dynamic-imported overlays | 0 | Studio + VisualLab + VisualLabCard |

---

## 10. Phase 0 Conclusions

The audit confirms the roadmap as planned:
- **Media pipeline (Phase 1)** is the highest-leverage transfer win (312 KB → ~50 KB on mobile LCP).
- **Fonts (Phase 2)** is the highest-leverage critical-path win (eliminates render-blocking external + reduces ceiling 5×).
- **Rendering (Phase 3)** is the highest-leverage frame-time win (`content-visibility` + pre-rendered blur).
- **Bundle diet (Phase 4)** is the highest-leverage INP win (Studio + Radix out of initial chunk).

No code changed. No commits. No pushes. Ready for Phase 1.
