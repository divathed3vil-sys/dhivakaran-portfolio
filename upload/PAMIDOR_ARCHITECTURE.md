# Pamidor-Study — Reverse-Engineered Architecture & Design Specification

**Subject:** `https://pamidordesign.co/` (Dor Sharaby / Pamidor Studio)
**Purpose of this document:** a build-ready, extraction-level specification of the *entire* site — every route, every design token, every type size, every spacing constant, every animation with its exact duration, curve and delay — reconstructed from the live DOM, the compiled stylesheet, and the minified React chunks. Nothing here is guessed: values marked **[measured]** come from computed styles in the live page at a 1440×900 viewport; values marked **[source]** come from `4134lbbozid7l.css` or the JS chunks.
**Deliverable that follows this doc:** a static-rendered, then React/Next-ready rebuild with realistic placeholder content and a single generated placeholder image, with identical type, spacing and motion.

---

## 0. TL;DR — the five decisions that make this site feel the way it does

1. **One scalar `--px` drives the entire layout.** Every margin, padding, gap, border-radius and even border width is `calc(N * var(--px))`. At 1440×900 that scalar is exactly `1px`; at 1728×680 it is `1.6px`; below it scales down but never under `1px`. Change the viewport → the whole site proportionally re-lays-out like a printed sheet. This is the single most important thing to copy.
2. **Everything is designed to a 1728×680 "sheet"**, capped by a `1440px` content canvas, with type that does *not* follow the `--px` scalar (type uses its own `clamp(min, vw, max)` scale).
3. **Motion is a small, disciplined vocabulary**, not a library: `cubic-bezier(.22,1,.36,1)` for enters, `cubic-bezier(.65,0,.35,1)` for curtains, `cubic-bezier(.16,1,.3,1)` for reveals, `cubic-bezier(.55,0,.25,1)` for the physics of the "door" gag, `cubic-bezier(.45,0,.25,1)` for the trail masks. ~6 curves, reused everywhere.
4. **Two typefaces, one job each.** `funnelDisplay` (variable 300–800) carries *all* headings and body; `Archivo` (400/600/700) carries *all* small caps labels, chips and the shop UI; `Space Grotesk` is used only for the Studio `h1` wordmark headline.
5. **Color is 5 neutrals + 1 red.** Paper `#EFEEEB`, ink `#0A0A0A`, "night" `#0D0D0B`, muted `#6B6862`, rule `#CCC9C4`; the only chromatic accent is red `#D12424` — used for hover flashes, the active project title, and text selection.

---

## 1. System architecture

```
pamidordesign.co
├── /                       Home            (server shell + client islands)    data-canvas="home"
├── /studio                 Studio          (page-enter, sticky chrome)        data-canvas="fixed"
├── /art-lab                Art Lab         (full-bleed infinite drag field)   data-canvas="fixed"
├── /shop                   Shop grid       (filter chips, product cards)      data-canvas="fixed"
│   └── /shop/[slug]        Product         (5 products: red-series-01..03, inked-frame, pink-portrait)
├── /work/rise              Case study 01   (product + brand, 17 months)
├── /work/figcoms           Case study 02
├── /work/imotion           Case study 03
├── /work/israel-police     Case study 04
├── /privacy                Legal
└── /terms                  Legal
```

External (footer only): Instagram, LinkedIn, Dribbble, Pinterest, TikTok, Awwwards nominee badge, `mailto:dor@pamidordesign.co`.

**Rendering model — worth understanding before you build.**
The site is Next.js (App Router, Turbopack). On **every** route:
- Page content renders on the server.
- The browser paints the *pre-load* state via `html[data-loading]` (set by an inline script) → hero copy is `opacity:0` and rotated in 3D, nav is pushed up `14*--px`, and the **loader** overlay is on screen.
- The loader letter-animates `PAMI ▮ DOR`, holds ~1.88 s, then unmounts itself and removes `data-loading`; **the hero then plays a 950 ms 3D "rise into place" transition with staggered delays** (`--h3d`). This is the intro. It only runs on full page load, not on client navigation (client nav uses the **route curtain** instead).
- Smooth scrolling is **Lenis 1.3.26** with `lerp: 0.1`, `smoothWheel: true`, `respectReducedMotion: true`. Any fixed overlay that must scroll natively (the menu) opts out with `data-lenis-prevent`.

**Component inventory (client islands, from the JS chunks):**

| # | Component | Responsibility |
|---|---|---|
| C1 | `IntroLoader` | `PAMI ▮ DOR` loader; image chip cycling; exit timing; unmounts after 560 ms |
| C2 | `RouteCurtain` | Full-screen `bg-night` curtain: `cover` 667 ms → navigate → `reveal` 754 ms |
| C3 | `Nav` + `Menu` | Sticky/relative nav, burger→X morph, full-height slide-in menu, focus trap, Esc, scroll lock |
| C4 | `HeroMaster` | Hero art, 3D rise reveal (`data-hero-3d`), `Dor/Do(o)r` door gag, cursor image trail, edge-aware trail mask |
| C5 | `WaveText` | `data-word`/`data-char` split; scroll-progress "lit" characters on the About paragraph |
| C6 | `HoverWave` (`data-hw`) | Char-by-char color sweep on hover/in-view for every link, chip and project title |
| C7 | `Reveal` | `data-reveal="waiting|shown"` → 13·`--px` translate + 700 ms `.16,1,.3,1` |
| C8 | `ClipReveal` | Footer (and similar full-bleed blocks) clip-path inset animation driven by scroll |
| C9 | `Marquee` | `width:max-content` + `translate(-50%)` loop, pause on hover; per-row durations 28–106 s |
| C10 | `ProjectsList` | Desktop "accordion" rows (min-height 112→270·`--px`, 500 ms), hovered/centred row becomes active |
| C11 | `StickyAbout` | 135 vh "travel" wrapper that pins the About copy on desktop |
| C12 | `CountUp` | Stat number 0→N in 900 ms cubic-out on intersection |
| C13 | `LeadForm` | Validated form, honeypot, states idle/sending/sent/failed, `OPEN THE DOOR` door gag on the O/R |
| C14 | `ArtLabField` | 164-image infinite pan field (rows packed algorithmically), drag + wheel + arrow keys, edge-aware mask over the portrait |
| C15 | `ShopFilters` | `aria-pressed` chips filtering the product grid |
| C16 | `Analytics` | click tracking (`email_click`, `contact_click`, `project_click`), scroll-depth at 25/50/75 % |

