'use client';

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
import { VisualLabCard } from '@/components/portfolio/visual-lab-card';
import { VisualLab } from '@/components/portfolio/visual-lab';
import { Skillset } from '@/components/portfolio/skillset';
import { Contact } from '@/components/portfolio/contact';
import { Footer } from '@/components/portfolio/footer';

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
            <VisualLabCard onEnter={() => setLabOpen(true)} />
            <Skillset />
            <Contact />
          </main>
          <Footer />

          {/* Visual Lab — separate full-screen overlay experience */}
          {labOpen && <VisualLab onClose={() => setLabOpen(false)} />}
        </div>

        {/* Studio — secret admin (triggered by typing "divahere") */}
        <AuthCard />
        <StudioOverlay />
      </StudioProvider>
    </EffectsProvider>
  );
}
