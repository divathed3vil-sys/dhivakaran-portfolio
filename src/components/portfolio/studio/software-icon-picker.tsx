'use client';

import { useMemo, useState } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from 'cmdk';
import { Box, Search } from 'lucide-react';
import { getSoftwareIconUrl } from '@/lib/experiences-data';

/**
 * SoftwareIconPicker — searchable command palette for picking a software
 * brand icon from the simple-icons CDN.
 *
 * Live preview: each candidate icon is rendered as an <img> from
 * https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{slug}.svg
 * — MIT-licensed, no API key, no Supabase involvement.
 *
 * Curated registry of ~80 common software brands covering the design, dev,
 * filmmaking, and OS/hardware tools the user works with. Custom slugs can
 * also be typed directly into the search field (the picker doesn't restrict
 * to the curated list — any valid simple-icons slug works).
 *
 * Click an entry → onSelect(slug). Escape → close (preserves current value).
 */
type SoftwareEntry = {
  slug: string;
  name: string;
  keywords: string[];
};

const SOFTWARE: SoftwareEntry[] = [
  // Adobe Creative Cloud suite
  { slug: 'adobephotoshop', name: 'Adobe Photoshop', keywords: ['ps', 'image', 'edit'] },
  { slug: 'adobepremierepro', name: 'Adobe Premiere Pro', keywords: ['pr', 'video', 'edit'] },
  { slug: 'adobeaftereffects', name: 'Adobe After Effects', keywords: ['ae', 'motion', 'vfx'] },
  { slug: 'adobeillustrator', name: 'Adobe Illustrator', keywords: ['ai', 'vector', 'logo'] },
  { slug: 'adobeindesign', name: 'Adobe InDesign', keywords: ['id', 'print', 'layout'] },
  { slug: 'adobelightroom', name: 'Adobe Lightroom', keywords: ['lr', 'photo', 'raw'] },
  { slug: 'adobedimension', name: 'Adobe Dimension', keywords: ['3d', 'render'] },
  { slug: 'adobexd', name: 'Adobe XD', keywords: ['ux', 'ui', 'design'] },
  { slug: 'adobe', name: 'Adobe (brand)', keywords: ['cc', 'creative cloud'] },

  // Video / 3D / color
  { slug: 'davinciresolve', name: 'DaVinci Resolve', keywords: ['color', 'grade', 'edit'] },
  { slug: 'blender', name: 'Blender', keywords: ['3d', 'model', 'cycles'] },
  { slug: 'cinema4d', name: 'Cinema 4D', keywords: ['c4d', '3d', 'motion'] },
  { slug: 'figma', name: 'Figma', keywords: ['ui', 'design', 'prototype'] },
  { slug: 'sketch', name: 'Sketch', keywords: ['ui', 'design'] },
  { slug: 'canva', name: 'Canva', keywords: ['design', 'graphic'] },

  // Programming languages + frameworks
  { slug: 'python', name: 'Python', keywords: ['script', 'django', 'flask'] },
  { slug: 'typescript', name: 'TypeScript', keywords: ['ts', 'types'] },
  { slug: 'javascript', name: 'JavaScript', keywords: ['js', 'web'] },
  { slug: 'dart', name: 'Dart', keywords: ['flutter', 'lang'] },
  { slug: 'go', name: 'Go', keywords: ['golang', 'backend'] },
  { slug: 'rust', name: 'Rust', keywords: ['systems', 'memory'] },
  { slug: 'csharp', name: 'C#', keywords: ['dotnet', 'csharp'] },
  { slug: 'cplusplus', name: 'C++', keywords: ['cpp', 'systems'] },
  { slug: 'php', name: 'PHP', keywords: ['laravel', 'web'] },
  { slug: 'ruby', name: 'Ruby', keywords: ['rails'] },
  { slug: 'java', name: 'Java', keywords: ['jvm', 'spring'] },
  { slug: 'kotlin', name: 'Kotlin', keywords: ['jvm', 'android'] },
  { slug: 'swift', name: 'Swift', keywords: ['ios', 'apple'] },

  // Frontend / meta-frameworks
  { slug: 'nextdotjs', name: 'Next.js', keywords: ['react', 'ssr'] },
  { slug: 'react', name: 'React', keywords: ['jsx', 'components'] },
  { slug: 'vuedotjs', name: 'Vue.js', keywords: ['vue', 'components'] },
  { slug: 'svelte', name: 'Svelte', keywords: ['compiler', 'reactive'] },
  { slug: 'astro', name: 'Astro', keywords: ['static', 'islands'] },
  { slug: 'nuxtdotjs', name: 'Nuxt.js', keywords: ['vue', 'ssr'] },
  { slug: 'remix', name: 'Remix', keywords: ['react', 'ssr'] },
  { slug: 'vite', name: 'Vite', keywords: ['bundler', 'dev'] },
  { slug: 'tailwindcss', name: 'Tailwind CSS', keywords: ['css', 'utility'] },

  // Mobile / desktop
  { slug: 'flutter', name: 'Flutter', keywords: ['dart', 'cross-platform'] },
  { slug: 'reactos', name: 'ReactOS', keywords: ['os'] },
  { slug: 'android', name: 'Android', keywords: ['mobile', 'google'] },
  { slug: 'ios', name: 'Apple iOS', keywords: ['mobile', 'apple'] },
  { slug: 'macos', name: 'macOS', keywords: ['apple', 'os'] },
  { slug: 'windows', name: 'Windows', keywords: ['microsoft', 'os'] },
  { slug: 'windows11', name: 'Windows 11', keywords: ['microsoft', 'os'] },
  { slug: 'ubuntu', name: 'Ubuntu', keywords: ['linux', 'canonical'] },
  { slug: 'debian', name: 'Debian', keywords: ['linux'] },
  { slug: 'linux', name: 'Linux (Tux)', keywords: ['tux', 'kernel', 'os'] },
  { slug: 'archlinux', name: 'Arch Linux', keywords: ['linux', 'rolling'] },
  { slug: 'fedoralinux', name: 'Fedora Linux', keywords: ['linux', 'redhat'] },
  { slug: 'docker', name: 'Docker', keywords: ['containers', 'devops'] },
  { slug: 'kubernetes', name: 'Kubernetes', keywords: ['k8s', 'orchestration'] },

  // Backend / databases / hosting
  { slug: 'supabase', name: 'Supabase', keywords: ['postgres', 'auth', 'backend'] },
  { slug: 'firebase', name: 'Firebase', keywords: ['google', 'backend'] },
  { slug: 'prisma', name: 'Prisma', keywords: ['orm', 'db'] },
  { slug: 'postgresql', name: 'PostgreSQL', keywords: ['postgres', 'db', 'sql'] },
  { slug: 'mysql', name: 'MySQL', keywords: ['db', 'sql'] },
  { slug: 'redis', name: 'Redis', keywords: ['cache', 'kv'] },
  { slug: 'mongodb', name: 'MongoDB', keywords: ['nosql', 'db'] },
  { slug: 'cloudflare', name: 'Cloudflare', keywords: ['cdn', 'edge'] },
  { slug: 'vercel', name: 'Vercel', keywords: ['hosting', 'deploy'] },
  { slug: 'netlify', name: 'Netlify', keywords: ['hosting', 'jamstack'] },

  // Dev tools
  { slug: 'github', name: 'GitHub', keywords: ['git', 'code', 'repo'] },
  { slug: 'gitlab', name: 'GitLab', keywords: ['git', 'ci'] },
  { slug: 'bitbucket', name: 'Bitbucket', keywords: ['git', 'atlassian'] },
  { slug: 'visualstudiocode', name: 'VS Code', keywords: ['editor', 'ide', 'microsoft'] },
  { slug: 'androidstudio', name: 'Android Studio', keywords: ['ide', 'jetbrains'] },
  { slug: 'intellijidea', name: 'IntelliJ IDEA', keywords: ['ide', 'jetbrains'] },
  { slug: 'webstorm', name: 'WebStorm', keywords: ['ide', 'jetbrains'] },
  { slug: 'pycharm', name: 'PyCharm', keywords: ['ide', 'python', 'jetbrains'] },
  { slug: 'xcode', name: 'Xcode', keywords: ['ide', 'apple'] },
  { slug: 'neovim', name: 'Neovim', keywords: ['editor', 'vim'] },
  { slug: 'vim', name: 'Vim', keywords: ['editor'] },
  { slug: 'gnubash', name: 'GNU Bash', keywords: ['shell', 'cli'] },
  { slug: 'tmux', name: 'tmux', keywords: ['terminal', 'multiplexer'] },
  { slug: 'postman', name: 'Postman', keywords: ['api', 'test'] },
  { slug: 'insomnia', name: 'Insomnia', keywords: ['api', 'rest'] },

  // AI / LLM
  { slug: 'openai', name: 'OpenAI', keywords: ['ai', 'llm', 'gpt'] },
  { slug: 'anthropic', name: 'Anthropic', keywords: ['ai', 'claude'] },
  { slug: 'huggingface', name: 'Hugging Face', keywords: ['ai', 'ml'] },
  { slug: 'tensorflow', name: 'TensorFlow', keywords: ['ml', 'google'] },
  { slug: 'pytorch', name: 'PyTorch', keywords: ['ml', 'meta'] },
  { slug: 'open source ai', name: 'Open Source AI', keywords: ['ai', 'oss'] }, // synthetic — likely 404

  // Hardware / repair
  { slug: 'raspberrypi', name: 'Raspberry Pi', keywords: ['sbc', 'hardware'] },
  { slug: 'arduino', name: 'Arduino', keywords: ['microcontroller', 'hardware'] },
];