---

## 2. Design tokens (exact)

### 2.1 Color
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `canvas` (paper) | `#EFEEEB` | `rgb(239 238 235)` | page background |
| `ink` | `#0A0A0A` | `rgb(10 10 10)` | body text, rules default |
| `night` | `#0D0D0B` | `rgb(13 13 11)` | Skillset section, footer, form panel, route curtain, product badges |
| `muted` | `#6B6862` | `rgb(107 104 98)` | secondary copy, labels on paper |
| `rule` | `#CCC9C4` | `rgb(204 201 196)` | 1.5 px hairlines on paper |
| `chip` (border) | `#B8B5B0` | `rgb(184 181 176)` | 1.2 px tag borders |
| `accent` (red) | `#D12424` | `rgb(209 36 36)` | hover flash, active project, selection, form errors |
| `night-muted` | `#9E9991` | `rgb(158 153 145)` | labels on night |
| `night-body` | `#BFBAB2` | `rgb(191 186 178)` | body on night |
| `night-hr` | `#918E89` | `#918e89` | 1.5 px rules on night |
| `night-chip` | `rgba(102,102,102,.102)` | `#6666661a` | glass chips over images |
| white alphas | `/10 /18 /20 /25 /30 /45 /70` | | borders, dividers, placeholders |

**Wave colors** (self-illuminating hover text, CSS vars): `--wave-dim:#0A0A0A33`, `--wave-flash:#D12424`, `--wave-lit:#0A0A0A`. Dark contexts override `--hw-base` to `#fff` / `#0D0D0B`.

**Selection:** `::selection{ background:#D12424; color:#fff }`.

### 2.2 The `--px` scale (the layout engine)
```css
:root                              { --px: clamp(1px, min(100vw/1728, 100vh/680), 1.6px); }
:root:has([data-canvas="home"])    { --px: clamp(1px, .825*min(100vw/1728, 100vh/680), 1.32px); }
:root:has([data-canvas="fixed"])   { --px: 1px; }               /* studio, art-lab, shop, legal */
@media (min-width:1729px) and not data-canvas=fixed
                                   { html { font-size: calc(16 * var(--px)) } }
```
- At **1440×900**: `min(1440/1728, 900/680)=.8333` → `--px = .8333` → home `--px = .825*.8333 = .6875`… **but measured at 1440 the value resolves to `1px`** because of the `clamp` floor and the home multiplier interplay; **[measured]** `--px = 1px` at 1440×900, root `font-size: 16px`. Use the same formula and verify against these anchors: 1440×900 → 16px equivalent; 1728×680 → 1.6 px scalar; ≤1040 px wide → 1 px floor.
- **Rule:** never write `px` in component CSS. Write `calc(N * var(--px))`. N values found in the source: 1, 1.2, 1.5, 2, 2.7, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 35, 36, 38, 40, 44, 45, 46, 48, 52, 54, 56, 64, 68, 72, 80, 82, 100, 104, 112, 120, 152, 160, 164, 206, 270, 305, 330, 390, 400, 416, 495, 520, 680, 718, 747, 900, 1129, 1400, 1440.

### 2.3 Layout & container
| Item | Value |
|---|---|
| Content canvas | `max-width: calc(1440 * var(--px))`, centred |
| Desktop page margin | `padding-inline: 4rem` (= 64px) — `lg:px-margin`, ≥1024px |
| Tablet margin | `padding-inline: 2.5rem` (40px) — `sm:` |
| Mobile margin | `padding-inline: 1.5rem` (24px) |
| Home hero height | `100dvh`, `min-height: calc(680 * var(--px))` |
| Nav height on home | `calc(26 * var(--px))` inside an `8.2%` band of the hero (`lg:h-[8.2%]`) |
| Nav height on inner pages | `py-4` mobile / `py-[calc(22*var(--px))]` desktop, `sticky top-0 z-40 bg-canvas` |
| Section rhythm | `py-16` (64px) mobile, `lg:py-32` (128px) desktop, sections are `min-h-[100svh]` and vertically centred |
| Page-enter shell | `animation: page-enter .52s cubic-bezier(.22,1,.36,1) both` → `opacity 0→1`, `translate3d(0, 10*--px, 0)→0` |
| Vertical stack gap (marquee rows) | `calc(24 * var(--px))` |
| Hairlines | `1.5px` on paper/night sections; `1px` for footer top rule and shop dividers |
| Radius language | essentially none. Only `2px` on the showreel video, `2–3px` on shop chips/badges, `0` everywhere else |

### 2.4 Type
Base: `body { font-family: funnelDisplay; font-size: clamp(.9375rem, 1.111vw, 1rem); line-height: 1.55; letter-spacing: -.01em; text-wrap: pretty; }`
`html { -webkit-font-smoothing: antialiased; text-size-adjust: 100%; scrollbar-gutter: stable; scroll-behavior: smooth; }`

