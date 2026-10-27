'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Smartphone, Mic, Brain, Palette, Database,
  Layout, Image as ImageIcon, Clapperboard, Sparkles, Wand2, Brush, PenTool, Music,
  Layers, Film, Aperture, SlidersHorizontal, Box, Frame,
  Code, AppWindow, Terminal, Cpu, Wrench, Settings, SmartphoneCharging,
  Star, Plus, Trash2, Pencil, GripVertical,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type Experience,
  type ExperienceCategory,
  type ExperiencesData,
} from '@/lib/experiences-data';
import { StudioDetailPanel } from './studio-detail-panel';
import { IconPicker } from './icon-picker';

/**
 * ExperiencesTab — Studio admin UI for the experiences section.
 *
 * Workflow:
 *   1. On mount, fetches current experiences via React Query → GET /api/experiences
 *   2. Admin edits are stored in a draft (per-id overrides + new ids + deleted ids).
 *      The draft is the source of truth for the UI; server data is the baseline.
 *   3. Save in DetailPanel → updates draft (NOT yet published).
 *   4. "Publish Changes" button → POST /api/experiences with merged array +
 *      Authorization header (Supabase access token from current session).
 *   5. API route verifies admin → commits JSON to GitHub → triggers Vercel deploy.
 *   6. Studio polls GET /api/experiences/status?deployId=X every 3s until READY.
 *   7. On READY: invalidate experiences query (refetch from new deploy) + show
 *      "✓ Live" indicator + clear draft.
 *
 * Layout matches existing Studio tabs (3-pane glass aesthetic):
 *   - Filter row (All / 01 / 02 / 03) + Add New button
 *   - Grid of cards (drag-drop reorder within phase)
 *   - "Publish Changes" button + status row at bottom
 *   - StudioDetailPanel slides in from right for add/edit
 */
type Filter = 'all' | ExperienceCategory;

type PublishState =
  | { phase: 'idle' }
  | { phase: 'committing'; msg: string }
  | { phase: 'deploying'; deployId: string; msg: string }
  | { phase: 'building'; deployId: string; msg: string }
  | { phase: 'ready'; deployId: string; msg: string }
  | { phase: 'error'; msg: string };

const PHASE_LABELS: Record<ExperienceCategory, string> = {
  exposed: '01 / EXPOSED',
  development: '02 / IN DEVELOPMENT',
  fixed: '03 / FIXED & PRINTED',
};

