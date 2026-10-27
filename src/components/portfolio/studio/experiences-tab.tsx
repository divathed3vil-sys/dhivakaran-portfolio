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
  Aperture, Terminal, Layout, Image as ImageIcon, Clapperboard, Sparkles, Wand2,
  Brush, PenTool, Music, Frame, Palette, Mic, Smartphone, Brain, Database,
  Code, AppWindow, Cpu, Wrench, Settings, SmartphoneCharging, Box,
  Star, Plus, Trash2, Pencil, GripVertical,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type Category,
  type Experience,
  type Software,
  type ExperiencesData,
  getSoftwareIconUrl,
  getMasteryLabel,
} from '@/lib/experiences-data';
import { StudioDetailPanel } from './studio-detail-panel';
import { IconPicker } from './icon-picker';
import { SoftwareIconPicker } from './software-icon-picker';

/**
 * ExperiencesTab v2 — Studio admin for the v2 schema (categories[] +
 * experiences[] + software[]).
 *
 * Workflow:
 *   1. React Query fetches serverData (categories[] + experiences[] + software[])
 *   2. Admin edits stored in draft (per-id overrides + new ids + deleted ids
 *      + order overrides per category)
 *   3. Save in DetailPanel → updates draft (NOT yet published)
 *   4. "Publish Changes" → POST /api/experiences with merged v2 payload +
 *      Authorization header (Supabase access token)
 *   5. API route verifies admin → commits JSON to GitHub → triggers Vercel
 *      deploy → returns deploymentId
 *   6. Studio polls /api/experiences/status?deployId=X every 3s until READY
 *   7. On READY: invalidate experiences query + clear draft
 *
 * UI structure:
 *   - Category pills row (click to filter, drag to reorder, ✎ to rename, + to add)
 *   - Selected category content:
 *     - EXPERIENCES sub-section (sortable list with edit/delete + add)
 *     - SOFTWARE sub-section (sortable list with progress + edit/delete + add)
 *   - Sticky publish bar
 *   - DetailPanel (slide-in) for editing experience/software/category
 *   - SoftwareIconPicker modal (opens from software DetailPanel)
 *   - IconPicker modal (opens from experience DetailPanel)
 */

const ICONS: Record<string, LucideIcon> = {
  Aperture, Terminal, Layout, Image: ImageIcon, Clapperboard, Sparkles, Wand2,
  Brush, PenTool, Music, Frame, Palette, Mic, Smartphone, Brain, Database,
  Code, AppWindow, Cpu, Wrench, Settings, SmartphoneCharging, Box,
};

function PreviewIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Cmp = ICONS[name] || Box;
  return <Cmp size={size} strokeWidth={1.5} />;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- Publish state machine ----------

type PublishState =
  | { phase: 'idle' }
  | { phase: 'committing'; msg: string }
  | { phase: 'deploying'; deployId: string; msg: string }
  | { phase: 'building'; deployId: string; msg: string }
  | { phase: 'ready'; deployId: string; msg: string }
  | { phase: 'error'; msg: string };

// ---------- Editing target (which entity is being edited) ----------