| Class | Font | Size (clamp) | Line-height | Letter-spacing | Weight | Where |
|---|---|---|---|---|---|---|
| `.text-display` | funnelDisplay | `clamp(2.25rem, 6.944vw, 6.25rem)` | **.88** | **-.03em** | 500 | Hero `h1` ("Door Sharaby") |
| `.text-section` | funnelDisplay | `clamp(2rem, 7.222vw, 6.5rem)` | **1** | **-.02em** | 500 | Section `h2` (Selected Projects, The Art Lab, Skillset, page titles) |
| `.text-project` | funnelDisplay | `clamp(1.625rem, 4.167vw, 3.75rem)` | 1.05 | -.015em | 500 | Project row titles, menu links |
| `.text-lead` / `.text-subhead` | funnelDisplay | `clamp(1.3125rem, 2.778vw, 2.5rem)` | 1.2 | -.015em | 500 | About paragraph, footer tagline, skillset rows |
| `.text-body-lg` | funnelDisplay | `clamp(1.0625rem, 1.25vw, 1.125rem)` | 1.5 | -.01em | 400 | Hero subline, form inputs, footer email |
| `.text-body` | funnelDisplay | `clamp(.9375rem, 1.111vw, 1rem)` | 1.55 | -.01em | 400 | Default body |
| `.text-label` | **Archivo** | `clamp(.6875rem, .833vw, .75rem)` | 1.4 | **+.06em** | 500 | ALL eyebrow labels `(CLIENTS & COLLABORATIONS)`, chips, meta keys |
| Shop UI | **Archivo** | `13px`, `12px`, `10px` (with `--px`) | — | `1px` / `1.2px` | 500/600 | filter chips, sort, product badges |
| Studio `h1` | **Space Grotesk** | `text-section` scale but measured **124.4px** at 1440 (`-3.73px` tracking, w500) | .9 | -.03em | 500 | "Studio", "Art Lab", "Privacy", "Terms" page heroes |

**Measured cross-check @1440×900 [measured]:** hero `h1` = **88.88 px / 78.22 lh / -2.67 ls** (two lines: "Door" / "Sharaby"); section `h2` = **92.44 px / 92.44 lh**; project title = **53.34 px / 56.00 lh**; label = **11 px Archivo / 15.4 lh / +0.66 ls**.

**Mobile override:** `@media (max-width:639px){ [data-hero-name]{ font-size: min(26.6099vw - 12.7728px, 6.25rem) } }` — the hero name is optically fitted to the phone width.

**Fonts:** `funnelDisplay.woff2` (variable 300–800, `font-display:swap`, local fallback Arial with `size-adjust:106.17%`), `Archivo` 400/600/700 (3 unicode subsets, local fallback 98.7 %), `Space Grotesk` 300–700 (fallback 109.69 %).

---

## 3. Page-by-page specification

### 3.1 Home — `data-canvas="home"`

**A. Hero — `section#top`, `100dvh`, `bg-canvas`, overflow hidden**
- **Art layers** (`z` order): (1) backdrop B/W photograph, portrait of the designer, `object-cover`, `object-position:50% 50%`, `transform:scale(1.15)`, `transform-origin:48% 100%` — only ≥1440 px it fills the section; between 1024–1439 a *portrait crop* sits at `left:40.9722%; top:8.2%; width:54.6528%; height:90.4%`, `object-position:50% 0%`. (2) **Cursor trail layer** — 6 absolutely positioned images at `left:0;top:0`, each `width:calc(80 * var(--px))`, `opacity:0`, mask `linear-gradient(105deg,#000 45%, transparent 62%)`, `mask-size:280% 100%`, `mask-position:100% 0%`.
- **Copy block** (left, `lg:justify-center`): `h1[data-hero-name]` "Door Sharaby" (`--h3d:140ms`), `p[data-hero-3d-lines]` two lines "Brands, products & the art in between." / "I take the fun seriously." (`--h3d:340ms`), chips list (`--h3d:520ms`): five tags `Brand Design · Product Design · UX | UI · Art Direction · Motion & 3D`, each `border:1.2px solid chip; padding: 16px / calc(9*--px); font: Archivo .text-label 500`.
- **Gag — "Dor" → "Door"** (the name *is* the entrance): the `r` of "Dor" is wrapped in `.door-give`; an invisible `.door-add` (`::before{content:"o"}`) is inserted between "Do" and "r". On a scroll-variable toggle (`data-door-open`) the word cycles every **5 s**: (0–8 %) the "o" grows `scaleX(0→1)` while the `r` shifts right by `--door-o` (measured: width("Door")-width("Dor") in px, set by ResizeObserver); (28–36 %) both snap back. Same gag repeats on the form title **OPEN THE DOOR** with `.door-o`/`.door-r` and `door-shut` + `door-slide` keyframes.
- **Cursor trail behaviour** (extracted from source): only `(hover:hover) and (prefers-reduced-motion:no-preference)`. A ring buffer of 6 nodes; on mousemove inside the hero (and, on ≥1440, *outside* the character's silhouette via a 145-row polygon hit-map so the trail doesn't draw over his face) → pick next node, cycle the 6 source images (`0,1,2,3,4,5 → 0…` pattern differs per slot), set `translate3d(x + 4g, y − 53g, 0)` where `g` is the current `--px`, cancel any running animation and run `element.animate`:
  `[{opacity:1, scale:.98, maskPosition:"100% 0%", easing:cubic-bezier(.45,0,.25,1)}, {opacity:1, scale:1, maskPosition:"0% 0%", offset:240/840}, {opacity:1, maskPosition:"0%", offset:600/840, easing:cubic-bezier(.55,0,.45,1)}, {opacity:0, scale:.97, maskPosition:"0%"}]`, **duration 840 ms**, `fill:"both"`. Max 4 live nodes; when a 5th arrives the oldest is fast-forwarded (`currentTime = max(t,600)`, `playbackRate = 2.5`, then `finish()`) so it decays instead of popping. Mouse-leave fast-forwards all to ≥600 ms and clears.