export function SoftwareIconPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SOFTWARE;
    return SOFTWARE.filter(
      (s) => s.slug.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  return (
    <div
      role="dialog"
      aria-label="Pick a software brand icon"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 10, 10, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(480px, 90vw)',
          maxHeight: 'min(620px, 80vh)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--night)',
          border: '1.5px solid var(--accent)',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.7)',
          animation: 'auth-card-in 0.5s var(--ease-out-soft)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — current selection preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <SoftwarePreview slug={value} size={32} />
          <div style={{ flex: 1 }}>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginBottom: '0.15rem' }}>
              CURRENT
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono), monospace',
                color: 'var(--canvas)',
                fontSize: '0.9rem',
                letterSpacing: '0.04em',
              }}
            >
              {value || '— none —'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close software icon picker"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '3px',
              background: 'rgba(22,22,22,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--canvas)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s var(--ease-spring-soft)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Search size={14} strokeWidth={1.5} color="var(--night-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands (e.g. photoshop, react, linux)…"
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* List (custom — not using cmdk CommandList for tighter control over image rendering) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem',
            scrollbarWidth: 'thin',
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--night-muted)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.85rem',
              }}
            >
              No matches. Type a custom slug + Enter to test it:
              <div style={{ marginTop: '0.5rem', color: 'var(--accent)' }}>{query}</div>
            </div>
          ) : (
            filtered.map((sw) => (
              <button
                key={sw.slug}
                onClick={() => onSelect(sw.slug)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.55rem 0.7rem',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  background: sw.slug === value ? 'rgba(214,41,41,0.15)' : 'transparent',
                  border: 0,
                  color: 'var(--canvas)',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.85rem',
                  transition: 'background 0.2s var(--ease-spring-soft)',
                }}
                onMouseEnter={(e) => {
                  if (sw.slug !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (sw.slug !== value) e.currentTarget.style.background = 'transparent';
                }}
              >
                <SoftwarePreview slug={sw.slug} size={22} />
                <span style={{ flex: 1 }}>{sw.name}</span>
                <span style={{ color: 'var(--night-muted)', fontSize: '0.75rem' }}>{sw.slug}</span>
                {sw.slug === value && (
                  <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>●</span>
                )}
              </button>
            ))
          )}

          {/* Custom slug tester (if query doesn't match any entry, show a "try this" button) */}
          {query.trim() && filtered.length === 0 && (
            <button
              onClick={() => onSelect(query.trim().toLowerCase().replace(/\s+/g, ''))}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.7rem',
                background: 'rgba(214,41,41,0.1)',
                border: '1px dashed var(--accent)',
                color: 'var(--canvas)',
                cursor: 'pointer',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.8rem',
              }}
            >
              ↪ Try custom slug: <span style={{ color: 'var(--accent)' }}>{query.trim().toLowerCase().replace(/\s+/g, '')}</span>
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="text-mono text-label"
          style={{
            color: 'var(--night-muted)',
            opacity: 0.6,
            padding: '0.6rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            textAlign: 'center',
          }}
        >
          icons load live from jsdelivr · simple-icons CDN (no Supabase)
        </div>
      </div>
    </div>
  );
}

// ---------- Software preview icon with error fallback ----------

function SoftwarePreview({ slug, size = 22 }: { slug: string; size?: number }) {
  // For empty / unset slug, show a placeholder Box
  if (!slug) {
    return <Box size={size} strokeWidth={1.5} color="var(--night-muted)" />;
  }
  // Live load from jsdelivr + simple-icons CDN
  return (
     
    <img
      src={getSoftwareIconUrl(slug)}
      alt={slug}
      width={size}
      height={size}
      onError={(e) => {
        // Fallback: if the slug is invalid, swap to a generic Box icon
        const target = e.currentTarget;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('.fallback-icon')) {
          const span = document.createElement('span');
          span.className = 'fallback-icon';
          span.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--night-muted)"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>';
          parent.appendChild(span);
        }
      }}
      style={{
        filter: 'brightness(0) invert(1)',
        opacity: 0.92,
        display: 'block',
      }}
    />
  );
}
