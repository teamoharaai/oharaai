import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Image } from 'react-native';
import Head from 'expo-router/head';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { LIGHT_THEME } from '@/constants/colors';
import './landing-v2.css';

const navigation = [['Product', 'product'], ['About Us', 'about'], ['Coming Soon', 'coming-soon']] as const;
const palette = {
  '--lp-page': LIGHT_THEME.background.page,
  '--lp-card': LIGHT_THEME.background.card,
  '--lp-subtle': LIGHT_THEME.background.subtle,
  '--lp-sidebar': LIGHT_THEME.background.sidebar,
  '--lp-selected': LIGHT_THEME.background.selectedRow,
  '--lp-ink': LIGHT_THEME.text.primary,
  '--lp-muted': LIGHT_THEME.text.secondary,
  '--lp-border': LIGHT_THEME.border.divider,
  '--lp-accent': LIGHT_THEME.accent.primary,
} as CSSProperties;

function Wordmark() {
  return <a className="lp-wordmark" href="#top" aria-label="OharaAI home">
    <Image source={require('../../assets/brand/ohara-logo.png')} style={{ width: 31, height: 40, tintColor: '#eeeadd' }} resizeMode="contain" accessible={false} />
    <span>OharaAI</span>
  </a>;
}

function GetStarted({ dark = false }: { dark?: boolean }) {
  return <a className={`lp-cta${dark ? ' lp-cta-dark' : ''}`} href="/signup">Get Started <span aria-hidden="true">↗</span></a>;
}

function Feature({ icon, title, children }: { icon: BrandIconName; title: string; children: string }) {
  return <li className="lp-feature"><span className="lp-feature-icon"><BrandIcon name={icon} size={22} color="currentColor" /></span><div><h3>{title}</h3><p>{children}</p></div></li>;
}

function GoalPreview() {
  return <div className="lp-goal-preview">
    <div className="lp-preview-heading"><h3>Goals</h3><span className="lp-small-label">ILLUSTRATIVE PREVIEW</span></div>
    {[
      ['Health & Fitness', 'Build a running routine', 'Run for 30 minutes', 'health'],
      ['Learning & Creativity', 'Make room for reading', 'Read one chapter', 'learning'],
      ['Life & Relationships', 'Be more present', 'Plan time together', 'life'],
    ].map(([category, title, task, color]) => <div className={`lp-goal-row lp-${color}`} key={title}>
      <BrandIcon name="goals" color="currentColor" size={25} />
      <div><span className="lp-small-label">{category}</span><h4>{title}</h4><p>Next step · {task}</p></div>
    </div>)}
    <div className="lp-preview-footnote"><BrandIcon name="momentum" color="#315743" size={20} /><span>Small actions. Meaningful momentum.</span></div>
  </div>;
}