- **Hero 3D rise** (the load animation): `[data-hero-3d]` and `[data-hero-3d-lines] > *` are `transform-origin:50% 100%` and transition `transform .95s cubic-bezier(.16,1,.3,1) calc(var(--h3d) + var(--h3d-i)), opacity .7s cubic-bezier(.33,1,.68,1) calc(var(--h3d) + var(--h3d-i))`. Portrait origin `60% 60%`, backdrop origin `66%`. Pre-load (`[data-loading]`) states: copy lines `perspective(calc(900*--px)) rotateX(44deg) translateY(calc(46*--px)); opacity:0`; backdrop `scale(1.04)`; portrait `perspective(calc(1400*--px)) rotateY(-10deg) rotateX(6deg) translateY(calc(34*--px)) scale(1.06)`. Stagger: h1 `140ms`, p `340ms`, chips `520ms`; the 3rd line-child of `[data-hero-3d-lines]` gets `+180ms`, the 2nd `+90ms`.
- **Edge rule:** a `1.5px` rule closes the hero (`bg-rule`), full canvas width.

**B. Nav (shared)** — wordmark `PAMIDOR® STUDIO` at `height:.691em` of `text-body-lg`; burger button 56·`--px` wide, two `2px × 40·--px` bars, `gap:8px`; open state = `translateY(±5px) rotate(±45deg)` over **300 ms** `cubic-bezier(.22,1,.36,1)`.

**C. About / Studio — `section#studio`**
- Desktop: a `135vh` "travel" wrapper (`--travel:135vh`), child `sticky top-0 h-screen justify-center` → the 1 129·`--px`-wide paragraph pins while you scroll.
- Paragraph: `.text-lead font-medium`, max-width `calc(1129*--px)`; a floating portrait **inserted inside the text flow as a float**, `19 %` width, `aspect-square`, `-6deg` rotation, box-shadow `0 18px 40px -12px rgba(10,10,10,.28)`.
- **Scroll "wave" lighting**: every character is `[data-char]` inside `[data-word]` spans. Progress = `(-rect.top) / (rect.height - innerHeight)` (desktop, pinned) or `(.85*innerHeight - top)/.6*innerHeight` (mobile) → `litCount = round(p*r)`. Lit chars get `[data-lit]` → `animation: char-wave .4s both` where `char-wave{ 0%{color:var(--wave-dim); ease .22,1,.36,1} 30%{color:var(--wave-flash); ease .55,0,1,.45} to{color:var(--wave-lit)} }`. Un-lighting removes the attribute. Net effect: a **red flash sweeps through the paragraph letter-by-letter as you scroll**, settling to ink.
- Divider `1.5px` rule, then a two-column block: left `305·--px` showreel video (`rounded-[2px]`, poster first frame, `preload:none`), right `(CLIENTS & COLLABORATIONS)` label + **two opposing logo marquees**.
- **Marquees:** `.marquee-wrapper{white-space:nowrap;overflow:hidden}` + `.marquee-track{width:max-content;display:inline-flex;animation:28s linear infinite marquee}` `@keyframes marquee{to{transform:translate(-50%)}}`; **hover pauses** (`animation-play-state:paused`). Home logo rows: **38 s normal** and **46 s reverse**; logo cells `opacity:.55`, `height:calc(24*--px)` (a few 28/32), gap `calc(52*--px)`, row height `calc(32*--px)`.

**D. Selected Projects — `section#projects`, `min-h-100svh`, `lg:pt-32 lg:pb-[164*--px]`**
- `h2` `.text-section` → `1.5px` rule → list.
- **Desktop accordion rows:** `ul` height `calc(718*--px)`, 4 rows `flex-1`, row `min-height` transitions **500 ms `cubic-bezier(.22,1,.36,1)`** between `calc(112*--px)` (collapsed) and `calc(270*--px)` (active), `overflow:hidden`. Active row = the row under the mouse, or (keyboard/touch/no-hover) the row whose centre is nearest the viewport centre via an `IntersectionObserver` with `rootMargin:-45% 0 -45% 0`.
- Row grid: `lg:grid-cols-[1fr_calc(330*--px)]`, gap `x 40px`, row padding `py-[calc(24*--px)]`. Left: title `.text-project` + `Jump To Project` bordered button (`px 15·--px, py 9·--px, border 1px ink`, arrow icon that rotates **-45° over 300 ms** on hover). Right column 330·`--px`: cover image, `aspect 3/2`, `overflow:hidden`; on hover a gradient overlay `linear-gradient(180deg, rgba(4,4,4,0) 19%, rgba(4,4,4,.94) 100%)` fades in over **300 ms** and two glass chips (`border white/20`, `bg night-chip`, white `.text-label`) slide up **6·--px**.
- Non-active rows are `opacity:.45`; active title turns **accent red** and runs the hover-wave. Metadata `dl` (ROLE / TIMELINE / YEAR / TEAM) fades + slides `6·--px` in over **500 ms** when the row is active.
- Mobile: image always visible under the title (16/10), metadata hidden, no accordion.
- Each row closes with a `1.5px` hairline; last row's rule is absolutely pinned to the row bottom.

**E. The Art Lab — `section#art-lab`** — `1.5px` rule, `pt-[38*--px]` title, 2-col grid (`gap-x 20px`, `gap-y calc(30*--px)`, `lg:mt-[54*--px]`), two `686×450` images, body copy `.text-body text-muted` with `mt-[30*--px]`, second column delayed **90 ms** in the reveal. Two buttons: `Enter The Lab` (filled ink) and `Art Shop` (outline). Reveal = C7.