type EditingTarget =
  | { kind: 'experience'; id: string | null } // null = adding new
  | { kind: 'software'; id: string | null }
  | { kind: 'category'; id: string | null };

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

  // ---- Draft state ----
  const [catOverrides, setCatOverrides] = useState<Record<string, Category>>({});
  const [newCatIds, setNewCatIds] = useState<string[]>([]);
  const [deletedCatIds, setDeletedCatIds] = useState<Set<string>>(new Set());
  const [catOrderOverride, setCatOrderOverride] = useState<string[]>([]); // list of cat IDs in desired order

  const [expOverrides, setExpOverrides] = useState<Record<string, Experience>>({});
  const [newExpIds, setNewExpIds] = useState<string[]>([]);
  const [deletedExpIds, setDeletedExpIds] = useState<Set<string>>(new Set());
  const [expOrderOverrides, setExpOrderOverrides] = useState<Record<string, string[]>>({});

  const [swOverrides, setSwOverrides] = useState<Record<string, Software>>({});
  const [newSwIds, setNewSwIds] = useState<string[]>([]);
  const [deletedSwIds, setDeletedSwIds] = useState<Set<string>>(new Set());
  const [swOrderOverrides, setSwOrderOverrides] = useState<Record<string, string[]>>({});

  // ---- UI state ----
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [iconPickerFor, setIconPickerFor] = useState<{ kind: 'experience' | 'category'; id: string | null } | null>(null);
  const [swIconPickerFor, setSwIconPickerFor] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>({ phase: 'idle' });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Merge server + draft ----
  const mergedCategories: Category[] = useMemo(() => {
    const base = (serverData?.categories || []).filter((c) => !deletedCatIds.has(c.id));
    const withOverrides = base.map((c) => catOverrides[c.id] || c);
    const newOnes = newCatIds.map((id) => catOverrides[id]).filter(Boolean);
    const all = [...withOverrides, ...newOnes];
    // Apply order override if set
    if (catOrderOverride.length > 0) {
      const ordered: Category[] = [];
      const remaining = [...all];
      catOrderOverride.forEach((id) => {
        const idx = remaining.findIndex((c) => c.id === id);
        if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]);
      });
      return [...ordered, ...remaining];
    }
    return all.sort((a, b) => a.order - b.order);
  }, [serverData, catOverrides, newCatIds, deletedCatIds, catOrderOverride]);

  // Auto-select first category if none selected
  useEffect(() => {
    if (!selectedCatId && mergedCategories.length > 0) {
      setSelectedCatId(mergedCategories[0].id);
    }
  }, [mergedCategories, selectedCatId]);

  const selectedCategory = mergedCategories.find((c) => c.id === selectedCatId) || null;

  const mergedExperiences: Experience[] = useMemo(() => {
    if (!selectedCategory) return [];
    const base = (serverData?.experiences || [])
      .filter((e) => e.category_id === selectedCategory.id && !deletedExpIds.has(e.id));
    const withOverrides = base.map((e) => expOverrides[e.id] || e);
    const newOnes = newExpIds
      .map((id) => expOverrides[id])
      .filter(Boolean)
      .filter((e) => e.category_id === selectedCategory.id);
    const all = [...withOverrides, ...newOnes];
    const orderOverride = expOrderOverrides[selectedCategory.id];
    if (orderOverride && orderOverride.length > 0) {
      const ordered: Experience[] = [];
      const remaining = [...all];
      orderOverride.forEach((id) => {
        const idx = remaining.findIndex((e) => e.id === id);
        if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]);
      });
      return [...ordered, ...remaining];
    }
    return all.sort((a, b) => a.order - b.order);
  }, [serverData, expOverrides, newExpIds, deletedExpIds, expOrderOverrides, selectedCategory]);

  const mergedSoftware: Software[] = useMemo(() => {
    if (!selectedCategory) return [];
    const base = (serverData?.software || [])
      .filter((s) => s.category_id === selectedCategory.id && !deletedSwIds.has(s.id));
    const withOverrides = base.map((s) => swOverrides[s.id] || s);
    const newOnes = newSwIds
      .map((id) => swOverrides[id])
      .filter(Boolean)
      .filter((s) => s.category_id === selectedCategory.id);
    const all = [...withOverrides, ...newOnes];
    const orderOverride = swOrderOverrides[selectedCategory.id];
    if (orderOverride && orderOverride.length > 0) {
      const ordered: Software[] = [];
      const remaining = [...all];
      orderOverride.forEach((id) => {
        const idx = remaining.findIndex((s) => s.id === id);
        if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]);
      });
      return [...ordered, ...remaining];
    }
    return all.sort((a, b) => a.order - b.order);
  }, [serverData, swOverrides, newSwIds, deletedSwIds, swOrderOverrides, selectedCategory]);

  // ---- Pending count ----
  const pendingCount = useMemo(() => {
    let n = 0;
    n += Object.keys(catOverrides).length + newCatIds.length + deletedCatIds.size + (catOrderOverride.length > 0 ? 1 : 0);
    n += Object.keys(expOverrides).length + newExpIds.length + deletedExpIds.size + Object.keys(expOrderOverrides).length;
    n += Object.keys(swOverrides).length + newSwIds.length + deletedSwIds.size + Object.keys(swOrderOverrides).length;
    return n;
  }, [catOverrides, newCatIds, deletedCatIds, catOrderOverride, expOverrides, newExpIds, deletedExpIds, expOrderOverrides, swOverrides, newSwIds, deletedSwIds, swOrderOverrides]);

  // ---- Sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ---- Handlers ----
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = catOrderOverride.length > 0
      ? catOrderOverride
      : mergedCategories.map((c) => c.id);
    const oldIndex = current.indexOf(active.id as string);
    const newIndex = current.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    setCatOrderOverride(arrayMove(current, oldIndex, newIndex));
  };

  const handleExpDragEnd = (event: DragEndEvent) => {
    if (!selectedCategory) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = (expOrderOverrides[selectedCategory.id] && expOrderOverrides[selectedCategory.id].length > 0)
      ? expOrderOverrides[selectedCategory.id]
      : mergedExperiences.map((e) => e.id);
    const oldIndex = current.indexOf(active.id as string);
    const newIndex = current.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    setExpOrderOverrides((prev) => ({ ...prev, [selectedCategory.id]: arrayMove(current, oldIndex, newIndex) }));
  };

  const handleSwDragEnd = (event: DragEndEvent) => {
    if (!selectedCategory) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = (swOrderOverrides[selectedCategory.id] && swOrderOverrides[selectedCategory.id].length > 0)
      ? swOrderOverrides[selectedCategory.id]
      : mergedSoftware.map((s) => s.id);
    const oldIndex = current.indexOf(active.id as string);
    const newIndex = current.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    setSwOrderOverrides((prev) => ({ ...prev, [selectedCategory.id]: arrayMove(current, oldIndex, newIndex) }));
  };

  // Save handlers
  const handleSaveCategory = (cat: Category) => {
    setCatOverrides((prev) => ({ ...prev, [cat.id]: cat }));
    if (!mergedCategories.find((c) => c.id === cat.id) && !newCatIds.includes(cat.id)) {
      setNewCatIds((prev) => [...prev, cat.id]);
    }
    setEditingTarget(null);
  };

  const handleSaveExperience = (exp: Experience) => {
    setExpOverrides((prev) => ({ ...prev, [exp.id]: exp }));
    if (!mergedExperiences.find((e) => e.id === exp.id) && !newExpIds.includes(exp.id)) {
      setNewExpIds((prev) => [...prev, exp.id]);
    }
    setEditingTarget(null);
  };

  const handleSaveSoftware = (sw: Software) => {
    setSwOverrides((prev) => ({ ...prev, [sw.id]: sw }));
    if (!mergedSoftware.find((s) => s.id === sw.id) && !newSwIds.includes(sw.id)) {
      setNewSwIds((prev) => [...prev, sw.id]);
    }
    setEditingTarget(null);
  };

  // Delete handlers
  const handleDeleteCategory = (id: string) => {
    setDeletedCatIds((prev) => new Set([...prev, id]));
    if (newCatIds.includes(id)) {
      setNewCatIds((prev) => prev.filter((x) => x !== id));
      setCatOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
    setEditingTarget(null);
    if (selectedCatId === id) setSelectedCatId(null);
  };

  const handleDeleteExperience = (id: string) => {
    setDeletedExpIds((prev) => new Set([...prev, id]));
    if (newExpIds.includes(id)) {
      setNewExpIds((prev) => prev.filter((x) => x !== id));
      setExpOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
    setEditingTarget(null);
  };

  const handleDeleteSoftware = (id: string) => {
    setDeletedSwIds((prev) => new Set([...prev, id]));
    if (newSwIds.includes(id)) {
      setNewSwIds((prev) => prev.filter((x) => x !== id));
      setSwOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
    setEditingTarget(null);
  };

  // Undo delete
  const handleUndoDelete = (kind: 'category' | 'experience' | 'software', id: string) => {
    if (kind === 'category') setDeletedCatIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (kind === 'experience') setDeletedExpIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (kind === 'software') setDeletedSwIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  // ---- Publish flow (v2 payload) ----
  const handlePublish = async () => {
    if (publishState.phase !== 'idle' && publishState.phase !== 'error' && publishState.phase !== 'ready') return;
    if (pendingCount === 0) return;

    setPublishState({ phase: 'committing', msg: 'Committing to GitHub…' });

    // Build final v2 payload: re-map order values based on current drag-drop state
    const finalCategories = mergedCategories.map((c, idx) => ({ ...c, order: idx + 1 }));
    const finalExperiences: Experience[] = [];
    const finalSoftware: Software[] = [];

    mergedCategories.forEach((cat) => {
      // Experiences for this category — re-map order
      const exps = (serverData?.experiences || [])
        .filter((e) => e.category_id === cat.id && !deletedExpIds.has(e.id))
        .map((e) => expOverrides[e.id] || e);
      const expNews = newExpIds.map((id) => expOverrides[id]).filter(Boolean).filter((e) => e.category_id === cat.id);
      let allExps = [...exps, ...expNews];
      const expOrder = expOrderOverrides[cat.id];
      if (expOrder && expOrder.length > 0) {
        const ordered: Experience[] = [];
        const remaining = [...allExps];
        expOrder.forEach((id) => {
          const idx = remaining.findIndex((e) => e.id === id);
          if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]);
        });
        allExps = [...ordered, ...remaining];
      }
      allExps.forEach((e, idx) => finalExperiences.push({ ...e, order: idx + 1, updatedAt: new Date().toISOString() }));

      // Software for this category — re-map order
      const sws = (serverData?.software || [])
        .filter((s) => s.category_id === cat.id && !deletedSwIds.has(s.id))
        .map((s) => swOverrides[s.id] || s);
      const swNews = newSwIds.map((id) => swOverrides[id]).filter(Boolean).filter((s) => s.category_id === cat.id);
      let allSws = [...sws, ...swNews];
      const swOrder = swOrderOverrides[cat.id];
      if (swOrder && swOrder.length > 0) {
        const ordered: Software[] = [];
        const remaining = [...allSws];
        swOrder.forEach((id) => {
          const idx = remaining.findIndex((s) => s.id === id);
          if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]);
        });
        allSws = [...ordered, ...remaining];
      }
      allSws.forEach((s, idx) => finalSoftware.push({ ...s, order: idx + 1 }));
    });

    const payload: ExperiencesData = {
      version: 2,
      updatedAt: new Date().toISOString(),
      categories: finalCategories,
      experiences: finalExperiences,
      software: finalSoftware,
    };

    // Get admin session token
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

      setPublishState({
        phase: 'deploying',
        deployId: result.deploymentId,
        msg: `Deploy triggered (commit ${result.commitSha.slice(0, 7)})…`,
      });

      let pollCount = 0;
      const maxPolls = 60;
      const poll = async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          setPublishState({ phase: 'error', msg: 'Polling timed out — check Vercel dashboard' });
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        try {
          const statusRes = await fetch(`/api/experiences/status?deployId=${result.deploymentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          });
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
              msg: `✓ Live — published ${finalCategories.length} categories, ${finalExperiences.length} experiences, ${finalSoftware.length} software`,
            });
            queryClient.invalidateQueries({ queryKey: ['experiences'] });
            // Clear draft
            setCatOverrides({}); setNewCatIds([]); setDeletedCatIds(new Set()); setCatOrderOverride([]);
            setExpOverrides({}); setNewExpIds([]); setDeletedExpIds(new Set()); setExpOrderOverrides({});
            setSwOverrides({}); setNewSwIds([]); setDeletedSwIds(new Set()); setSwOrderOverrides({});
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setTimeout(() => setPublishState({ phase: 'idle' }), 8000);
          } else if (state === 'ERROR' || state === 'CANCELED') {
            setPublishState({ phase: 'error', msg: `Deploy ${state.toLowerCase()} — see Vercel dashboard` });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (state === 'BUILDING' || state === 'NORMALIZING') {
            setPublishState({
              phase: 'building',
              deployId: result.deploymentId,
              msg: `Building… (${pollCount * 3}s elapsed)`,
            });
          }
        } catch (e) {
          if (pollCount >= maxPolls) {
            setPublishState({ phase: 'error', msg: `Polling failed: ${(e as Error).message}` });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      };
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

  if (isLoading) {
    return <div style={{ color: 'var(--night-muted)', padding: '2rem' }}>Loading experiences…</div>;
  }

  // Currently editing target's data
  const editingData: { category?: Category; experience?: Experience; software?: Software } | null =
    editingTarget
      ? editingTarget.kind === 'category'
        ? { category: editingTarget.id ? (catOverrides[editingTarget.id] || serverData?.categories.find((c) => c.id === editingTarget.id)) : undefined }
        : editingTarget.kind === 'experience'
        ? { experience: editingTarget.id ? (expOverrides[editingTarget.id] || serverData?.experiences.find((e) => e.id === editingTarget.id)) : undefined }
        : { software: editingTarget.id ? (swOverrides[editingTarget.id] || serverData?.software.find((s) => s.id === editingTarget.id)) : undefined }
      : null;

  return (
    <div style={{ paddingBottom: '5rem' }}>
      {/* ── CATEGORY PILLS ROW (drag-reorderable) ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
        <SortableContext items={mergedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {mergedCategories.map((cat) => (
              <SortableCategoryPill
                key={cat.id}
                category={cat}
                active={selectedCatId === cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                onEdit={() => setEditingTarget({ kind: 'category', id: cat.id })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onUndoDelete={() => handleUndoDelete('category', cat.id)}
                isDeleted={deletedCatIds.has(cat.id)}
              />
            ))}
            <button
              onClick={() => setEditingTarget({ kind: 'category', id: null })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '3px',
                border: '1px dashed rgba(255,255,255,0.15)',
                background: 'transparent',
                color: 'var(--night-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'all 0.3s var(--ease-spring-soft)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--canvas)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--night-muted)'; }}
            >
              <Plus size={12} strokeWidth={1.5} /> Add Category
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {/* ── SELECTED CATEGORY CONTENT ── */}
      {selectedCategory ? (
        <>
          {/* Category header (large, with icon) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              padding: '0.85rem 1rem',
              background: 'rgba(214,41,41,0.08)',
              border: '1px solid rgba(214,41,41,0.25)',
              borderRadius: '3px',
            }}
          >
            <PreviewIcon name={selectedCategory.icon} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontSize: '1.25rem',
                  color: 'var(--canvas)',
                }}
              >
                {selectedCategory.title}
              </div>
              <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginTop: '0.15rem' }}>
                {selectedCategory.subtitle}
              </div>
            </div>
            <button
              onClick={() => setEditingTarget({ kind: 'category', id: selectedCategory.id })}
              style={{
                padding: '0.4rem 0.7rem',
                background: 'rgba(22,22,22,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canvas)',
                cursor: 'pointer',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ✎ Edit
            </button>
          </div>

          {/* EXPERIENCES sub-section */}
          <div style={{ marginBottom: '2rem' }}>
            <SubSectionHeader label="Experiences" count={mergedExperiences.length} onAdd={() => setEditingTarget({ kind: 'experience', id: null })} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
              <SortableContext items={mergedExperiences.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mergedExperiences.map((exp, idx) => (
                    <SortableExperienceCard
                      key={exp.id}
                      exp={exp}
                      index={idx}
                      onEdit={() => setEditingTarget({ kind: 'experience', id: exp.id })}
                      onDelete={() => handleDeleteExperience(exp.id)}
                      onUndoDelete={() => handleUndoDelete('experience', exp.id)}
                      isDeleted={deletedExpIds.has(exp.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* SOFTWARE sub-section */}
          <div>
            <SubSectionHeader label="Software" count={mergedSoftware.length} onAdd={() => setEditingTarget({ kind: 'software', id: null })} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSwDragEnd}>
              <SortableContext items={mergedSoftware.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {mergedSoftware.map((sw, idx) => (
                    <SortableSoftwareCard
                      key={sw.id}
                      sw={sw}
                      index={idx}
                      onEdit={() => setEditingTarget({ kind: 'software', id: sw.id })}
                      onDelete={() => handleDeleteSoftware(sw.id)}
                      onUndoDelete={() => handleUndoDelete('software', sw.id)}
                      isDeleted={deletedSwIds.has(sw.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </>
      ) : (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--night-muted)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.85rem' }}>
          No category selected. Click "+ Add Category" to create one.
        </div>
      )}

      {/* ── DELETED ITEMS BAR ── */}
      {(deletedCatIds.size + deletedExpIds.size + deletedSwIds.size) > 0 && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.7rem 1rem',
            background: 'rgba(214,41,41,0.08)',
            border: '1px dashed rgba(214,41,41,0.4)',
          }}
        >
          <div className="text-mono text-label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>
            {deletedCatIds.size + deletedExpIds.size + deletedSwIds.size} marked for deletion:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {Array.from(deletedCatIds).map((id) => (
              <UndoButton key={`cat-${id}`} label={serverData?.categories.find((c) => c.id === id)?.title || id} onUndo={() => handleUndoDelete('category', id)} />
            ))}
            {Array.from(deletedExpIds).map((id) => (
              <UndoButton key={`exp-${id}`} label={serverData?.experiences.find((e) => e.id === id)?.title || id} onUndo={() => handleUndoDelete('experience', id)} />
            ))}
            {Array.from(deletedSwIds).map((id) => (
              <UndoButton key={`sw-${id}`} label={serverData?.software.find((s) => s.id === id)?.name || id} onUndo={() => handleUndoDelete('software', id)} />
            ))}
          </div>
        </div>
      )}

      {/* ── PUBLISH BAR ── */}
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

      {/* ── DETAIL PANEL ── */}
      {editingTarget && (
        <ExperiencesDetailPanel
          target={editingTarget}
          data={editingData}
          selectedCategoryId={selectedCatId}
          allCategories={mergedCategories}
          onSaveCategory={handleSaveCategory}
          onSaveExperience={handleSaveExperience}
          onSaveSoftware={handleSaveSoftware}
          onClose={() => setEditingTarget(null)}
          onOpenIconPicker={(kind, id) => setIconPickerFor({ kind, id })}
          onOpenSoftwareIconPicker={(id) => setSwIconPickerFor(id)}
          onDelete={
            editingTarget.kind === 'category' && editingTarget.id
              ? () => handleDeleteCategory(editingTarget.id)
              : editingTarget.kind === 'experience' && editingTarget.id
              ? () => handleDeleteExperience(editingTarget.id)
              : editingTarget.kind === 'software' && editingTarget.id
              ? () => handleDeleteSoftware(editingTarget.id)
              : undefined
          }
        />
      )}

      {/* ── ICON PICKER (for experience / category lucide icons) ── */}
      {iconPickerFor && (
        <IconPicker
          value={
            iconPickerFor.id
              ? (iconPickerFor.kind === 'experience'
                  ? (expOverrides[iconPickerFor.id]?.icon || serverData?.experiences.find((e) => e.id === iconPickerFor.id)?.icon || 'Box')
                  : (catOverrides[iconPickerFor.id]?.icon || serverData?.categories.find((c) => c.id === iconPickerFor.id)?.icon || 'Box'))
              : (iconPickerFor.kind === 'experience' ? 'Layout' : 'Aperture')
          }
          onSelect={(name) => {
            if (iconPickerFor.id) {
              // Update existing draft
              if (iconPickerFor.kind === 'experience') {
                const target = serverData?.experiences.find((e) => e.id === iconPickerFor.id);
                if (target) {
                  setExpOverrides((prev) => ({ ...prev, [iconPickerFor.id!]: { ...(prev[iconPickerFor.id!] || target), icon: name } }));
                }
              } else {
                const target = serverData?.categories.find((c) => c.id === iconPickerFor.id);
                if (target) {
                  setCatOverrides((prev) => ({ ...prev, [iconPickerFor.id!]: { ...(prev[iconPickerFor.id!] || target), icon: name } }));
                }
              }
            } else {
              // Update new-draft override (held in catOverrides/expOverrides under 'new-draft' key)
              if (iconPickerFor.kind === 'experience') {
                setExpOverrides((prev) => ({ ...prev, '__new_draft__': { ...(prev['__new_draft__'] || {}), icon: name } as Experience }));
              } else {
                setCatOverrides((prev) => ({ ...prev, '__new_draft__': { ...(prev['__new_draft__'] || {}), icon: name } as Category }));
              }
            }
            setIconPickerFor(null);
          }}
          onClose={() => setIconPickerFor(null)}
        />
      )}

      {/* ── SOFTWARE ICON PICKER ── */}
      {swIconPickerFor && (
        <SoftwareIconPicker
          value={
            swIconPickerFor === 'new'
              ? (swOverrides['__new_draft__']?.slug || 'adobephotoshop')
              : (swOverrides[swIconPickerFor]?.slug || serverData?.software.find((s) => s.id === swIconPickerFor)?.slug || 'adobephotoshop')
          }
          onSelect={(slug) => {
            if (swIconPickerFor === 'new') {
              setSwOverrides((prev) => ({ ...prev, '__new_draft__': { ...(prev['__new_draft__'] || {}), slug } as Software }));
            } else {
              const target = serverData?.software.find((s) => s.id === swIconPickerFor);
              if (target) {
                setSwOverrides((prev) => ({ ...prev, [swIconPickerFor]: { ...(prev[swIconPickerFor] || target), slug } }));
              }
            }
            setSwIconPickerFor(null);
          }}
          onClose={() => setSwIconPickerFor(null)}
        />
      )}
    </div>
  );
}

// ---------- Sortable category pill ----------

function SortableCategoryPill({
  category,
  active,
  onClick,
  onEdit,
  onDelete,
  onUndoDelete,
  isDeleted,
}: {
  category: Category;
  active: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUndoDelete: () => void;
  isDeleted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  if (isDeleted) {
    return (
      <button
        onClick={onUndoDelete}
        style={{
          padding: '0.4rem 0.75rem',
          background: 'rgba(214,41,41,0.05)',
          border: '1px dashed rgba(214,41,41,0.4)',
          color: 'var(--night-muted)',
          cursor: 'pointer',
          borderRadius: '3px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.7rem',
          textDecoration: 'line-through',
        }}
      >
        ↺ {category.title}
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: '3px',
        overflow: 'hidden',
        background: active ? 'rgba(214,41,41,0.2)' : 'rgba(22,22,22,0.6)',
        border: active ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder category"
        style={{
          cursor: 'grab',
          background: 'transparent',
          border: 0,
          color: active ? 'var(--canvas)' : 'var(--night-muted)',
          padding: '0.45rem 0.4rem 0.45rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <GripVertical size={12} strokeWidth={1.5} />
      </button>
      <button
        onClick={onClick}
        style={{
          padding: '0.45rem 0.5rem',
          background: 'transparent',
          border: 0,
          color: active ? 'var(--canvas)' : 'var(--night-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.7rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <PreviewIcon name={category.icon} size={14} />
        {category.title}
      </button>
      <button
        onClick={onEdit}
        aria-label={`Edit ${category.title}`}
        style={{
          padding: '0.45rem 0.4rem',
          background: 'transparent',
          border: 0,
          color: 'var(--night-muted)',
          cursor: 'pointer',
        }}
      >
        <Pencil size={11} strokeWidth={1.5} />
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${category.title}`}
        style={{
          padding: '0.45rem 0.55rem 0.45rem 0.4rem',
          background: 'transparent',
          border: 0,
          color: 'var(--accent)',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={11} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ---------- Sub-section header ----------

function SubSectionHeader({ label, count, onAdd }: { label: string; count: number; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.75rem' }}>
        {label.toUpperCase()} ({count})
      </span>
      <button
        onClick={onAdd}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.65rem',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--canvas)',
          cursor: 'pointer',
          borderRadius: '2px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.65rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'border-color 0.3s var(--ease-spring-soft)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      >
        <Plus size={10} strokeWidth={1.5} /> Add {label}
      </button>
    </div>
  );
}

// ---------- Sortable experience card (Studio version) ----------

function SortableExperienceCard({
  exp,
  index,
  onEdit,
  onDelete,
  onUndoDelete,
  isDeleted,
}: {
  exp: Experience;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onUndoDelete: () => void;
  isDeleted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exp.id });

  if (isDeleted) {
    return (
      <button
        onClick={onUndoDelete}
        style={{
          padding: '0.6rem 1rem',
          background: 'rgba(214,41,41,0.05)',
          border: '1px dashed rgba(214,41,41,0.3)',
          color: 'var(--night-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.75rem',
          textDecoration: 'line-through',
          borderRadius: '3px',
          textAlign: 'left',
          width: '100%',
        }}
      >
        ↺ {exp.title}
      </button>
    );
  }

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
          padding: '0.7rem 0.9rem',
          background: 'var(--night-soft)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          transition: 'background 0.3s var(--ease-spring-soft), border-color 0.3s var(--ease-spring-soft)',
        }}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          style={{ cursor: 'grab', background: 'transparent', border: 0, color: 'var(--night-muted)', padding: '0.2rem', display: 'flex' }}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </button>
        <span className="text-mono text-label" style={{ color: 'var(--accent)', opacity: 0.7, minWidth: '2rem' }}>
          N°{String(index + 1).padStart(2, '0')}
        </span>
        {exp.featured && <Star size={12} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />}
        <PreviewIcon name={exp.icon} size={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              fontSize: '0.95rem',
              color: 'var(--canvas)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: exp.published ? 1 : 0.5,
            }}
          >
            {exp.title}
            {!exp.published && <span className="text-mono text-label" style={{ color: 'var(--night-muted)', marginLeft: '0.4rem' }}>(unpublished)</span>}
          </div>
          <div className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.65rem', marginTop: '0.1rem' }}>
            {exp.status}
          </div>
        </div>
        <div className="studio-hover-reveal" style={{ display: 'flex', gap: '0.3rem' }}>
          <IconButton onClick={onEdit} label="Edit"><Pencil size={11} strokeWidth={1.5} /></IconButton>
          <IconButton onClick={onDelete} label="Delete" danger><Trash2 size={11} strokeWidth={1.5} /></IconButton>
        </div>
      </div>
    </div>
  );
}

