'use client';

import { useLenis } from '@/components/portfolio/lib/use-lenis';
import { IntroLoader } from '@/components/portfolio/intro-loader';
import { Nav } from '@/components/portfolio/nav';
import { Hero } from '@/components/portfolio/hero';
import { About } from '@/components/portfolio/about';
import { VisualLab } from '@/components/portfolio/visual-lab';
import { Skillset } from '@/components/portfolio/skillset';
import { Contact } from '@/components/portfolio/contact';
import { Footer } from '@/components/portfolio/footer';

export default function Home() {
  useLenis();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--canvas)',
      }}
    >
      <IntroLoader />
      <Nav />
      <main id="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Hero />
        <About />
        <VisualLab />
        <Skillset />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