**F. Skillset — `section#skillset`, `bg-night`, `data-cursor-invert`**
- `h2 .text-section text-canvas` → `1.5px` rule `mt-[38*--px]`.
- 4 rows, each `lg:h-[calc(160*--px)] lg:pt-[calc(56*--px)]`, 5-col grid: index `.text-label text-night-muted` (desktop `.text-body`), title `.text-subhead text-canvas` spanning 2 cols with `-ml-[calc(152*--px)]` (an intentional optical indent), description `.text-body text-night-body` spanning 2 cols, max `46ch` mobile. Rows separated by `1.5px` `--night-hr` rules.
- Inside a night section the **cursor inverts** (`data-cursor-invert`): CSS swaps the custom cursor to `cursor-light-28/56.png`; pressing swaps to `cursor-click-*`.

**G. Contact — `OPEN THE DOOR`**
- Full-bleed `<video>` sky loop (poster `form-sky.webp`, muted/loop/playsinline, plays only when intersecting, `rootMargin:300px`).
- Panel: `bg-night`, desktop `w-3/5 min-w-[680*--px] px-[52*--px] py-[40*--px]`, shadow `0 18·--px 40·--px -12·--px rgba(10,10,10,.28)`, `data-cursor-invert`.
- Eyebrow `(LEAVE YOUR DETAILS)`. Title `.text-section uppercase`, `68*--px` on desktop, with the **door gag** on "DOOR". Under it "Or just write:" + underlined email (`border-b white/30`, hover white, 300 ms).
- Form grid: row 1 NAME / EMAIL (`lg:grid-cols-2 gap-x-[35*--px]`), row 2 PHONE (2fr) / REASON select (3fr), row 3 MESSAGE full width; fields are **bottom-border only** (`border-b white/25`, focus `white/70`, placeholder `white/45`, `pb-[3]`, `.text-body-lg`), labels `text-label night-muted`. Honeypot `website` field `sr-only` + `tabIndex:-1`.
- Submit: white `invert` button, label `Send Details` with the hover-wave + rotating arrow; helper line `No spam. A real reply, usually the same day.` (`aria-live`), privacy microcopy with link. States: `idle → sending (disabled, "Sending…") → sent` (title swaps to a confirmation) / `failed` (red helper). Validation: name non-empty, email regex, invalid fields get `border-accent`.

**H. Footer** — wraps in `ClipReveal` (C8): as the footer enters, `clip-path: inset((5n)% (7n)% 0% (7n)% round 0)` where `n = 1-(1-progress)^3` over the first 60 % of a viewport → it **un-masks from the bottom up like a page being laid down**. `bg-night`, `1px white/10` top rule, giant wordmark SVG full-width, tagline "Somewhere between structure and instinct." `.text-subhead uppercase white` (left 50 %), email link + 5 social icons (20·--px glyphs in 40·--px hit areas, hover → accent) on the right, then legal + copyright `.text-label`.

### 3.2 Studio — `/studio`
- Shell: `page-enter` (520 ms) → sticky canvas top nav (`py-[calc(22*--px)]`).
- Hero: eyebrow `(DOR SHARABY · PAMIDOR STUDIO)`, `h1` **Space Grotesk**, tracking `-.03em`, then a 5-column stat row: DESIGNING SINCE **2021**, STUDIO FOUNDED **2023**, BASED IN **Tel Aviv**, CLIENTS **Israel & worldwide** — numbers are `.text-stat`-scale (`clamp(2rem,7.222vw,6.5rem)`, lh 1, ls -.02em) and **count up** over **900 ms ease-out-cubic** when 60 % visible (C12).
- Q&A sections: label `(QUESTIONS)`; each answer is a 5-col grid: question `.text-subhead-sm` in cols 1–2 (with the `ml-[calc(100*--px-100%)]` optical trick), answer `.text-body text-muted` in cols 4–5, `max-w-[495px]`, separated by `1.5px` rules, rows `py-[30px]`, each row `data-reveal` staggered by 90 ms in groups.
- Process list: `01…05` numbers `.text-body text-muted`, titles `.text-subhead-sm`, descriptions `max-w-[495px]`.
- Two logo marquees reused from home.

### 3.3 Art Lab — `/art-lab`
- Fixed, non-scrolling viewport (`fixed inset-0 h-[100dvh] overflow-hidden bg-canvas`), top bar overlays: `The Art Lab` (Space Grotesk) + copy: *164 pieces … arranged by colour on one plane you can drag in any direction.* + `Figcoms` link.
- **The field (C14) — exact algorithm from source:**
  - 164 images. Each item width `w = 300 * clamp(.45, aspect, 1.9)`, height `h = 300`.
  - Items are packed into **rows** with `ROW_W = 3300` and `GAP = 8`: add `8 + w` to the cursor; if `cursor + w > 3300` start a new row. Rows are then **justified**: scale `t = (3300 − 8*(n−1)) / Σw`, each item width `round(w*t)`, height `round(300*t)`, laid out `x += w+8`. Row height accumulates `y += h+8`. If the last row is short it is redistributed into existing rows by index modulo.
  - Canvas height `H = Σ row heights`; field is **toroidally wrapped**: every frame each item's on-screen position is `((x + panX) mod 3308 + 3308) mod 3308` and `((y + panY) mod H + H) mod H`, with off-screen items nudged by ±3300/±H so they wrap seamlessly.
  - **Scale**: `s = max( 1.4*clamp(.55, innerWidth/1440, 1) * --px , max(innerWidth/(3308−maxW−120), innerHeight/(H−maxB−120)) )` — i.e. never smaller than a portrait-filling coefficient.
  - **Motion**: drag = pointer capture, `panX += dx/s`, `panY += dy/s`; on release **inertia**: `vx,vy` decay `*0.95` per frame while `|v|>0.08`. Wheel pans `-delta/s`. Arrow keys pan `140/s` per press. `preventDefault` on wheel.
  - **Per-item "attraction/repulsion" distortion**: distance from viewport centre `(e,t)`, `r = min(1, hypot/620)`, smoothstep `l = r²(3−2r)`: scale `1.1 → .92`, rotation up to `±4°` away from centre, translate `-(.035·dx·l, .035·dy·l)` — items **swell near the cursor and shrink away toward the edges**, like a lens.
  - Cursor: `grab`, and `(DRAG ANYWHERE)` hint bottom-centre fades out **700 ms** after 5.2 s or the first pointer/wheel/key (`sessionStorage['lab-cue']`).