function WorkspacePreview() {
  return <figure className="lp-workspace">
    <figcaption className="lp-demo-label">A LOOK INSIDE OHARA <span>Illustrative workspace · sample content</span></figcaption>
    <div className="lp-workspace-body">
      <div className="lp-demo-sidebar" aria-hidden="true"><span className="lp-demo-wordmark">OHARA</span>
        {([['home', 'Home'], ['goals', 'Goals'], ['project', 'Projects'], ['notes', 'Notes'], ['reflections', 'Reflections'], ['momentum', 'Momentum']] as [BrandIconName, string][]).map(([icon, label]) => <div key={label} className={label === 'Home' ? 'lp-demo-selected' : ''}><BrandIcon name={icon} size={17} color="#315743" />{label}</div>)}
      </div>
      <div className="lp-demo-content"><span className="lp-small-label">YOUR SPACE TO GROW</span><h3>Make room for what matters.</h3><p>One thoughtful step at a time.</p>
        <div className="lp-demo-cards"><div className="lp-demo-focus"><span className="lp-small-label">TODAY’S FOCUS</span><h4>Build consistency</h4>{['Go for a morning walk', 'Read one chapter', 'Reflect on your day'].map((task) => <div className="lp-demo-task" key={task}><span aria-hidden="true" />{task}</div>)}</div>
          <div className="lp-demo-journal"><BrandIcon name="reflections" color="#315743" size={23} /><span className="lp-small-label">JOURNAL</span><blockquote>“A little space to pause helped me see what I want to make time for.”</blockquote><span className="lp-sample-note">Sample journal entry</span></div>
        </div>
      </div>
    </div>
  </figure>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!['product', 'about', 'coming-soon'].includes(id)) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(id);
      section?.scrollIntoView({ behavior: 'instant', block: 'start' });
      section?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function navigateTo(id: string) {
    setMenuOpen(false);
    // Focus follows the anchor for keyboard and screen-reader navigation.
    requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
  }

  return <div className="landing-v2" style={palette}>
    <Head><title>OharaAI — A More Intentional Way to Grow</title><meta name="description" content="Bring your goals, actions, and reflections together in one place. OharaAI is your personal growth companion, helping you grow with intention, at your own pace." /><meta property="og:title" content="OharaAI — A More Intentional Way to Grow" /><meta property="og:description" content="Your goals, actions, and reflections. Together in one personal growth companion." /></Head>
    <a className="lp-skip" href="#product">Skip to product</a>
    <div className="lp-hero-shell" id="top">
      <header className="lp-header lp-container">
        <Wordmark />
        <button ref={menuButton} className="lp-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="lp-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button>
        <nav id="lp-navigation" aria-label="Main navigation" className={menuOpen ? 'lp-nav is-open' : 'lp-nav'} onKeyDown={(event) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>
          {navigation.map(([label, id]) => <a href={`#${id}`} key={id} onClick={() => navigateTo(id)}>{label}</a>)}
        </nav>
        <div className="lp-header-cta"><GetStarted /></div>
      </header>
      <div>
        <section className="lp-hero lp-container" aria-labelledby="hero-title">
          <div><p className="lp-eyebrow">A PERSONAL GROWTH COMPANION</p><h1 id="hero-title">A More Intentional<br className="lp-desktop-break" /> Way to Grow</h1><p className="lp-hero-description">Bring your goals, actions, and reflections together.<br className="lp-desktop-break" /> Grow with intention, at your own pace.</p><GetStarted /></div>
          <div className="lp-hero-steps" aria-hidden="true"><span>REFLECT</span><span>PLAN</span><span>ACT</span><span>GROW</span><i /></div>
          <span className="lp-hero-bottom">YOUR JOURNEY. YOUR PACE.</span>
        </section>
      </div>
    </div>
    <main id="lp-content">
      <section id="product" tabIndex={-1} className="lp-section lp-product" aria-labelledby="product-title">
        <div className="lp-container"><div className="lp-section-intro"><div><p className="lp-eyebrow">ALL IN ONE PLACE</p><h2 id="product-title">A focused space for<br />a more intentional you.</h2></div><p>Bring your goals, notes, reflections, and progress together — so you can see what matters and move forward with clarity.</p></div><WorkspacePreview /></div>
      </section>
      <section className="lp-section lp-reflection" aria-labelledby="reflection-title"><div className="lp-container lp-split">
        <div className="lp-section-copy"><p className="lp-eyebrow">SPACE FOR SELF-UNDERSTANDING</p><h2 id="reflection-title">Understand yourself<br />on a deeper level.</h2><p>Your thoughts and actions are part of a larger story. Give yourself space to notice, reflect, and learn along the way.</p><GetStarted /></div>
        <ul className="lp-features"><Feature icon="reflections" title="Capture what matters">Capture meaningful moments and experiences in Reflections.</Feature><Feature icon="notes" title="Give your ideas room">Bring your thinking together in Notes.</Feature><Feature icon="goals" title="Connect thought with action">Link Notes and Reflections to your Goals and Projects.</Feature></ul>
      </div></section>
      <section className="lp-section lp-growth" aria-labelledby="growth-title"><div className="lp-container lp-split"><div className="lp-section-copy"><p className="lp-eyebrow">INTENTION INTO ACTION</p><h2 id="growth-title">Own Your<br />Personal Growth</h2><p>Make space for the bigger picture, then find the next clear step. Build a rhythm that works for you.</p><ul className="lp-features"><Feature icon="goals" title="Goals with direction">Shape what matters into clear Goals and milestones.</Feature><Feature icon="project" title="A place for the bigger picture">Organize related Goals and resources in Projects.</Feature><Feature icon="today" title="One clear next step">Break your intentions into manageable Tasks.</Feature><Feature icon="momentum" title="Progress you can see">Follow your actions and reflections with Momentum.</Feature></ul></div><GoalPreview /></div></section>
      <section className="lp-connection lp-section" aria-labelledby="connection-title"><div className="lp-container"><p className="lp-eyebrow">CIRCLES & COMMUNITY · PLANNED FOR THE FUTURE</p><h2 id="connection-title">Find Strength<br />in Connection</h2><p>Growth is personal. It doesn’t have to be solitary. We’re imagining a space for encouragement, shared experiences, and meaningful connection.</p><a className="lp-text-link" href="#coming-soon" onClick={() => navigateTo('coming-soon')}>Explore what’s ahead <span aria-hidden="true">↗</span></a></div></section>
      <section id="about" tabIndex={-1} className="lp-section lp-about" aria-labelledby="about-title"><div className="lp-container"><p className="lp-eyebrow">ABOUT US</p><div className="lp-about-product"><h2 id="about-title">Our Product</h2><p>OHARA is a personal growth companion designed to bring your goals, actions, and reflections together in one place. We believe personal growth isn't just about what you accomplish, but what you learn about yourself along the way. Our goal is to give you the tools and clarity to grow with intention, at your own pace.</p></div>
        <div className="lp-team"><div><p className="lp-eyebrow">THE PEOPLE BEHIND OHARA</p><h2>Our Team</h2><span className="lp-team-rule" /></div><div className="lp-team-story">
          <p>OHARA began with four longtime friends, fresh out of college, who shared a simple idea: to create something meaningful and genuinely useful. Coming from backgrounds in engineering and science, we've always valued learning, organization, and the importance of building healthy habits.</p>
          <p>As artificial intelligence became a bigger part of everyday life, we wanted to approach it a little differently. We believe technology should help people understand themselves, not take away from the effort and experiences that make personal growth meaningful.</p>
          <p>Our hope is that OHARA becomes more than just another app. We want it to be a space where you can organize your ideas, work toward your goals, reflect on your experiences, and discover more about yourself along the way.</p>
          <p>Most importantly, we're building OHARA with the understanding that we're growing and learning, too. We're excited to see how OHARA will evolve, and we're grateful to have you be part of that journey.</p>
          <p className="lp-signature"><em>Thank you,</em><br /><strong>The OHARA Team</strong></p>
        </div></div>
      </div></section>
      <section id="coming-soon" tabIndex={-1} className="lp-section lp-coming" aria-labelledby="coming-title"><div className="lp-container"><p className="lp-eyebrow">LOOKING AHEAD</p><h2 id="coming-title">Coming Soon</h2><p className="lp-coming-intro">Thoughtfully exploring what comes next.</p><div className="lp-coming-grid"><article><span className="lp-status">UPCOMING</span><BrandIcon name="echo" color="#315743" size={36} /><h3>Echo</h3><p>Upcoming AI-powered analysis, personalized insights, and pattern recognition — designed to help you understand your growth with more clarity.</p></article><article><span className="lp-status">CONCEPT · UNDER EXPLORATION</span><BrandIcon name="goals" color="#315743" size={36} /><h3>OHARA Athlete</h3><p>A future product concept bringing fitness and personal development together. An idea we’re exploring, with more to discover along the way.</p></article></div><p className="lp-future-note">These experiences, along with our planned Circles community, are not yet available. We’ll share more as they take shape.</p></div></section>
      <section className="lp-section lp-invitation" aria-labelledby="invitation-title"><div className="lp-container"><p className="lp-eyebrow">BEGIN WITH WHAT MATTERS</p><h2 id="invitation-title">Make room for<br />who you’re becoming.</h2><p>One intention. One step. Your own way forward.</p><GetStarted /></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-container"><Wordmark /><p>Grow with intention.</p><small>© {new Date().getFullYear()} OharaAI</small></div></footer>
  </div>;
}
