# Dhivakaran Portfolio — Worklog

Project: Cinematic, grunge, Awwwards-tier single-page portfolio for Dhivakaran.
Inspiration: Pamidor Studio (reverse-engineered spec in /upload/PAMIDOR_ARCHITECTURE.md),
plus user's own creative direction (image-1 hero, image-2 about, image-3 skillset).

Architecture rule (from PAMIDOR handoff): keep the site static. No backend, no DB,
no CMS, no uploader, no analytics, no third-party integrations. Placeholder content
only — real portrait/artwork/skills/contacts come later from the user.

---
Task ID: 1
Agent: main-orchestrator
Task: Initialize worklog, present creative brief for approval, then start foundation.

Work Log:
- Read PAMIDOR_ARCHITECTURE.md (full reverse-engineered spec of pamidordesign.co).
- Read current project state: Next.js 16 + Tailwind 4 + shadcn/ui scaffold, page.tsx is a placeholder.
- Confirmed inspiration images (image-1/2/3) were not delivered as files; working from
  the architecture doc + the user's written description.
- Defined unifying concept: "The Developing Room" — scroll = photographic development
  (latent/blurry/light → exposed/sharp/dark). Ties hero, about, visual lab, skillset,
  contact into one cohesive cinematic metaphor.
- Locked cinematic palette: warm parchment canvas, deep warm onyx ink, brass/amber
  accent, oxblood hover. NO red, NO indigo, NO blue.
- Locked type: Fraunces (display+body) + JetBrains Mono (labels/eyebrows).
- Planned 7 sections: IntroLoader → Nav → Hero → About → VisualLab → Skillset → Contact → Footer.

Stage Summary:
- Creative brief presented to user for approval before deep build.
- Foundation work (tokens, fonts, layout shell) can proceed in parallel since it is
  non-controversial infrastructure. Section-level creative inventions wait for go-ahead.

---
Task ID: 2-11
Agent: main-orchestrator
Task: Build the full cinematic portfolio (foundation, all 7 sections, lint, agent-browser verification).

Work Log:
- Installed `lenis` for smooth scroll.
- Generated 3 cinematic placeholder images via z-ai image CLI:
  - public/images/portrait.png (864x1152) — back-turned man, warm amber lighting
  - public/images/atmosphere.png (1344x768) — dim atelier interior
  - public/images/object-lens.png (1024x1024) — brass aperture lens still-life
- Foundation:
  - layout.tsx: Fraunces + JetBrains Mono via <link> tags (next/font had Turbopack issue), skip link, data-loading on html
  - globals.css: full cinematic token system (warm parchment + onyx + brass + oxblood), --px scalar, type scale, motion primitives, film-grain overlay, reduced-motion handling
- Components built (src/components/portfolio/):
  - lib/use-lenis.ts — smooth scroll, respects reduced-motion, prevents inside [data-canvas=fixed]
  - lib/use-reveal.ts — IntersectionObserver reveal
  - wave-text.tsx — char-by-char "developing" reveal (light → brass flash → ink)
  - hover-wave.tsx — reusable char sweep on hover
  - intro-loader.tsx — film-leader countdown (FRAME 0241→0250), wordmark develops, iris pulse, 1.88s
  - nav.tsx — sticky mix-blend-difference nav, burger→X morph, full-height slide-in menu, focus trap, Esc, scroll lock
  - hero.tsx — full-bleed portrait (integrated via brass color grade + grain), 3D rise reveal, focus-pull on scroll, frame counter, cursor-follow brass key light, name parallax
  - about.tsx — 135vh sticky-travel, WaveText paragraph (545 chars, light→dark), rotated portrait float, "A little room to wander." italic aside, two opposing brass marquees (NO vertical line)
  - visual-lab.tsx — full-screen 100dvh infinite drag field: 56 tiles in 8x7 grid (cellW=340), toroidal wrap, depth-of-field (center 0.6px blur → edges 9px), inertia on release, wheel/arrow-keys pan, minimal chrome, EXIT pill, grain + dust per tile
  - skillset.tsx — "developing room" specimen wall: 9 disordered cards (rotations ±1.5°, hand-pinned offsets), exposure meters fill light→brass→oxblood, anamorphic flare sweep on hover, blur-to-focus reveal on entry
  - contact.tsx — "final print" clip-reveal panel (un-masks from bottom up), WaveText headline "Let's make something that holds together.", WhatsApp + Email plates + 5 socials (placeholders), NO form, NO backend
  - footer.tsx — clip-reveal footer, giant "DHIVAKARAN®" wordmark (17vw), italic tagline, email link, back-to-top, legal line "© 0250 DHIVAKARAN® — ALL FRAMES RESERVED"