### 3.4 Shop — `/shop`
- `h1` "ORIGINALS & PRINTS" in Space Grotesk; filter chips `All / Prints / Originals / Framed` (`Archivo 13·--px 500`, `rounded 3·--px`, `border ink` + `bg ink white` when `aria-pressed`); right: `SORT: NEWEST` (`Archivo 12/600`, `tracking 1.2·--px`).
- Grid `sm:grid-cols-2 lg:grid-cols-3`, `gap-x 32px gap-y 64px`, `pt-[46*--px]`. Card: `aspect 416/520` image, hover **`scale(1.02)` over 500 ms `cubic-bezier(.22,1,.36,1)`**; badges top-left `PRINT` (paper bg) / `SOLD OUT` (ink bg), `Archivo 10·--px 600`, `tracking 1·--px`, `rounded 2·--px`. Meta row under image `mt-[18*--px]`: title `Archivo 20·--px`, price right.
- Product page: split image rail + details, add-to-bag, `Be first when the next piece lands` email capture, related grid.

### 3.5 Case studies — `/work/[slug]`
Editorial long-form, all on a 5-column grid, all sizes in `--px`:
1. Eyebrow `(CASE STUDY · 0N)` → `h1` project name in `.text-section` **uppercase** → tag chips (same 1.2 px chip style) → full-bleed hero media.
2. Meta row: ROLE / TIMELINE / YEAR / TEAM in `.text-label` keys + `.text-body` values.
3. `(MY ROLE)` bullet list → `Approach` 4-step grid → `(PART 0N)` chapter headings → stat blocks (`.text-stat` numbers + `.text-label` captions).
4. Figure system: `figure` + caption `01 · THE LETTER` style, `figcaption` `.text-label muted`; multi-column figure grids of 1/2/3; palette swatches with hex captions; motion blocks with `<video muted playsinline preload=none>` autoplaying only in view.
5. Marquees per case: `marquee-gallery 76 s`, `marquee-materials 88 s`, `marquee-photos 85 s`, `marquee-shapes 56 s`, `marquee-units 106 s`.
6. `Next project` footer card with the same hover-wave + arrow, then the shared footer.

### 3.6 Legal — `/privacy` `/terms`
Space Grotesk title, `(SECTION)` labels, `.text-body` copy on a 5-col grid, rules between sections, anchors (`#drops`, `#cookies`).

---

## 4. Motion system — the complete spec

### 4.1 Easing vocabulary
| Name | Curve | Used for |
|---|---|---|
| `ease-out-soft` | `cubic-bezier(.22,1,.36,1)` | hovers, reveals, menus, project accordion, marquee UI |
| curtain-in | `cubic-bezier(.65,0,.35,1)` | route curtain cover, menu close |
| reveal | `cubic-bezier(.16,1,.3,1)` | `[data-reveal]` translate |
| door | `cubic-bezier(.55,0,.25,1)` | door grow/shut/slide |
| trail | `cubic-bezier(.45,0,.25,1)` → `(.55,0,.45,1)` | cursor trail mask + fade |
| char | `.22,1,.36,1` → `.55,0,1,.45` | hover-wave / scroll-wave color |
| opacity ramp | `cubic-bezier(.33,1,.68,1)` | hero 3D opacity |
| count-up | `1-(1-t)^3` | stats |

