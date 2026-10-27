'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useLenis } from '@/components/portfolio/lib/use-lenis';
import { EffectsProvider } from '@/components/portfolio/effects-provider';
import { StudioProvider } from '@/components/portfolio/studio/studio-provider';
import { AuthCard } from '@/components/portfolio/studio/auth-card';
import { StudioOverlay } from '@/components/portfolio/studio/studio-overlay';
import { IntroLoader } from '@/components/portfolio/intro-loader';
import { Nav } from '@/components/portfolio/nav';
import { Hero } from '@/components/portfolio/hero';
import { About } from '@/components/portfolio/about';
import { SelectedWork } from '@/components/portfolio/selected-work';
import { VideoSection } from '@/components/portfolio/video-section';
import { VisualLabCard } from '@/components/portfolio/visual-lab-card';
import { Experiences } from '@/components/portfolio/experiences';
import { Contact } from '@/components/portfolio/contact';
import { Footer } from '@/components/portfolio/footer';

// Phase 4 — VisualLab is the heaviest portfolio component (~427 lines with
// pan/drag/wheel/inertia logic + Supabase fetch). It only opens on user action
// (click "Enter The Visual Lab" card). Dynamic-import with ssr:false means its
// chunk + Supabase fetch logic loads on-demand, not on first paint.
const VisualLab = dynamic(
  () => import('@/components/portfolio/visual-lab').then((m) => ({ default: m.VisualLab })),
  {
    ssr: false,
    loading: () => null, // no placeholder — the iris-open animation masks the load
  }
);

export default function Home() {
  useLenis();
  const [labOpen, setLabOpen] = useState(false);

  return (
    <EffectsProvider>
      <StudioProvider>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--canvas)',
          }}
        >
          <IntroLoader />
          <Nav onEnterLab={() => setLabOpen(true)} />
          <main id="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Hero />
            <About />
            <SelectedWork />
            <VideoSection />
            <VisualLabCard onEnter={() => setLabOpen(true)} />
            <Experiences />
            <Contact />
          </main>
          <Footer />

          {/* Visual Lab — separate full-screen overlay experience.
              Phase 4: dynamic-imported, only loads when user opens it. */}
          {labOpen && <VisualLab onClose={() => setLabOpen(false)} />}
        </div>

        {/* Studio — secret admin (triggered by typing "divahere") */}
        <AuthCard />
        <StudioOverlay />
      </StudioProvider>
    </EffectsProvider>
  );
}
