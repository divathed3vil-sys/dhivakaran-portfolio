'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudio } from './studio-provider';

/**
 * AuthCard — the floating login card triggered by "divahere".
 *
 * UX (per user spec — no visible buttons):
 *  - Username field auto-focused on card open
 *  - Type username + Enter → focus jumps to password field
 *  - Type password + Enter → submit (signIn)
 *  - On failure: card shakes + red flash, password clears, stays on password stage
 *  - On success: card closes, Studio overlay opens
 *  - Esc / backdrop click: close card
 *
 * The username "diva" is mapped to email "diva@studio.local" (see supabase.ts).
 * The password is validated server-side by Supabase Auth — never in the client.
 */
export function AuthCard() {
  const { showAuth, authError, signIn, closeAuth } = useStudio();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<'username' | 'password'>('username');
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // reset + auto-focus username when card opens
  useEffect(() => {
    if (!showAuth) return;
    // defer setState to satisfy the set-state-in-effect rule
    const t1 = setTimeout(() => {
      setUsername('');
      setPassword('');
      setStage('username');
      setShake(false);
      setSubmitting(false);
    }, 0);
    const t2 = setTimeout(() => usernameRef.current?.focus(), 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showAuth]);

  // react to authError from the provider (shake + clear password)
  useEffect(() => {
    if (!authError) return;
    // defer setState to satisfy the set-state-in-effect rule
    const t1 = setTimeout(() => {
      setShake(true);
      setPassword('');
      setSubmitting(false);
    }, 0);
    const t2 = setTimeout(() => {
      setShake(false);
      passwordRef.current?.focus();
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [authError]);

  if (!showAuth) return null;

  const handleUsernameEnter = () => {
    if (!username.trim()) return;
    setStage('password');
    setTimeout(() => passwordRef.current?.focus(), 0);
  };

  const handlePasswordEnter = async () => {
    if (!password || submitting) return;
    setSubmitting(true);
    await signIn(username.trim(), password);
    // if signIn fails, the authError effect handles the shake + refocus
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* backdrop — blurs the content behind, click to close */}
      <div
        aria-hidden="true"
        onClick={closeAuth}
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(10, 10, 10, 0.55)',
        }}
      />

      {/* the card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Studio access"
        style={{
          position: 'relative',
          width: 'min(380px, 90vw)',
          background: 'var(--night)',
          border: `1.5px solid ${shake ? 'var(--accent)' : 'rgba(214, 41, 41, 0.4)'}`,
          padding: 'calc(32 * var(--px))',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.7)',
          animation: shake ? 'auth-shake 0.5s var(--ease-curtain)' : 'auth-card-in 0.5s var(--ease-out-soft)',
        }}
      >
        {/* label */}
        <div
          className="text-mono text-label"
          style={{ color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '0.15em' }}
        >
          ◉ STUDIO ACCESS
        </div>
        <div
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            color: 'var(--canvas)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 'calc(24 * var(--px))',
          }}
        >
          Enter The Studio
        </div>

        {/* username field */}
        <div style={{ marginBottom: 'calc(16 * var(--px))' }}>
          <label
            className="text-mono text-label"
            htmlFor="studio-username"
            style={{
              color: 'var(--night-muted)',
              display: 'block',
              marginBottom: '0.4rem',
              opacity: stage === 'username' ? 1 : 0.4,
            }}
          >
            Username
          </label>
          <input
            id="studio-username"
            ref={usernameRef}
            type="text"
            value={username}
            autoComplete="off"
            spellCheck={false}
            disabled={stage === 'password' || submitting}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUsernameEnter();
              }
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 0,
              borderBottom: `1.5px solid ${stage === 'username' ? 'var(--accent)' : 'var(--night-hr)'}`,
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '1.1rem',
              padding: '0.5rem 0',
              outline: 'none',
              opacity: stage === 'username' ? 1 : 0.5,
            }}
          />
        </div>

        {/* password field */}
        <div>
          <label
            className="text-mono text-label"
            htmlFor="studio-password"
            style={{
              color: 'var(--night-muted)',
              display: 'block',
              marginBottom: '0.4rem',
              opacity: stage === 'password' ? 1 : 0.4,
            }}
          >
            Password
          </label>
          <input
            id="studio-password"
            ref={passwordRef}
            type="password"
            value={password}
            autoComplete="current-password"
            disabled={stage === 'username' || submitting}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePasswordEnter();
              }
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 0,
              borderBottom: `1.5px solid ${stage === 'password' ? 'var(--accent)' : 'var(--night-hr)'}`,
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '1.1rem',
              padding: '0.5rem 0',
              outline: 'none',
              opacity: stage === 'password' ? 1 : 0.5,
            }}
          />
        </div>

        {/* hint */}
        <div
          className="text-mono text-label"
          style={{
            color: 'var(--night-muted)',
            opacity: 0.5,
            marginTop: 'calc(20 * var(--px))',
            textAlign: 'center',
          }}
        >
          {submitting
            ? 'verifying…'
            : stage === 'username'
            ? 'type username · press enter'
            : 'type password · press enter'}
        </div>
      </div>
    </div>
  );
}