### 4.2 Every animation, with timings
| # | Animation | Trigger | Duration | Delay | Curve / detail |
|---|---|---|---|---|---|
| 1 | **Loader**: letters `PAMI` `DOR` rise in | page load | **620 ms** | `45 ms × index` | `.22,1,.36,1`; `translateY(110%)→0` |
| 2 | Loader image chip opens | +300 ms after letters start | **360 ms** | `1180 ms` | `loader-chip` scale .82→1, `translate(-50%)` |
| 3 | Loader chips cycle images | interval | every **230 ms** | from **1880 ms** | 9 intro images, cross-fade **150 ms** |
| 4 | Loader letters out | on `load` (aligned to cycle) | **420 ms** | `26 ms × index` | `.65,0,.2,1`; `translateY(-60%)` + opacity |
| 5 | Loader curtain fades | after exit | **420 ms** | `260 ms` | opacity → 0, then unmount at **560 ms** |
| 6 | **Hero 3D rise** (copy) | `data-loading` removed | **950 ms** transform / **700 ms** opacity | h1 `140`, p `340`, chips `520` (+`90/180` per line) | `.16,1,.3,1` / `.33,1,.68,1` |
| 7 | Hero portrait un-tilts | same | **950 ms** | `0` | `rotateY(-10)→0, rotateX(6)→0, scale(1.06)→1` |
| 8 | Hero backdrop settles | same | **950 ms** | `0` | `scale(1.04)→1` |
| 9 | Nav drops in | same | **700 ms** | `120 ms` | `.22,1,.36,1`, `translate3d(0,-14·--px,0)→0` |
| 10 | **Cursor trail image** | mousemove in hero | **840 ms** | — | mask `100%→0%` at 240 ms, hold to 600 ms, fade+scale-out to 840 ms; max 4 live, oldest fast-forwarded at `currentTime≥600`, `playbackRate 2.5` |
| 11 | **Dor→Door** | `data-door-open` | **5 s loop** | — | grow 0–8 %, hold 8–28 %, revert 28–36 %, rest |
| 12 | **Hover-wave text** (`data-hw`) | `:hover` or in-view `[data-hw-on]` | **400 ms per char** | `16 ms × char index` | `hw-sweep`: base → **flash `#D12424` at 45 %** → base |
| 13 | Scroll-wave paragraph | scroll progress | **400 ms per char** | `0` | `char-wave`: dim → red at 30 % → ink |
| 14 | `[data-reveal]` | in view (`rootMargin 0 0 -12% 0`) | **700 ms** | optional `delay` prop (e.g. 90 ms) | `.16,1,.3,1`, `translate3d(0,13·--px,0)→0`, `data-reveal` attr `ssr→waiting→shown`; reduced-motion: none |
| 15 | **Route curtain cover** | internal link click (left, no modifier, same origin, different pathname) | **667 ms** | — | `.65,0,.35,1`, `translateY(100%)→0`; navigation fires at 667 ms |
| 16 | **Route curtain reveal** | new pathname mounted | **754 ms** | — | `.22,1,.36,1`, `translateY(0)→-100%`; state resets to `idle` at 754 ms |
| 17 | Page enter (no curtain, inner pages) | mount | **520 ms** | — | `.22,1,.36,1`, opacity 0→1 + `translate3d(0,10·--px,0)→0` |
| 18 | **Menu open** panel | click burger | **620 ms** | — | `.22,1,.36,1`, `translateX(100%)→0`, visibility flips at start |
| 19 | Menu items | with open | **640 ms** | `180 ms + 55 ms × index` | `.22,1,.36,1`, `translateY(105%)→0`, opacity |
| 20 | Menu close | click X / Esc / scrim | **420 ms** | 0 | `.65,0,.35,1`, items fade in **260 ms** first, panel slides out |
| 21 | Menu scrim | toggle | **620 ms** in / **420 ms** out | — | opacity, `bg-ink/25` |
| 22 | Burger→X | toggle | **300 ms** | — | `translateY(±5px) rotate(±45deg)` |
| 23 | **Project accordion** | hover/centre | **500 ms** | — | `min-height 112↔270·--px`, `ease-out-soft`; cover opacity **500 ms**; metadata 500 ms |
| 24 | Cover hover overlay | hover card | **300 ms** | — | gradient opacity, chips `translateY(6·--px)→0` |
| 25 | Button hover | hover | **300 ms** | — | arrow `rotate(-45deg)`, bg/border/color swap |
| 26 | **Marquee** | always | `28 s` base (38/46 home, 56–106 case studies) | — | linear infinite, `translate(-50%)`, pause on hover |
| 27 | **Clip reveal** (footer) | scroll progress over first 60 % vh | frame-driven | — | `inset(5n% 7n% 0 7n%)`, `n=1-(1-p)³` |
| 28 | **Count-up** | 60 % visible | **900 ms** | — | cubic-out, one-shot, `sr-only` original value kept |
| 29 | **Art Lab inertia** | drag release | exponential | — | `*0.95`/frame until `<.08`; items lerp to cursor lens at `.06`/frame |
| 30 | Art Lab hint | 5.2 s or first input | **700 ms** | — | opacity out |
| 31 | `html[data-cursor=down]` | pointerdown | instant | — | swaps to click cursor, removes on up/cancel/blur |
| 32 | Custom cursor | `(hover:hover) and (pointer:fine)` | instant | — | 28/56 px PNGs, hotspot `2 24`; light variants inside `[data-cursor-invert]` |
| 33 | Page-enter on legal/studio | mount | **520 ms** | — | see #17 |

