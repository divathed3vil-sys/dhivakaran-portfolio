'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, usernameToEmail } from '@/lib/supabase';

type StudioState = {
  showAuth: boolean;
  authed: boolean;
  authError: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  signIn: (username: string, password: string) => Promise<boolean>;
  closeStudio: () => void;
};

const StudioContext = createContext<StudioState | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}

const TRIGGER = 'divahere';

export function StudioProvider({ children }: { children: ReactNode }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const bufferRef = useRef('');

  const openAuth = useCallback(() => {
    setShowAuth(true);
    setAuthError(false);
  }, []);

  const closeAuth = useCallback(() => {
    setShowAuth(false);
    setAuthError(false);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    if (!supabase) return false;
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(true);
      return false;
    }
    setAuthed(true);
    setShowAuth(false);
    setAuthError(false);
    return true;
  }, []);

  const closeStudio = useCallback(async () => {
    setAuthed(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  // The "divahere" trigger — global keydown listener tracking the last 8 chars
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showAuth || authed) return;
      if (e.key.length !== 1) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-TRIGGER.length);
      if (bufferRef.current === TRIGGER) {
        bufferRef.current = '';
        openAuth();
      }
    };
    window.addEventListener('keydown', onKey, { passive: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [showAuth, authed, openAuth]);

  // Esc to close auth card
  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAuth, closeAuth]);

  const value: StudioState = {
    showAuth,
    authed,
    authError,
    openAuth,
    closeAuth,
    signIn,
    closeStudio,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
