'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Lenis smooth scroll. lerp 0.1, respects reduced motion.
 * Initializes once per page; resets scroll on hash change.
 */
export function useLenis() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.06,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      duration: 1.2,
      prevent: (node) => {
        // do not smooth-scroll inside the visual lab field (it has its own pan)
        return (
          !!node?.closest?.('[data-lenis-prevent]') ||
          !!node?.closest?.('[data-canvas="fixed"]')
        );
      },
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // anchor links — Lenis intercepts clicks on <a href="#..."> to do a
    // smooth animated scroll to the target element.
    //
    // WORKAROUND for content-visibility: auto + smooth-scroll position bug:
    // When sections above the target use `content-visibility: auto`, they
    // collapse to their `containIntrinsicSize` placeholder when off-screen.
    // This causes Lenis's `scrollTo(element)` to compute the target position
    // based on the COLLAPSED cumulative height — landing ~2000px short for
    // sections deep in the page (e.g., Experiences was scrolling to y=3961
    // instead of y=5894).
    //
    // Fix: temporarily set `content-visibility: visible` on every section
    // that has it inline (forcing the browser to compute their actual layout),
    // trigger a reflow, then scroll. Restore the original styles after the
    // scroll animation completes (1.2s + 0.3s buffer = 1.5s).
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href === '#') return;
      const el = document.querySelector(href) as HTMLElement | null;
      if (!el) return;
      e.preventDefault();

      // Force layout computation for content-visibility: auto sections.
      // Selector matches elements with inline `content-visibility` style
      // (sections set it inline via React style={{ contentVisibility: 'auto' }}).
      const cvElements = Array.from(
        document.querySelectorAll<HTMLElement>('[style*="content-visibility"]')
      );
      const prevCVs = cvElements.map((el) => el.style.contentVisibility);
      cvElements.forEach((el) => { el.style.contentVisibility = 'visible'; });
      // Force a synchronous reflow so the browser computes actual layouts
      // before Lenis reads getBoundingClientRect() on the target.
      void document.body.offsetWidth;

      lenis.scrollTo(el, { offset: 0, duration: 1.2 });

      // Restore original content-visibility styles after the scroll completes.
      setTimeout(() => {
        cvElements.forEach((el, i) => {
          if (el.isConnected) el.style.contentVisibility = prevCVs[i];
        });
      }, 1500);
    };
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', onClick);
      lenis.destroy();
    };
  }, []);
}