// ---------- Sortable software card (Studio version with live progress preview) ----------

function SortableSoftwareCard({
  sw,
  index,
  onEdit,
  onDelete,
  onUndoDelete,
  isDeleted,
}: {
  sw: Software;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onUndoDelete: () => void;
  isDeleted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sw.id });
  const [iconError, setIconError] = useState(false);

  if (isDeleted) {
    return (
      <button
        onClick={onUndoDelete}
        style={{
          padding: '0.5rem 0.9rem',
          background: 'rgba(214,41,41,0.05)',
          border: '1px dashed rgba(214,41,41,0.3)',
          color: 'var(--night-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.7rem',
          textDecoration: 'line-through',
          borderRadius: '3px',
          textAlign: 'left',
          width: '100%',
        }}
      >
        ↺ {sw.name}
      </button>
    );
  }

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
        className="studio-card software-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 0.85rem',
          background: 'rgba(22, 22, 22, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          transition: 'background 0.3s var(--ease-spring-soft), border-color 0.3s var(--ease-spring-soft)',
        }}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          style={{ cursor: 'grab', background: 'transparent', border: 0, color: 'var(--night-muted)', padding: '0.2rem', display: 'flex' }}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </button>
        {/* Live software brand icon from jsdelivr + simple-icons CDN */}
        <div style={{ width: '24px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!iconError ? (
             
            <img
              src={getSoftwareIconUrl(sw.slug)}
              alt=""
              width={20}
              height={20}
              onError={() => setIconError(true)}
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.92, display: 'block' }}
            />
          ) : (
            <Box size={18} strokeWidth={1.5} color="var(--night-muted)" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              color: 'var(--canvas)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sw.name}
          </div>
          {/* Live progress bar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div className="software-progress-bar" style={{ flex: 1, height: '2px' }}>
              <div className="software-progress-bar-fill" style={{ width: `${sw.progress}%` }} />
            </div>
            <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.6rem', flexShrink: 0 }}>
              {sw.progress}%
            </span>
          </div>
        </div>
        <div className="studio-hover-reveal" style={{ display: 'flex', gap: '0.3rem' }}>
          <IconButton onClick={onEdit} label="Edit"><Pencil size={11} strokeWidth={1.5} /></IconButton>
          <IconButton onClick={onDelete} label="Delete" danger><Trash2 size={11} strokeWidth={1.5} /></IconButton>
        </div>
      </div>
    </div>
  );
}

// ---------- Small icon button ----------

function IconButton({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        padding: '0.3rem',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        color: danger ? 'var(--accent)' : 'var(--canvas)',
        cursor: 'pointer',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.2s var(--ease-spring-soft)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,41,41,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ---------- Undo button (in deleted items bar) ----------

function UndoButton({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <button
      onClick={onUndo}
      style={{
        padding: '0.25rem 0.55rem',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'var(--night-muted)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: '0.65rem',
        cursor: 'pointer',
        borderRadius: '2px',
      }}
    >
      ↺ {label.slice(0, 24)}
    </button>
  );
}

// ---------- Detail panel for editing all 3 entity types ----------

function ExperiencesDetailPanel({
  target,
  data,
  selectedCategoryId,
  allCategories,
  onSaveCategory,
  onSaveExperience,
  onSaveSoftware,
  onClose,
  onOpenIconPicker,
  onOpenSoftwareIconPicker,
  onDelete,
}: {
  target: EditingTarget;
  data: { category?: Category; experience?: Experience; software?: Software } | null;
  selectedCategoryId: string | null;
  allCategories: Category[];
  onSaveCategory: (cat: Category) => void;
  onSaveExperience: (exp: Experience) => void;
  onSaveSoftware: (sw: Software) => void;
  onClose: () => void;
  onOpenIconPicker: (kind: 'experience' | 'category', id: string | null) => void;
  onOpenSoftwareIconPicker: (id: string | null) => void;
  onDelete?: () => void;
}) {
  const isEdit = target.id !== null;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Determine title for the panel
  const panelTitle =
    target.kind === 'category'
      ? (data?.category?.title || 'New Category')
      : target.kind === 'experience'
      ? (data?.experience?.title || 'New Experience')
      : (data?.software?.name || 'New Software');

  // Build draft state based on target kind
  const [catDraft, setCatDraft] = useState<Category>(
    data?.category || {
      id: target.id || newId('cat'),
      title: '',
      subtitle: '',
      order: (allCategories.length + 1),
      icon: 'Aperture',
    }
  );
  const [expDraft, setExpDraft] = useState<Experience>(
    data?.experience || {
      id: target.id || newId('exp'),
      title: '',
      category_id: selectedCategoryId || allCategories[0]?.id || '',
      status: '2026 — Present',
      description: '',
      icon: 'Layout',
      tags: [],
      featured: false,
      published: true,
      order: 0,
    }
  );
  const [swDraft, setSwDraft] = useState<Software>(
    data?.software || {
      id: target.id || newId('sw'),
      name: '',
      slug: 'adobephotoshop',
      progress: 50,
      category_id: selectedCategoryId || allCategories[0]?.id || '',
      order: 0,
    }
  );
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    if (target.kind === 'category') {
      if (!catDraft.title.trim()) return;
      onSaveCategory(catDraft);
    } else if (target.kind === 'experience') {
      if (!expDraft.title.trim()) return;
      onSaveExperience(expDraft);
    } else {
      if (!swDraft.name.trim()) return;
      onSaveSoftware(swDraft);
    }
  };

  // Build the panel preview based on target kind
  const preview = (() => {
    if (target.kind === 'category') {
      return (
        <div style={{ padding: '0.85rem', background: 'rgba(214,41,41,0.08)', border: '1px solid rgba(214,41,41,0.25)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => onOpenIconPicker('category', target.id)}
            style={{ padding: 0, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--accent)' }}
            aria-label="Change category icon"
          >
            <PreviewIcon name={catDraft.icon} size={28} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '1.1rem', color: 'var(--canvas)' }}>
              {catDraft.title || 'Untitled Category'}
            </div>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginTop: '0.15rem' }}>
              {catDraft.subtitle || 'No subtitle'}
            </div>
          </div>
        </div>
      );
    }
    if (target.kind === 'experience') {
      return (
        <div style={{ padding: '0.85rem', background: 'rgba(22,22,22,0.6)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => onOpenIconPicker('experience', target.id)}
            style={{ padding: 0, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--accent)' }}
            aria-label="Change experience icon"
          >
            <PreviewIcon name={expDraft.icon} size={28} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '1.05rem', color: 'var(--canvas)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {expDraft.title || 'Untitled'}
            </div>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginTop: '0.15rem' }}>
              {expDraft.status || 'No status'}
            </div>
          </div>
          {expDraft.featured && <Star size={14} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />}
        </div>
      );
    }
    // software
    return (
      <div style={{ padding: '0.85rem', background: 'rgba(22,22,22,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
          <button
            onClick={() => onOpenSoftwareIconPicker(target.id)}
            style={{ padding: 0, background: 'transparent', border: 0, cursor: 'pointer' }}
            aria-label="Change software icon"
          >
            <SoftwarePreviewLive slug={swDraft.slug} size={32} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '1.05rem', color: 'var(--canvas)' }}>
              {swDraft.name || 'Untitled'}
            </div>
            <div className="text-mono text-label" style={{ color: 'var(--night-muted)', marginTop: '0.15rem' }}>
              {swDraft.slug}
            </div>
          </div>
          <span className="text-mono text-label" style={{ color: 'var(--accent)' }}>
            {swDraft.progress}%
          </span>
        </div>
        {/* Live progress preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="software-progress-bar" style={{ flex: 1, height: '3px' }}>
            <div className="software-progress-bar-fill" style={{ width: `${swDraft.progress}%` }} />
          </div>
          <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.65rem' }}>
            {getMasteryLabel(swDraft.progress)}
          </span>
        </div>
      </div>
    );
  })();

  return (
    <StudioDetailPanel
      title={panelTitle}
      preview={preview}
      onClose={onClose}
      onSave={handleSave}
      onDelete={isEdit ? onDelete : undefined}
      isMobile={isMobile}
    >
      {target.kind === 'category' && (
        <>
          <Field label="Title">
            <input
              value={catDraft.title}
              onChange={(e) => setCatDraft({ ...catDraft, title: e.target.value })}
              placeholder="e.g. Visual Production"
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label="Subtitle">
            <input
              value={catDraft.subtitle}
              onChange={(e) => setCatDraft({ ...catDraft, subtitle: e.target.value })}
              placeholder="e.g. Image editing, motion graphics, VFX"
              style={inputStyle}
            />
          </Field>
          <Field label="Icon (Lucide)">
            <button
              onClick={() => onOpenIconPicker('category', target.id)}
              style={iconButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }}
            >
              <PreviewIcon name={catDraft.icon} size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>{catDraft.icon}</span>
              <span style={{ color: 'var(--night-muted)', fontSize: '0.7rem' }}>Change →</span>
            </button>
          </Field>
        </>
      )}

      {target.kind === 'experience' && (
        <>
          <Field label="Title">
            <input
              value={expDraft.title}
              onChange={(e) => setExpDraft({ ...expDraft, title: e.target.value })}
              placeholder="e.g. Poster Design"
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label="Category">
            <select
              value={expDraft.category_id}
              onChange={(e) => setExpDraft({ ...expDraft, category_id: e.target.value })}
              style={inputStyle}
            >
              {allCategories.map((c) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--night)' }}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <input
              value={expDraft.status}
              onChange={(e) => setExpDraft({ ...expDraft, status: e.target.value })}
              placeholder="2026 — Present"
              style={inputStyle}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={expDraft.description}
              onChange={(e) => setExpDraft({ ...expDraft, description: e.target.value })}
              placeholder="One or two sentences describing this experience."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-fraunces), serif', fontSize: '0.95rem' }}
            />
          </Field>
          <Field label="Icon (Lucide)">
            <button
              onClick={() => onOpenIconPicker('experience', target.id)}
              style={iconButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }}
            >
              <PreviewIcon name={expDraft.icon} size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>{expDraft.icon}</span>
              <span style={{ color: 'var(--night-muted)', fontSize: '0.7rem' }}>Change →</span>
            </button>
          </Field>
          <Field label="Tags">
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {expDraft.tags.map((tag) => (
                <span key={tag} style={tagPillStyle}>
                  {tag.startsWith('#') ? tag : `#${tag}`}
                  <button onClick={() => setExpDraft({ ...expDraft, tags: expDraft.tags.filter((t) => t !== tag) })} style={tagRemoveStyle} aria-label={`Remove tag ${tag}`}>✕</button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const t = tagInput.trim();
                  if (t && !expDraft.tags.includes(t)) {
                    setExpDraft({ ...expDraft, tags: [...expDraft.tags, t] });
                  }
                  setTagInput('');
                }
              }}
              placeholder="Type a tag + Enter"
              style={inputStyle}
            />
          </Field>
          <Field label="Featured (spotlight card)">
            <button
              onClick={() => setExpDraft({ ...expDraft, featured: !expDraft.featured })}
              style={toggleButtonStyle(expDraft.featured)}
            >
              <Star size={14} strokeWidth={1.5} style={{ color: expDraft.featured ? 'var(--accent)' : 'var(--night-muted)' }} />
              {expDraft.featured ? 'Featured — highlighted' : 'Not featured'}
            </button>
          </Field>
          <Field label="Published">
            <button
              onClick={() => setExpDraft({ ...expDraft, published: !expDraft.published })}
              style={toggleButtonStyle(expDraft.published)}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: expDraft.published ? 'var(--accent)' : 'var(--night-muted)' }} />
              {expDraft.published ? 'Public — visible on site' : 'Hidden — draft only'}
            </button>
          </Field>
        </>
      )}

      {target.kind === 'software' && (
        <>
          <Field label="Software Name">
            <input
              value={swDraft.name}
              onChange={(e) => setSwDraft({ ...swDraft, name: e.target.value })}
              placeholder="e.g. Adobe Photoshop"
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label="Category">
            <select
              value={swDraft.category_id}
              onChange={(e) => setSwDraft({ ...swDraft, category_id: e.target.value })}
              style={inputStyle}
            >
              {allCategories.map((c) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--night)' }}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand Icon (loads from simple-icons CDN — no Supabase)">
            <button
              onClick={() => onOpenSoftwareIconPicker(target.id)}
              style={iconButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--night-hr)'; }}
            >
              <SoftwarePreviewLive slug={swDraft.slug} size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>{swDraft.slug}</span>
              <span style={{ color: 'var(--night-muted)', fontSize: '0.7rem' }}>Change →</span>
            </button>
          </Field>
          <Field label={`Mastery — ${swDraft.progress}% (${getMasteryLabel(swDraft.progress)})`}>
            {/* Live progress preview bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div className="software-progress-bar" style={{ flex: 1, height: '4px' }}>
                <div className="software-progress-bar-fill" style={{ width: `${swDraft.progress}%` }} />
              </div>
              <span className="text-mono text-label" style={{ color: 'var(--accent)', fontSize: '0.75rem', minWidth: '2.5rem', textAlign: 'right' }}>
                {swDraft.progress}%
              </span>
            </div>
            {/* Range slider for editing */}
            <input
              type="range"
              min={0}
              max={100}
              value={swDraft.progress}
              onChange={(e) => setSwDraft({ ...swDraft, progress: Number(e.target.value) })}
              className="studio-progress-slider"
              aria-label="Mastery progress"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.6rem' }}>BEGINNER</span>
              <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.6rem' }}>INTERMEDIATE</span>
              <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.6rem' }}>ADVANCED</span>
              <span className="text-mono text-label" style={{ color: 'var(--night-muted)', fontSize: '0.6rem' }}>EXPERT</span>
            </div>
          </Field>
        </>
      )}
    </StudioDetailPanel>
  );
}

// ---------- Software preview with live CDN load ----------

function SoftwarePreviewLive({ slug, size = 22 }: { slug: string; size?: number }) {
  const [iconError, setIconError] = useState(false);
  if (!slug || iconError) {
    return <Box size={size} strokeWidth={1.5} color="var(--night-muted)" />;
  }
  return (
     
    <img
      src={getSoftwareIconUrl(slug)}
      alt={slug}
      width={size}
      height={size}
      onError={() => setIconError(true)}
      style={{ filter: 'brightness(0) invert(1)', opacity: 0.92, display: 'block' }}
    />
  );
}

// ---------- Field + shared styles ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label className="text-mono text-label" style={{ color: 'var(--night-muted)', display: 'block', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

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

const iconButtonStyle: React.CSSProperties = {
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
};

const tagPillStyle: React.CSSProperties = {
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
};

const tagRemoveStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  color: 'var(--night-muted)',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
};

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: active ? 'rgba(214,41,41,0.15)' : 'transparent',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--night-hr)'}`,
    color: active ? 'var(--canvas)' : 'var(--night-muted)',
    cursor: 'pointer',
    borderRadius: '2px',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    width: '100%',
  };
}
