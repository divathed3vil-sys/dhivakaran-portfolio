'use client';

import { useMemo, useState } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from 'cmdk';
import {
  Smartphone, Mic, Brain, Palette, Database,
  Layout, Image as ImageIcon, Clapperboard, Sparkles, Wand2, Brush, PenTool, Music,
  Layers, Film, Aperture, SlidersHorizontal, Box, Frame,
  Code, AppWindow, Terminal, Cpu, Wrench, Settings, SmartphoneCharging,
  Star, Camera, Video, Play, Scissors, Type, Grid3x3, Server,
  Cog, BookOpen, Pencil, Printer, Headphones, Volume2, Lightbulb,
  Github, Cloud, HardDrive, Monitor, Keyboard, Globe, FileCode,
  type LucideIcon,
} from 'lucide-react';

/**
 * IconPicker — searchable command palette for choosing a Lucide icon.
 *
 * Curated registry of ~50 icons relevant to design / development / filmmaking
 * / hardware. Live preview at the top. Click an icon → calls onSelect(name)
 * + closes. Falls back to the existing selection on Escape.
 *
 * The list is intentionally NOT the full lucide icon set — that would be
 * ~1500 icons (huge bundle). This curated list covers every experiences
 * use-case in the seed + leaves room for new entries the admin adds.
 */
const ICONS: { name: string; component: LucideIcon; keywords: string[] }[] = [
  { name: 'Smartphone', component: Smartphone, keywords: ['mobile', 'phone', 'app', 'flutter'] },
  { name: 'Mic', component: Mic, keywords: ['audio', 'sound', 'voice', 'foley'] },
  { name: 'Brain', component: Brain, keywords: ['ai', 'llm', 'ml', 'intelligence'] },
  { name: 'Palette', component: Palette, keywords: ['color', 'paint', 'grade'] },
  { name: 'Database', component: Database, keywords: ['storage', 'backend', 'sql', 'supabase'] },
  { name: 'Layout', component: Layout, keywords: ['poster', 'design', 'composition'] },
  { name: 'Image', component: ImageIcon, keywords: ['picture', 'thumbnail', 'photo'] },
  { name: 'Clapperboard', component: Clapperboard, keywords: ['film', 'video', 'edit', 'shoot'] },
  { name: 'Sparkles', component: Sparkles, keywords: ['motion', 'magic', 'effect'] },
  { name: 'Wand2', component: Wand2, keywords: ['magic', 'effect', 'vfx', 'wand'] },
  { name: 'Brush', component: Brush, keywords: ['paint', 'art', 'illustration'] },
  { name: 'PenTool', component: PenTool, keywords: ['vector', 'illustrator', 'logo', 'draw'] },
  { name: 'Music', component: Music, keywords: ['audio', 'sound', 'foley', 'note'] },
  { name: 'Layers', component: Layers, keywords: ['photoshop', 'composite', 'stack'] },
  { name: 'Film', component: Film, keywords: ['movie', 'premiere', 'edit', 'cinema'] },
  { name: 'Aperture', component: Aperture, keywords: ['camera', 'photo', 'after effects'] },
  { name: 'SlidersHorizontal', component: SlidersHorizontal, keywords: ['adjust', 'davinci', 'grade'] },
  { name: 'Box', component: Box, keywords: ['3d', 'blender', 'model'] },
  { name: 'Frame', component: Frame, keywords: ['composition', 'layout', 'border'] },
  { name: 'Code', component: Code, keywords: ['python', 'script', 'dev'] },
  { name: 'AppWindow', component: AppWindow, keywords: ['app', 'window', 'ui'] },
  { name: 'Terminal', component: Terminal, keywords: ['linux', 'shell', 'cli'] },
  { name: 'Cpu', component: Cpu, keywords: ['hardware', 'processor', 'chip'] },
  { name: 'Wrench', component: Wrench, keywords: ['repair', 'tool', 'fix'] },
  { name: 'Settings', component: Settings, keywords: ['config', 'os', 'system'] },
  { name: 'SmartphoneCharging', component: SmartphoneCharging, keywords: ['mobile', 'repair', 'battery'] },
  { name: 'Star', component: Star, keywords: ['featured', 'favorite', 'top'] },
  { name: 'Camera', component: Camera, keywords: ['photo', 'shoot', 'film'] },
  { name: 'Video', component: Video, keywords: ['movie', 'record', 'film'] },
  { name: 'Play', component: Play, keywords: ['play', 'media', 'start'] },
  { name: 'Scissors', component: Scissors, keywords: ['cut', 'edit', 'trim'] },
  { name: 'Type', component: Type, keywords: ['typography', 'text', 'font'] },
  { name: 'Grid3x3', component: Grid3x3, keywords: ['grid', 'layout', 'cells'] },
  { name: 'Server', component: Server, keywords: ['backend', 'hosting', 'api'] },
  { name: 'Cog', component: Cog, keywords: ['settings', 'config', 'gear'] },
  { name: 'BookOpen', component: BookOpen, keywords: ['book', 'read', 'cover'] },
  { name: 'Pencil', component: Pencil, keywords: ['edit', 'write', 'draw'] },
  { name: 'Printer', component: Printer, keywords: ['print', 'output', 'paper'] },
  { name: 'Headphones', component: Headphones, keywords: ['audio', 'listen', 'sound'] },
  { name: 'Volume2', component: Volume2, keywords: ['audio', 'sound', 'volume'] },
  { name: 'Lightbulb', component: Lightbulb, keywords: ['idea', 'insight', 'light'] },
  { name: 'Github', component: Github, keywords: ['git', 'code', 'repo'] },
  { name: 'Cloud', component: Cloud, keywords: ['cloud', 'hosting', 'web'] },
  { name: 'HardDrive', component: HardDrive, keywords: ['storage', 'disk', 'drive'] },
  { name: 'Monitor', component: Monitor, keywords: ['display', 'screen', 'desktop'] },
  { name: 'Keyboard', component: Keyboard, keywords: ['input', 'type', 'keys'] },
  { name: 'Globe', component: Globe, keywords: ['web', 'internet', 'world'] },
  { name: 'FileCode', component: FileCode, keywords: ['file', 'code', 'script'] },
];