### 4.3 Reduced motion (`prefers-reduced-motion: reduce`)
- Loader: skipped entirely (content shown immediately, `data-loading` removed).
- Marquees, reveals, page-enter, route curtain: disabled/`display:none`.
- Cursor trail, art-lab distortion, wave text, door gag: not initialized.
- Count-up, clip reveal: render final values immediately.
- Hero 3D: no transition; final state applied.
- Fonts still animate nothing; hover colors remain (they're 200 ms, acceptable).

### 4.4 Accessibility invariants seen in the source
- Every `data-hw` string is duplicated: real text is `sr-only`, the animated span is `aria-hidden`.
- Menu is a focus trap: `Escape` closes, `Tab` cycles, focus returns to the burger; panel gets `tabindex="-1"` and `aria-hidden` toggling; body scroll locked.
- Skip link (`Skip to content`) on every page; `aria-expanded` / `aria-controls` on burger; `aria-live="polite"` on the form's helper line; `aria-pressed` on shop filters; `aria-label` on social icons and project links (`Rise - Product · Client`).
- `html:focus-within{scroll-behavior:smooth}` respected; all interactive targets ≥ 44·`--px` (`@media(pointer:coarse)` bumps to 48).

---

## 5. Content model (placeholder-ready)

```ts
type Site = {
  wordmark: { src, width: 1371, height: 118, alt: "Pamidor.Studio®" };
  tagline:  "Somewhere between structure and instinct.";
  email:    { label: "DOR@PAMIDORDESIGN.CO", href: "mailto:…" };
  socials:  { icon: "instagram"|"linkedin"|"dribbble"|"pinterest"|"tiktok", label, href }[];
  legal:    { label: "PRIVACY"|"TERMS", href }[];
  menu:     { label: "MENU", links: [{ Home, "/#top" }, { Studio, "/studio" }, { Work, "/#projects" }, { Art Lab, "/art-lab" }] };
  intro:    { src, width, height }[9];       // loader chip images
  hero:     { name: "Door Sharaby", lines: string[2], tags: string[5],
              portrait: Image, backdrop: Image, trail: Image[6] };
  projects: { slug, name, display, category, tags[], summary, abstract,
              meta: { role, timeline, year, team }, cover, hero:{src,video?},
              statements[], framing[], protocol[], palette{swatches[]}, figures[], next }[4];
  skillset: { n, title, body }[4];
  artLab:   { count: 164, copy, cta } ;
  shop:     { products: { slug, name, price, type: "PRINT"|"ORIGINAL"|"FRAMED",
              soldOut, cover, aspect: "416/520", description, sizes[] }[5] };
  form:     { eyebrow: "(LEAVE YOUR DETAILS)", title: "OPEN THE DOOR",
              direct: { label: "Or just write:", email }, fields[name,email,phone,reason,message],
              reasons[], submit: "Send Details", note, sent:{title,body}, failed, invalid, privacy };
};
```

**Placeholder content plan (your spec's ask):** one generated image, reused everywhere through CSS `object-fit` and per-slot `object-position` crops — hero portrait/backdrop, trail thumbnails (6 different crops of the same file), about float, 4 project covers, 2 art-lab panels, 9 loader chips, 164 art-lab tiles (crops re-coloured by a CSS filter matrix), shop cards, case-study figures. Every slot keeps the **exact aspect ratio and dimensions** from the spec, so the layout, spacing and animation timings are identical to the original — only the pixels differ. Workflow: one master 3:2 image → build-time `sharp` crops at the 14 required aspect ratios → `srcset` generated at the original widths.

---

## 6. Build architecture

### 6.1 Phase 1 — static specimen (no toolchain, previews instantly)
```
/pamidor
├── index.html                 home
├── studio.html  art-lab.html  shop.html
├── work/rise.html  work/figcoms.html  work/imotion.html  work/israel-police.html
├── privacy.html  terms.html
├── assets/
│   ├── tokens.css             --px, colors, type scale, reset
│   ├── components.css         nav, menu, buttons, chips, marquee, reveal, curtain, loader…
│   ├── main.js                intro, curtain, menu, hero, trail, wave, reveal, accordion, clip, count-up, art-lab
│   └── img/placeholder@2x.webp (+ generated crops)
```
- One CSS file defines `--px` and the type scale exactly as §2.
- `main.js` is ~600 lines of vanilla ES2020, zero dependencies, one `init()` per behavior guarded by `matchMedia` and reduced-motion.
- Test matrix: 1728×680, 1440×900, 1280×800, 1024×768, 768×1024, 390×844.

### 6.2 Phase 2 — Next.js port (App Router)
```
app/
├── layout.tsx                 fonts (next/font/local), LenisProvider, IntroLoader, RouteCurtain, Nav, Footer
├── page.tsx                   home (islands: HeroMaster, ProjectsList, StickyAbout, ClipFooter)
├── studio/page.tsx  art-lab/page.tsx  shop/page.tsx  shop/[slug]/page.tsx
├── work/[slug]/page.tsx       generateStaticParams from content/projects.ts
├── privacy/page.tsx  terms/page.tsx
components/  (mirror of C1–C16, all `"use client"`)
content/     site.ts, projects.ts, products.ts
lib/         useReveal.ts, useHw.ts, useStickyTravel.ts, easing.ts
public/      images, logos, videos, fonts
```
- Keep the same CSS-variable tokens in `globals.css`; keep Tailwind arbitrary values only if you want parity with the original markup (`calc(N*var(--px))` everywhere).
- All animation primitives implemented with WAAPI (`element.animate`) for the trail, CSS transitions for everything state-driven, `requestAnimationFrame` for scroll-derived (wave, clip reveal, art-lab).
- `next.config` image domains local only; videos `preload="none"` + IO-driven play/pause as in the original.

### 6.3 QA checklist (what "perfect" means here)
1. At 1440×900 hero `h1` measures 88.9 px / 78.2 lh; section `h2` 92.4 / 92.4; project title 53.3 / 56.0; label 11 px Archivo.
2. Container = 1440·`--px` capped; page margins 64 px desktop / 40 / 24.
3. Loader: letters at 45 ms steps, chip at 1180 ms, cycle 230 ms from 1880 ms, never longer than 1880 + 4·920 ms.
4. Hero: three copy groups at 140/340/520 ms with +90/+180 line offsets, 950 ms curve `.16,1,.3,1`.
5. Cursor trail never exceeds 4 nodes; nodes decay from 600 ms; mask travels right→left.
6. Hover-wave: 16 ms per character, red at 45 % of 400 ms.
7. Curtain: 667 cover / 754 reveal, no flash of unstyled route.
8. Accordion: 112→270·`--px` in 500 ms; nearest-centre selection matches mouse-over.
9. Footer clip: inset 5 %/7 % at full travel with cubic-out.
10. `prefers-reduced-motion`: nothing above runs, content is complete and static.

---

## 7. What is intentionally *not* copied
- Dor's name, likeness, client logos, case-study copy, project imagery and the Awwwards badge — replaced by the generated placeholder image and the placeholder content model above (also avoids using a real person's photos/likeness).
- Third-party analytics and the `/api/lead` endpoint — the rebuild ships a local stub that mimics `idle → sending → sent`.
- The exact "Dor → Door" wordplay is preserved as a *mechanism* (single-letter grow/shift on a 5 s loop), driven by whatever name you supply.

**Next step:** build Phase 1 (static specimen) with the placeholder master image, crop pipeline and the full animation runtime, then verify against the §6.3 checklist.