export function ExperiencesTab() {
  const queryClient = useQueryClient();
  const { data: serverData, isLoading } = useQuery<ExperiencesData>({
    queryKey: ['experiences'],
    queryFn: async () => {
      const res = await fetch('/api/experiences', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    },
  });

  // ---- Draft state (NOT yet published) ----
  const [overrides, setOverrides] = useState<Record<string, Experience>>({});
  const [newIds, setNewIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [orderOverrides, setOrderOverrides] = useState<Record<ExperienceCategory, string[]>>({
    exposed: [],
    development: [],
    fixed: [],
  });

  // ---- UI state ----
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>({ phase: 'idle' });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Merge server data + draft ----
  const mergedExperiences: Experience[] = useMemo(() => {
    const base = (serverData?.experiences || []).filter((e) => !deletedIds.has(e.id));
    const baseWithOverrides = base.map((e) => overrides[e.id] || e);
    const newOnes = newIds.map((id) => overrides[id]).filter(Boolean);
    return [...baseWithOverrides, ...newOnes];
  }, [serverData, overrides, newIds, deletedIds]);

  // Sort by priority DESC (matches public rendering)
  const sortedExperiences = useMemo(
    () => [...mergedExperiences].sort((a, b) => b.priority - a.priority),
    [mergedExperiences]
  );

  const byCategory: Record<ExperienceCategory, Experience[]> = {
    exposed: sortedExperiences.filter((e) => e.category === 'exposed'),
    development: sortedExperiences.filter((e) => e.category === 'development'),
    fixed: sortedExperiences.filter((e) => e.category === 'fixed'),
  };

  // Apply order overrides (drag-drop) on top of priority sort
  const orderedByCategory: Record<ExperienceCategory, Experience[]> = useMemo(() => {
    const result: Record<ExperienceCategory, Experience[]> = {
      exposed: [],
      development: [],
      fixed: [],
    };
    (['exposed', 'development', 'fixed'] as ExperienceCategory[]).forEach((cat) => {
      const order = orderOverrides[cat];
      if (order && order.length > 0) {
        // Use order from drag-drop, fall back to remaining items in priority order
        const remaining = [...byCategory[cat]];
        const ordered: Experience[] = [];
        order.forEach((id) => {
          const idx = remaining.findIndex((e) => e.id === id);
          if (idx >= 0) {
            ordered.push(remaining.splice(idx, 1)[0]);
          }
        });
        result[cat] = [...ordered, ...remaining];
      } else {
        result[cat] = byCategory[cat];
      }
    });
    return result;
  }, [byCategory, orderOverrides]);

  const visibleExperiences = useMemo(() => {
    if (filter === 'all') {
      return [
        ...orderedByCategory.exposed,
        ...orderedByCategory.development,
        ...orderedByCategory.fixed,
      ];
    }
    return orderedByCategory[filter];
  }, [filter, orderedByCategory]);

  const pendingCount = useMemo(() => {
    let n = 0;
    n += Object.keys(overrides).length;
    n += newIds.length;
    n += deletedIds.size;
    // Count order overrides (non-empty arrays = changes)
    (['exposed', 'development', 'fixed'] as ExperienceCategory[]).forEach((cat) => {
      if (orderOverrides[cat].length > 0) n++;
    });
    return n;
  }, [overrides, newIds, deletedIds, orderOverrides]);

  // ---- Sensors for drag-drop ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ---- Handlers ----
  const handleDragEnd = (cat: ExperienceCategory, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = orderOverrides[cat].length > 0
      ? orderOverrides[cat]
      : orderedByCategory[cat].map((e) => e.id);
    const oldIndex = current.indexOf(active.id as string);
    const newIndex = current.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(current, oldIndex, newIndex);
    setOrderOverrides((prev) => ({ ...prev, [cat]: next }));
  };

  const handleSaveExisting = (id: string, patch: Experience) => {
    setOverrides((prev) => ({ ...prev, [id]: patch }));
    setEditingId(null);
  };

  const handleSaveNew = (exp: Experience) => {
    setOverrides((prev) => ({ ...prev, [exp.id]: exp }));
    setNewIds((prev) => [...prev, exp.id]);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (newIds.includes(id)) {
      // It's a new draft — just remove from overrides + newIds
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setNewIds((prev) => prev.filter((x) => x !== id));
    } else {
      // Existing — mark for deletion
      setDeletedIds((prev) => new Set([...prev, id]));
    }
    setEditingId(null);
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
  };

  // ---- Publish flow ----
  const handlePublish = async () => {
    if (publishState.phase !== 'idle' && publishState.phase !== 'error' && publishState.phase !== 'ready') return;
    if (pendingCount === 0) return;

    setPublishState({ phase: 'committing', msg: 'Committing to GitHub…' });

    // Build the final payload: re-assign priorities based on current order
    // (highest first = appears first within each category)
    const allInOrder: Experience[] = [
      ...orderedByCategory.exposed,
      ...orderedByCategory.development,
      ...orderedByCategory.fixed,
    ];
    const total = allInOrder.length;
    const remapped: Experience[] = allInOrder.map((e, idx) => ({
      ...e,
      priority: total - idx,
      updatedAt: new Date().toISOString(),
    }));

    const payload: ExperiencesData = {
      version: serverData?.version ?? 1,
      updatedAt: new Date().toISOString(),
      experiences: remapped,
    };

    // Get the admin's Supabase access token from the current session
    if (!supabase) {
      setPublishState({ phase: 'error', msg: 'Supabase client not configured' });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setPublishState({ phase: 'error', msg: 'No active session — re-login to Studio' });
      return;
    }

    try {
      const res = await fetch('/api/experiences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setPublishState({ phase: 'error', msg: result.reason || `HTTP ${res.status}` });
        return;
      }

      // Now poll the Vercel deploy status
      setPublishState({
        phase: 'deploying',
        deployId: result.deploymentId,
        msg: `Deploy triggered (commit ${result.commitSha.slice(0, 7)})…`,
      });

      // Poll every 3s for up to 3 min (60 polls)
      let pollCount = 0;
      const maxPolls = 60;
      const poll = async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          setPublishState({
            phase: 'error',
            msg: 'Polling timed out — check Vercel dashboard. Commit may still be live.',
          });
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        try {
          const statusRes = await fetch(
            `/api/experiences/status?deployId=${result.deploymentId}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: 'no-store',
            }
          );
          const status = await statusRes.json();
          if (!status.ok) {
            setPublishState({ phase: 'error', msg: status.reason });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
          }
          const state = status.readyState;
          if (state === 'READY') {
            setPublishState({
              phase: 'ready',
              deployId: result.deploymentId,
              msg: `✓ Live — published ${remapped.length} experiences`,
            });
            // Invalidate + refetch from new deploy
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            // Clear draft (server data is now the source of truth)
            setOverrides({});
            setNewIds([]);
            setDeletedIds(new Set());
            setOrderOverrides({ exposed: [], development: [], fixed: [] });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            // Auto-clear "ready" indicator after 8s
            setTimeout(() => {
              setPublishState({ phase: 'idle' });
            }, 8000);
          } else if (state === 'ERROR' || state === 'CANCELED') {
            setPublishState({
              phase: 'error',
              msg: `Deploy ${state.toLowerCase()} — see Vercel dashboard`,
            });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (state === 'BUILDING' || state === 'NORMALIZING') {
            setPublishState({
              phase: 'building',
              deployId: result.deploymentId,
              msg: `Building… (${pollCount * 3}s elapsed)`,
            });
          }
          // INITIALIZING, QUEUED, etc — keep polling silently
        } catch (e) {
          // Network blip — keep polling, don't error yet
          if (pollCount >= maxPolls) {
            setPublishState({ phase: 'error', msg: `Polling failed: ${(e as Error).message}` });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      };
      // First poll immediately, then every 3s
      await poll();
      pollIntervalRef.current = setInterval(poll, 3000);
    } catch (e) {
      setPublishState({ phase: 'error', msg: `Publish error: ${(e as Error).message}` });
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ---- Currently editing target ----
  const editingExp = editingId
    ? mergedExperiences.find((e) => e.id === editingId) || null
    : null;

  if (isLoading) {
    return <div style={{ color: 'var(--night-muted)', padding: '2rem' }}>Loading experiences…</div>;
  }

  return (
    <div style={{ paddingBottom: '5rem' }}>
      {/* ── FILTER ROW ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={mergedExperiences.length} />
        <FilterPill active={filter === 'exposed'} onClick={() => setFilter('exposed')} label="01 Exposed" count={byCategory.exposed.length} accent />
        <FilterPill active={filter === 'development'} onClick={() => setFilter('development')} label="02 Dev" count={byCategory.development.length} />
        <FilterPill active={filter === 'fixed'} onClick={() => setFilter('fixed')} label="03 Fixed" count={byCategory.fixed.length} />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAddNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.9rem',
            borderRadius: '3px',
            border: '1px solid var(--accent)',
            background: 'rgba(214,41,41,0.1)',
            color: 'var(--canvas)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'background 0.3s var(--ease-spring-soft)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.1)'; }}
        >
          <Plus size={14} strokeWidth={1.5} /> Add New
        </button>
      </div>

      {/* ── DELETED ITEMS BAR (if any) ── */}
      {deletedIds.size > 0 && (
        <div
          style={{
            padding: '0.7rem 1rem',
            marginBottom: '1rem',
            background: 'rgba(214,41,41,0.08)',
            border: '1px dashed rgba(214,41,41,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap',
          }}
        >
          <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>
            {deletedIds.size} marked for deletion:
          </span>
          {Array.from(deletedIds).map((id) => {
            const exp = serverData?.experiences.find((e) => e.id === id);
            return (
              <button
                key={id}
                onClick={() => handleUndoDelete(id)}
                style={{
                  padding: '0.2rem 0.55rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--night-muted)',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                ↺ {exp?.title?.slice(0, 24) || id}
              </button>
            );
          })}
        </div>
      )}

      {/* ── CARDS GRID (per phase if filter=all, single phase otherwise) ── */}
      {filter === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {(['exposed', 'development', 'fixed'] as ExperienceCategory[]).map((cat) => (
            <PhaseSection
              key={cat}
              category={cat}
              experiences={orderedByCategory[cat]}
              onDragEnd={(e) => handleDragEnd(cat, e)}
              sensors={sensors}
              onEdit={(id) => { setEditingId(id); setIsAdding(false); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <PhaseSection
          category={filter}
          experiences={orderedByCategory[filter]}
          onDragEnd={(e) => handleDragEnd(filter, e)}
          sensors={sensors}
          onEdit={(id) => { setEditingId(id); setIsAdding(false); }}
          onDelete={handleDelete}
        />
      )}

      {/* ── PUBLISH BAR (sticky at bottom of tab) ── */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          marginTop: '2rem',
          padding: '0.85rem 1.25rem',
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ flex: 1, fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', color: 'var(--night-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {publishState.phase === 'idle' && pendingCount === 0 && (
            <>● All changes published — last update {new Date(serverData?.updatedAt || Date.now()).toLocaleString()}</>
          )}
          {publishState.phase === 'idle' && pendingCount > 0 && (
            <span style={{ color: 'var(--accent-soft)' }}>● {pendingCount} pending change{pendingCount === 1 ? '' : 's'}</span>
          )}
          {publishState.phase !== 'idle' && (
            <span style={{ color: 'var(--accent)' }}>● {publishState.msg}</span>
          )}
        </div>
        <button
          onClick={handlePublish}
          disabled={pendingCount === 0 || !['idle', 'error', 'ready'].includes(publishState.phase)}
          style={{
            padding: '0.55rem 1.2rem',
            borderRadius: '3px',
            border: '1px solid var(--accent)',
            background: pendingCount === 0 ? 'transparent' : 'var(--accent)',
            color: 'var(--canvas)',
            cursor: pendingCount === 0 ? 'not-allowed' : 'pointer',
            opacity: pendingCount === 0 || !['idle', 'error', 'ready'].includes(publishState.phase) ? 0.5 : 1,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'background 0.3s var(--ease-spring-soft)',
          }}
        >
          {publishState.phase === 'idle' || publishState.phase === 'ready' || publishState.phase === 'error'
            ? `Publish Changes${pendingCount > 0 ? ` (${pendingCount})` : ''}`
            : publishState.phase === 'committing' ? 'Committing…' : 'Deploying…'}
        </button>
      </div>

      {/* ── DETAIL PANEL (slide-in for edit/add) ── */}
      {(editingId || isAdding) && (
        <ExperiencesDetailPanel
          experience={editingExp}
          onSaveExisting={handleSaveExisting}
          onSaveNew={handleSaveNew}
          onClose={() => { setEditingId(null); setIsAdding(false); }}
          onOpenIconPicker={(targetId) => setIconPickerFor(targetId)}
          onDelete={editingExp ? () => handleDelete(editingExp.id) : undefined}
        />
      )}

      {/* ── ICON PICKER ── */}
      {iconPickerFor && (
        <IconPicker
          value={
            iconPickerFor === 'new'
              ? (overrides['__new_draft__']?.icon || 'Box')
              : (overrides[iconPickerFor]?.icon || mergedExperiences.find((e) => e.id === iconPickerFor)?.icon || 'Box')
          }
          onSelect={(name) => {
            if (iconPickerFor === 'new') {
              // Update the new-draft override
              setOverrides((prev) => ({
                ...prev,
                __new_draft__: {
                  ...(prev.__new_draft__ || {}),
                  icon: name,
                } as Experience,
              }));
            } else {
              // Update existing draft's icon field directly (without full save)
              const target = mergedExperiences.find((e) => e.id === iconPickerFor);
              if (target) {
                setOverrides((prev) => ({
                  ...prev,
                  [iconPickerFor]: { ...(prev[iconPickerFor] || target), icon: name },
                }));
              }
            }
            setIconPickerFor(null);
          }}
          onClose={() => setIconPickerFor(null)}
        />
      )}
    </div>
  );
}

// ---------- Filter pill ----------

function FilterPill({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.8rem',
        borderRadius: '3px',
        border: 'none',
        color: active ? 'var(--canvas)' : 'var(--night-muted)',
        background: active
          ? (accent ? 'rgba(214,41,41,0.2)' : 'rgba(255,255,255,0.08)')
          : 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: '0.7rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        transition: 'background 0.3s var(--ease-spring-soft), color 0.3s var(--ease-spring-soft)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {label}
      <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{count}</span>
    </button>
  );
}

// ---------- Phase section (renders a single phase's cards with drag-drop) ----------

function PhaseSection({
  category,
  experiences,
  onDragEnd,
  sensors,
  onEdit,
  onDelete,
}: {
  category: ExperienceCategory;
  experiences: Experience[];
  onDragEnd: (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (experiences.length === 0) return null;

  return (
    <div>
      {/* Phase header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>
          {PHASE_LABELS[category]}
        </span>
        <span className="text-mono text-label" style={{ color: 'var(--night-muted)' }}>
          {experiences.length} item{experiences.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Drag-drop sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={experiences.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {experiences.map((exp, idx) => (
              <SortableExperienceCard
                key={exp.id}
                exp={exp}
                index={idx}
                onEdit={() => onEdit(exp.id)}
                onDelete={() => onDelete(exp.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- Sortable card ----------

function SortableExperienceCard({
  exp,
  index,
  onEdit,
  onDelete,
}: {
  exp: Experience;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exp.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
      }}
    >
      <div
        className="studio-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'var(--night-soft)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          transition: 'background 0.3s var(--ease-spring-soft), border-color 0.3s var(--ease-spring-soft)',
        }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          style={{
            cursor: 'grab',
            background: 'transparent',
            border: 'none',
            color: 'var(--night-muted)',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <GripVertical size={16} strokeWidth={1.5} />
        </button>

        {/* Index badge */}
        <span
          className="text-mono text-label"
          style={{
            color: 'var(--accent)',
            opacity: 0.7,
            minWidth: '2.2rem',
          }}
        >
          N°{String(index + 1).padStart(2, '0')}
        </span>

        {/* Featured star */}
        {exp.featured && exp.category === 'exposed' && (
          <Star size={14} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
        )}

        {/* Title + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              fontSize: '1rem',
              color: 'var(--canvas)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: exp.published ? 1 : 0.5,
            }}
          >
            {exp.title}
            {!exp.published && (
              <span className="text-mono text-label" style={{ color: 'var(--night-muted)', marginLeft: '0.5rem' }}>
                (unpublished)
              </span>
            )}
          </div>
          <div
            className="text-mono text-label"
            style={{ color: 'var(--night-muted)', marginTop: '0.15rem', fontSize: '0.65rem' }}
          >
            {exp.status} · {exp.category}
          </div>
        </div>

        {/* Tags (compact) */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: '30%' }}>
          {exp.tags.slice(0, 3).map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.6rem',
                color: 'var(--night-muted)',
                padding: '0.15rem 0.4rem',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '2px',
              }}
            >
              {tag.startsWith('#') ? tag.slice(0, 8) : `#${tag.slice(0, 7)}`}
            </span>
          ))}
        </div>

        {/* Hover-reveal actions */}
        <div className="studio-hover-reveal" style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={onEdit}
            aria-label="Edit"
            style={{
              padding: '0.3rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--canvas)',
              cursor: 'pointer',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.2s var(--ease-spring-soft)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Pencil size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            style={{
              padding: '0.3rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--accent)',
              cursor: 'pointer',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.2s var(--ease-spring-soft)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Detail panel for edit + add ----------

function ExperiencesDetailPanel({
  experience,
  onSaveExisting,
  onSaveNew,
  onClose,
  onOpenIconPicker,
  onDelete,
}: {
  experience: Experience | null;
  onSaveExisting: (id: string, patch: Experience) => void;
  onSaveNew: (exp: Experience) => void;
  onClose: () => void;
  onOpenIconPicker: (targetId: string) => void;
  onDelete?: () => void;
}) {
  const isEdit = !!experience;
  const [draft, setDraft] = useState<Experience>(
    experience || {
      id: `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      category: 'exposed' as ExperienceCategory,
      status: '2026 — Present',
      description: '',
      icon: 'Box',
      tags: [],
      priority: 50,
      featured: false,
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
  const [tagInput, setTagInput] = useState('');

  // For mobile detection (Studio uses 768px breakpoint)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const update = (patch: Partial<Experience>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (draft.tags.includes(t)) { setTagInput(''); return; }
    update({ tags: [...draft.tags, t] });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    update({ tags: draft.tags.filter((t) => t !== tag) });
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    if (isEdit && experience) {
      onSaveExisting(experience.id, draft);
    } else {
      onSaveNew(draft);
    }
  };

  return (
    <StudioDetailPanel
      title={isEdit ? draft.title || 'Edit Experience' : 'Add New Experience'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={isEdit ? onDelete : undefined}
      isMobile={isMobile}
      preview={
        <div
          style={{
            padding: '1rem',
            background: 'rgba(22,22,22,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <button
            onClick={() => onOpenIconPicker(isEdit ? draft.id : 'new')}
            style={{
              padding: 0,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: draft.category === 'exposed' ? 'var(--accent)' : draft.category === 'development' ? 'var(--canvas)' : 'var(--night-muted)',
            }}
            aria-label="Change icon"
          >
            <PreviewIcon name={draft.icon} size={32} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 500,
                fontSize: '1.05rem',
                color: 'var(--canvas)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {draft.title || 'Untitled'}
            </div>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginTop: '0.15rem' }}>
              {draft.status || 'No status'}
            </div>
          </div>
        </div>
      }
    >
      <Field label="Title">
        <input
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Flutter App Development"
          style={inputStyle}
          autoFocus={!isEdit}
        />
      </Field>

      <Field label="Category">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['exposed', 'development', 'fixed'] as ExperienceCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => update({ category: c, featured: c === 'exposed' ? draft.featured : false })}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: draft.category === c ? 'rgba(214,41,41,0.15)' : 'transparent',
                border: `1px solid ${draft.category === c ? 'var(--accent)' : 'var(--night-hr)'}`,
                color: draft.category === c ? 'var(--canvas)' : 'var(--night-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '2px',
                transition: 'background 0.2s var(--ease-spring-soft)',
              }}
            >
              {c === 'exposed' ? '01 Exp' : c === 'development' ? '02 Dev' : '03 Fix'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Status">
        <input
          value={draft.status}
          onChange={(e) => update({ status: e.target.value })}
          placeholder="2026 — Present"
          style={inputStyle}
        />
      </Field>

      <Field label="Description">
        <textarea
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="One or two sentences describing this experience."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-fraunces), serif', fontSize: '0.95rem' }}
        />
      </Field>

      <Field label="Icon">
        <button
          onClick={() => onOpenIconPicker(isEdit ? draft.id : 'new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--night)',
            border: '1.5px solid var(--night-hr)',
            color: 'var(--canvas)',
            cursor: 'pointer',
            borderRadius: '2px',
            width: '100%',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.85rem',
            transition: 'border-color 0.2s var(--ease-spring-soft)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }}
        >
          <PreviewIcon name={draft.icon} size={18} />
          <span style={{ flex: 1, textAlign: 'left' }}>{draft.icon}</span>
          <span style={{ color: 'var(--night-muted)', fontSize: '0.7rem' }}>Change →</span>
        </button>
      </Field>

      <Field label="Tags">
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
          {draft.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.55rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--night-body)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.7rem',
                borderRadius: '2px',
              }}
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
              <button
                onClick={() => handleRemoveTag(tag)}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: 'var(--night-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove tag ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag();
            }
          }}
          placeholder="Type a tag + Enter (e.g. DART)"
          style={inputStyle}
        />
      </Field>

      <Field label="Featured (spotlight card — EXPOSED only)">
        <button
          onClick={() => update({ featured: !draft.featured })}
          disabled={draft.category !== 'exposed'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: draft.featured ? 'rgba(214,41,41,0.15)' : 'transparent',
            border: `1.5px solid ${draft.featured ? 'var(--accent)' : 'var(--night-hr)'}`,
            color: draft.featured ? 'var(--accent)' : 'var(--night-muted)',
            cursor: draft.category === 'exposed' ? 'pointer' : 'not-allowed',
            opacity: draft.category === 'exposed' ? 1 : 0.4,
            borderRadius: '2px',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <Star size={14} strokeWidth={1.5} style={{ color: draft.featured ? 'var(--accent)' : 'var(--night-muted)' }} />
          {draft.featured ? 'Featured — wide spotlight card' : 'Not featured'}
        </button>
      </Field>

      <Field label="Published">
        <button
          onClick={() => update({ published: !draft.published })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: draft.published ? 'rgba(214,41,41,0.15)' : 'transparent',
            border: `1.5px solid ${draft.published ? 'var(--accent)' : 'var(--night-hr)'}`,
            color: draft.published ? 'var(--canvas)' : 'var(--night-muted)',
            cursor: 'pointer',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: draft.published ? 'var(--accent)' : 'var(--night-muted)',
          }} />
          {draft.published ? 'Public — visible on site' : 'Hidden — draft only'}
        </button>
      </Field>
    </StudioDetailPanel>
  );
}

// ---------- Field wrapper ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label
        className="text-mono text-label"
        style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.4rem' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------- Preview icon (uses the consolidated lucide imports from top) ----------

const PREVIEW_ICONS: Record<string, LucideIcon> = {
  Smartphone, Mic, Brain, Palette, Database,
  Layout, Image: ImageIcon, Clapperboard, Sparkles, Wand2, Brush, PenTool, Music,
  Layers, Film, Aperture, SlidersHorizontal, Box, Frame,
  Code, AppWindow, Terminal, Cpu, Wrench, Settings, SmartphoneCharging,
  Star,
};

function PreviewIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Cmp = PREVIEW_ICONS[name] || Box;
  return <Cmp size={size} strokeWidth={1.5} />;
}

// ---------- Shared input style ----------

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--night)',
  border: '1.5px solid var(--night-hr)',
  color: 'var(--canvas)',
  padding: '0.5rem 0.7rem',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '0.85rem',
  outline: 'none',
  borderRadius: '2px',
  transition: 'border-color 0.2s var(--ease-spring-soft)',
};