- page.tsx: composes all sections with useLenis hook, flex-col min-h-screen for sticky footer.

Verification (agent-browser on http://localhost:3000):
- GET / 200, no runtime/hydration errors, clean console.
- Lint: 0 errors, 2 warnings (font link tags — acceptable given next/font Turbopack bug).
- Hero: portrait bg loads, h1 "Dhivakaran" at 108px Fraunces, warm parchment palette confirmed, data-loading removed after loader exits.
- About: WaveText 545 chars, partial-lit state verified (342/545 lit mid-scroll, 545/545 after) — developing effect works.
- Visual Lab: 56 tiles, 15 visible, depth-of-field gradient confirmed (center 0.62px blur → edges 9px), drag interaction pans tiles (verified transform change), inertia decays.
- Skillset: 9 specimen cards, "The Cabinet of nine" title, first card exposed (blur 0px, opacity 1), 6/9 cards developed on scroll.
- Contact: headline 41/41 chars lit, 7 contact links (WhatsApp, Email, Instagram, LinkedIn, Dribbble, Twitter/X, GitHub) with correct placeholder hrefs.
- Footer: "DHIVAKARAN®" wordmark, email link, "↑ BACK TO FRAME 0000", legal line.
- Mobile (390x844): h1 at 40px, no horizontal overflow, nav visible, full-page screenshot clean.
- Menu: opens via burger (aria-hidden=false), 5 links (The Room, Visual Lab, Skillset, Contact, Top).

Stage Summary:
- Full cinematic portfolio built and verified end-to-end via agent-browser.
- All 7 sections render, all core interactions work (scroll-developing text, visual lab drag + depth-of-field, skillset developing cards, contact clip-reveal, menu, mobile).
- Strictly static — no backend, no DB, no API, no analytics, no third-party integrations (per PAMIDOR handoff).
- All content is clearly placeholders (portrait, artwork, skills, contacts) — ready for the user to swap in real content.
- Awaiting user feedback on the creative direction; can iterate on any section's aesthetic, motion, or copy.

---
Task ID: 12-19
Agent: main-orchestrator
Task: Fix three user-reported issues: About sticky not pinning during reveal, Visual Lab should be a separate overlay entered via a card, and palette should be white/black.

Work Log:
- Palette retune (globals.css):
  - Canvas: #FAFAFA (off-white), Ink/Night: #0A0A0A (pure black), Bone: #F2F2F2, Bone-soft: #FCFCFC, Rule: #D4D4D4, Muted: #6B6B6B
  - Accent: single cinematic red --accent: #D62929, --accent-soft: #EF4444, --accent-deep: #991B1B
  - Legacy aliases kept (--brass/--brass-soft/--oxblood → accent vars) so all components update automatically
  - Wave text now pure grayscale developing (rgba(10,10,10,0.14) → 0.5 → 1) — no chromatic flash
  - Selection: red bg, white fg
  - Fixed body overflow-x: hidden → clip (was breaking position: sticky)
- WaveText refactor (wave-text.tsx):
  - Added optional rootRef prop — when provided, progress is computed from that element's travel
  - New formula: progress = (-rootTop) / (rootHeight - innerH) — reveals DURING the pinned travel
  - Falls back to container's own rect if no rootRef
- About fixes (about.tsx):
  - Added travelRef on the 200vh travel wrapper (bumped from 135vh → 200vh for 100vh of pinned travel)
  - Passed travelRef to WaveText as rootRef
  - Portrait insert filter → grayscale(1) for white/black aesthetic
- Visual Lab → overlay (visual-lab.tsx):
  - Converted from inline section to a fixed overlay (position:fixed, inset:0, z-index:80)
  - Iris-open entrance animation (clip-path circle 0 → 150%)
  - Esc key closes (overlay-level keydown listener)
  - Body scroll lock while open (document.body.style.overflow = 'hidden')
  - Removed IntersectionObserver (overlay is always in view — wheel/keys always pan)
  - Added CLOSE button (top-right, red-bordered X)
  - EXIT pill now calls onClose instead of navigating
  - Tile filters all changed to grayscale(1) variants for white/black aesthetic
  - Chrome text (labels, hints) changed from brass to white/canvas
- New VisualLabCard (visual-lab-card.tsx):
  - Section on home page between About and Skillset
  - Bold typographic CTA: "A field of frames, infinite in every direction."
  - Grayscale preview swatch (atmosphere image, masked)
  - "Enter the Visual Lab →" CTA button (calls onEnter)
  - role="button", tabIndex=0, keyboard accessible (Enter/Space)
- Nav update (nav.tsx):
  - "Visual Lab" menu link is now an action (not a href) — calls onEnterLab callback
  - Nav accepts onEnterLab prop; small delay so menu closes first
- page.tsx:
  - Added labOpen state
  - Renders VisualLabCard (onEnter) in the flow
  - Conditionally renders {labOpen && <VisualLab onClose />} outside main
  - Passes onEnterLab to Nav
- Hero update (hero.tsx):
  - Portrait filter → grayscale(1) contrast(1.08) brightness(0.92)
  - Scroll-driven focus-pull now preserves grayscale: `grayscale(1) blur(Npx) brightness(...) contrast(1.08-...)`
  - Cursor key light → white (rgba(255,255,255,0.14)) instead of brass
  - Frame counter + scroll hint → white (var(--canvas)) with red accent for the hairline/dot
  - Subtle red accent tint overlay (rgba(214,41,41,0.06)) instead of brass
- Bug fix: use-reveal.ts rootMargin '0 0 -12% 0' → '0px 0px -12% 0px' (browser rejected unitless 0)

Verification (agent-browser):
- Palette: body bg rgb(250,250,250) = #FAFAFA ✓, text rgb(10,10,10) = #0A0A0A ✓
- Hero: portrait filter grayscale(1) blur(0px) brightness(1) contrast(1.08) ✓, h1 color rgb(250,250,250) white on dark ✓
- About sticky: at pin start stickyTop=0 pinned=true waveLit=0/545; after 450px scroll stillPinned=true waveLit=273 (50%); after 900px stillPinned=true waveLit=545 (100%) — page STOPS while text develops ✓
- Visual Lab card: found on home page, title "A field of frames, infinite in every direction.", CTA present ✓
- Overlay open: clicking card opens #visual-lab as fixed overlay z-80, body locked, CLOSE + EXIT buttons present ✓
- Overlay depth-of-field: 56 tiles, center tile 109px from center, blur 0.62px (sharp) ✓
- Close via X: overlayGone=true, bodyUnlocked=true ✓
- Close via Esc: reopened then closedViaEsc=true ✓
- Lint: 0 errors, 2 font-link warnings (acceptable)

Stage Summary:
- All three user-reported issues fixed and verified end-to-end:
  1. About now truly pins (stickyTop stays 0) while the wave text develops 0→100% across 100vh of scroll travel
  2. Visual Lab is now a separate full-screen overlay, entered via a card on the home page (or via the nav menu), with iris-open entrance, and closable via X button, EXIT pill, or Esc — no more trap
  3. Palette is now white + black + a single restrained cinematic red accent; portrait and lab tiles are grayscale film treatment
- Home page flow: Hero → About → VisualLabCard → Skillset → Contact → Footer
- Overlay: VisualLab (fixed, iris-open, body-locked, closable 3 ways)
- Still strictly static — no backend, no DB, no API (per PAMIDOR handoff)

---
Task ID: 20-23
Agent: main-orchestrator
Task: Add the missing Selected Work section between About and VisualLabCard; curate big list of crazy ideas for user selection.

Work Log:
- Created src/components/portfolio/selected-work.tsx:
  - Accordion of 5 placeholder projects (Atelier North, Kovil Press, Night Soil Co., Half-Light Films, Paper & Ash)
  - Desktop: hover-driven accordion. Active row expands; cover image reveals with BLUR-TO-FOCUS pull (blur 14px → 0px on active)
  - Non-active rows dim to opacity 0.45; active title turns accent red (rgb(214,41,41))
  - Covers: grayscale(1) + contrast + dust overlay + slight rotation + frame border + frame number mono label
  - Metadata (role/category/year) fades + slides in when active
  - Touch/no-hover: IntersectionObserver (rootMargin -45%/-45%) picks row nearest viewport center
  - Mobile (≤1023px): stacked cards, cover always visible (16/10), no accordion
  - "VIEW FULL INDEX →" placeholder link at the bottom
  - Reduced-motion: transitions disabled
- Wired into page.tsx between About and VisualLabCard
- Added "Selected Work → #work" to nav menu links (between The Room and Visual Lab)

Verification (agent-browser):
- Section found, title "Selected frames", 5 rows, all keyboard-accessible (tabindex=0, cursor:pointer)
- Default active row 0: title rgb(214,41,41) red ✓, cover blur(0px) sharp ✓
- Real hover on row 2 (via agent-browser hover): r1Active=true, r1TitleColor=rgb(214,41,41) red ✓, r0Opacity=0.45 dimmed ✓, r1CoverBlur=0 focused ✓
- Lint: 0 errors, 2 font-link warnings (unchanged)

Stage Summary:
- Missing Selected Work section added and verified (accordion + blur-to-focus covers + grunge + responsive).
- Page flow now: Hero → About (pins + develops) → SelectedWork (accordion) → VisualLabCard → Skillset → Contact → Footer.
- Big list of 25+ crazy blur/focus/grunge/motion ideas presented to user for selection (see chat message).
- Implementation of selected ideas will be non-destructive: layered on top of existing sections with reduced-motion fallbacks, no breakage.

---
Task ID: 24-27
Agent: main-orchestrator
Task: Implement user's 17 selected crazy ideas (#1,2,4,5,6,7,8,10,14,16,18,21,23,24,26,28,30) non-destructively; rename to "Dhivakaran M"; remove all parenthetical eyebrows + meta-notes.

Work Log:
- Conflict resolution (planned, not destructive):
  - #6/#8/#10/#28 hover effects scope-separated (6=hero+about portraits, 8=static on all, 10=continuous on Work covers, 28=momentary on Work activation)
  - #1/#2/#14/#23 scroll-blur effects target different layers (14=whole page momentary, 1=Work-only, 2=headings, 23=content entry)
  - #2+#24 synced on headings (blur rack + variable weight, same scroll progress)
  - #7 demoted to subtle light-leak sweep (composes with #23 bloom)
  - #18 = magnetic attraction + trailing glow, no custom dot
  - #4 reduced to 6-8 motes
  - #26 = Hero side only
- New CSS utilities in globals.css (section 8): tilt-shift, halftone, var-focus, bloom, heading-rack, light-leak, scratch-overlay, neg-flash, dolly-zoom, bokeh-mote, viewfinder, vertical-rail, contact-sheet-grid. All with reduced-motion + touch fallbacks.
- New hooks:
  - lib/use-scroll-velocity.ts (#14) — body[data-scroll-fast] when velocity > threshold
  - lib/use-bloom-rack.ts — useBloom (#23, with 1.5s safety timeout so content never stuck hidden) + useHeadingRack (#2+#24, blur rack + Fraunces weight 300→700 bell curve)
  - lib/use-magnetic-cursor.ts (#18) — trailing red glow + magnetic attraction within 80px of interactive elements
- New components:
  - bokeh-field.tsx (#4) — 6-8 drifting blurred light motes
  - viewfinder-cursor.tsx (#21) — camera viewfinder frame + crosshairs, replaces cursor in lab only
  - light-leak.tsx (#7) — fixed overlay, plays 0.9s sweep at 4 section boundaries
  - vertical-rail.tsx (#26) — vertical-RL mono label on Hero side
  - effects-provider.tsx — orchestrates #14+#18+#7 globally, wraps the page
- SelectedWork rewrite with layered effects:
  - #1 tilt-shift (section-level data-tilt attribute, 3px blur at edges)
  - #5 Z-parallax (data-speed on cover 0.7× + metadata 1.2×, subtle ±5px differential)
  - #8 halftone class on covers
  - #10 scratch-host + scratch-overlay on covers (continuous drift on hover)
  - #28 neg-flash on row activation (400ms invert flash via prevActiveRef)
  - #30 accordion/grid toggle (button group, aria-pressed)
  - #23 bloom on content
  - #2/#24 heading rack + variable weight
  - All placeholder/meta eyebrows removed ("( SELECTED WORK · 0005 · PLACEHOLDERS )" gone)
- About updates: removed eyebrow, added title "A little room / to wander", bloom on content, heading rack, var-focus + halftone on float portrait, aside changed to "The room is always open. — 0250", collaborator label "Clients & Collaborations"
- Hero updates: name "Dhivakaran M" (M in italic accent-soft), eyebrow → "Dhivakaran M — Portfolio", VerticalRail on right side, removed "DEVELOPING ROOM" subtitle, subline simplified
- Skillset updates: removed eyebrow, #16 dolly-zoom (data-dolly pending→active on entry), #4 bokeh (8 motes), #23 bloom, #2/#24 heading rack, ambient glow → red, footer note "Nine of nine / all exposed"
- Contact updates: removed eyebrows ("The final print", "Socials"), #4 bokeh (6 motes), #23 bloom on panel, signature "— Dhivakaran M"
- Visual Lab overlay: #4 bokeh (6 motes), #21 ViewfinderCursor, simplified chrome label "0049 frames · one plane"
- Visual Lab card: removed eyebrow ("The Visual Lab"), removed corner note "SEPARATE EXPERIENCE / OPENS FULL-SCREEN", simplified accent label
- Footer: wordmark "Dhivakaran M®" (clamp 14vw max to fit), removed "( A NOTE FROM THE ROOM )" + "( WRITE )", legal "© 0250 DHIVAKARAN M®"
- Nav: wordmark "DHIVAKARAN M®", removed menu eyebrow "( MENU — DHIVAKARAN® )", footer location "Colombo · 06.47 N 79.86 E"
- Intro loader: wordmark "DHIVAKARAN M", subline simplified to "0250 ASA · DAYLIGHT"
- layout.tsx metadata: title/og/twitter → "Dhivakaran M"
- Fixed: duplicate import in skillset.tsx (useBloom/useHeadingRack imported twice)

Verification (agent-browser):
- Lint: 0 errors, 2 font-link warnings
- No runtime errors in browser console
- heroName "Dhivakaran M", navWm "DHIVAKARAN M®", footerWm "Dhivakaran M®", signatureM true
- All parenthetical eyebrows removed (heroEyebrowGone/aboutEyebrowGone/workEyebrowGone all true)
- Effects present: verticalRail, magneticGlow, lightLeak, aboutBloom, workToggle, skillsetBokeh(8), skillsetDolly(pending), contactBokeh(6), contactBloom
- Interactions verified: scroll-velocity blur fires (data-scroll-fast=true during fast scroll), heading rack active (data-rack=in, weight 606.5 on bell curve), grid toggle switches (5 contact-sheet cells, accordion hidden), lab overlay opens (6 bokeh motes + viewfinder element + 56 tiles)
- Bloom safety: aboutBloomed + workBloomed both true; 1.5s safety timeout guarantees content never stuck hidden

Stage Summary:
- All 17 selected effects implemented non-destructively (layered on top, reduced-motion + touch fallbacks, intensity capped).
- Name updated to "Dhivakaran M" everywhere (hero, footer, nav, loader, contact signature, metadata).
- All parenthetical eyebrow small-text + meta "PLACEHOLDERS" notes removed across all sections.
- Nothing existing broke — every prior section (hero, about, visual lab, skillset, contact, footer, nav) still renders and functions; the Selected Work section gained the most layering.
- Page flow unchanged: Hero → About → SelectedWork → VisualLabCard → Skillset → Contact → Footer (+ Visual Lab overlay).
