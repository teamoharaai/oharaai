import type { CSSProperties, ReactNode } from 'react';
import { Image } from 'react-native';
import Head from 'expo-router/head';
import { LIGHT_THEME } from '@/constants/colors';
import './public-auth-v2.css';

export function PublicAuthShell({ children, mode, title, subtitle }: {
  children: ReactNode;
  mode: 'login' | 'signup';
  title: string;
  subtitle: string;
}) {
  return (
    <main className="auth-v2" style={{
      '--auth-page': LIGHT_THEME.background.page,
      '--auth-card': LIGHT_THEME.background.card,
      '--auth-ink': LIGHT_THEME.text.primary,
      '--auth-muted': LIGHT_THEME.text.secondary,
    } as CSSProperties}>
      <Head><title>{mode === 'login' ? 'Log in' : 'Create account'} — OharaAI</title></Head>
      <section className="auth-story" aria-label="OharaAI">
        <a className="auth-wordmark" href="/" aria-label="OharaAI home">
          <Image source={require('../../assets/brand/ohara-logo.png')} style={{ width: 31, height: 40, tintColor: '#f5f5f7' }} resizeMode="contain" accessible={false} />
          <span>OharaAI</span>
        </a>
        <div className="auth-story-copy">
          <p className="auth-eyebrow">A PERSONAL GROWTH COMPANION</p>
          <h2>A More Intentional<br />Way to Grow</h2>
          <p>Bring your goals, actions, and reflections together. Grow with intention, at your own pace.</p>
        </div>
        <p className="auth-story-footnote">YOUR JOURNEY. YOUR PACE.</p>
      </section>
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <a className="auth-back" href="/">← Back to OharaAI</a>
        <div className="auth-form-content">
          <p className="auth-eyebrow">{mode === 'login' ? 'YOUR SPACE TO GROW' : 'BEGIN WITH WHAT MATTERS'}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
        <p className="auth-footer">Grow with intention.</p>
      </section>
    </main>
  );
}

export const publicInputStyle = {
  backgroundColor: LIGHT_THEME.background.card,
  borderColor: LIGHT_THEME.border.input,
  borderRadius: 6,
  borderWidth: 1,
  color: LIGHT_THEME.text.primary,
  fontFamily: 'Inter-Regular',
  fontSize: 15,
  minHeight: 50,
  paddingHorizontal: 15,
  paddingVertical: 13,
} as const;

export const publicActionStyle = { backgroundColor: '#234434', borderRadius: 6 } as const;
export const publicActionTextColor = '#FFFFFF';
export const publicLinkColor = '#315743';