export function IconPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICONS;
    return ICONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  const SelectedPreview = ICONS.find((i) => i.name === value)?.component || Box;

  return (
    <div
      role="dialog"
      aria-label="Pick an icon"
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
          width: 'min(420px, 90vw)',
          maxHeight: 'min(560px, 80vh)',
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
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <SelectedPreview size={28} strokeWidth={1.5} color="var(--accent)" />
          <div style={{ flex: 1 }}>
            <div
              className="text-mono text-label"
              style={{ color: 'var(--night-muted)', marginBottom: '0.15rem' }}
            >
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
            aria-label="Close icon picker"
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

        {/* Command palette */}
        <Command
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <CommandInput
            placeholder="Search icons (e.g. 'film', 'audio', 'ai')…"
            value={query}
            onValueChange={setQuery}
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              border: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.9rem',
              padding: '0.75rem 1.25rem',
              outline: 'none',
            }}
          />
          <CommandList
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem',
              // Custom scrollbar — hidden to match site aesthetic
              scrollbarWidth: 'none',
            } as React.CSSProperties}
          >
            <CommandEmpty
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--night-muted)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.85rem',
              }}
            >
              No icons match “{query}”.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((icon) => {
                const Cmp = icon.component;
                return (
                  <CommandItem
                    key={icon.name}
                    value={`${icon.name} ${icon.keywords.join(' ')}`}
                    onSelect={() => onSelect(icon.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.55rem 0.7rem',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      color: 'var(--canvas)',
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: '0.85rem',
                      transition: 'background 0.2s var(--ease-spring-soft)',
                    }}
                  >
                    <Cmp size={20} strokeWidth={1.5} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{icon.name}</span>
                    {icon.name === value && (
                      <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>●</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

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
          ↑↓ navigate · enter select · esc close
        </div>
      </div>
    </div>
  );
}
