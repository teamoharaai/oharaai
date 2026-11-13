import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useWindowDimensions } from 'react-native';
import { router, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { VaultIcon } from '@/components/ui/VaultIcon';
import { FEATURES } from '@/constants/features';
import { WORKSPACE, WORKSPACE_DARK, WORKSPACE_LIGHT } from '@/constants/workspace';
import { useUIStore } from '@/store/uiStore';
import { AvatarMenu } from './AvatarMenu';
import { SettingsModal } from './SettingsModal';
import { GlobalCreateControl } from './GlobalCreateControl';
import { WorkspaceDimensionsContext, WorkspaceThemeContext } from './WorkspaceContext';
import { WORKSPACE_LINKS, isWorkspaceLinkActive } from './workspace-navigation';
import type { WorkspaceShellProps } from './WorkspaceShell';
import './workspace-v2.css';

const preferenceKey = 'ohara:workspace-v2:sidebar-collapsed';

export function WorkspaceShell({ children, onNewEntry, onNewProject }: WorkspaceShellProps) {
  const { width, height } = useWindowDimensions();
  const desktop = width >= WORKSPACE.sidebar.desktopMin;
  const theme = useUIStore((state) => state.themeMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const colors = theme === 'dark' ? WORKSPACE_DARK : WORKSPACE_LIGHT;
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ view?: string | string[] }>();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(preferenceKey) === 'true'); } catch { /* Optional preference. */ }
  }, []);
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(preferenceKey, String(next)); } catch { /* Storage may be disabled. */ }
  }
  useEffect(() => { setMenuOpen(false); }, [pathname, params.view, desktop]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !desktop) {
      dialog.showModal();
      drawerClose.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [menuOpen, desktop]);

  const links = WORKSPACE_LINKS.filter((item) => (
    (item.group !== 'vault' || FEATURES.ECHO_ENABLED)
    && (item.label !== 'Roots' || FEATURES.CONSTELLATION_ENABLED)
    && (item.label !== 'Circles' || FEATURES.CIRCLES_ENABLED)
  ));
  const current = links.find((item) => isWorkspaceLinkActive(item, pathname, params.view));
  const rail = desktop && collapsed;
  const sidebarWidth = desktop ? rail ? WORKSPACE.sidebar.collapsed : WORKSPACE.sidebar.expanded : 0;
  const style = {
    '--ws-page': colors.background.page, '--ws-card': colors.background.card,
    '--ws-sidebar': colors.background.sidebar, '--ws-ink': colors.text.primary,
    '--ws-muted': colors.text.secondary, '--ws-accent': colors.text.accent,
    '--ws-selected': colors.background.selectedRow, '--ws-hover': colors.background.hoverAccent,
    '--ws-border': colors.border.divider, '--ws-focus': colors.border.accent,
    '--ws-sidebar-width': `${sidebarWidth}px`,
  } as CSSProperties;

  function closeDrawer() { setMenuOpen(false); menuTrigger.current?.focus(); }
  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    // Retain real anchor behavior for new tabs, modifiers and context menus.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMenuOpen(false);
    router.push(href as Href);
    requestAnimationFrame(() => mainRef.current?.focus());
  }
  const navigation = (iconRail: boolean) => <>
    <div className="ws-brand-row">
      <a href="/dashboard" className="ws-brand" aria-label="OharaAI Home" title={iconRail ? 'OharaAI Home' : undefined} onClick={(event) => navigate(event, '/dashboard')}>
        <BrandIcon name="ohara" size={32} color={colors.text.accent} />
        {!iconRail && <span>OharaAI</span>}
      </a>
      {!desktop && <button ref={drawerClose} type="button" className="ws-icon-button" aria-label="Close navigation" onClick={closeDrawer}><Ionicons name="close-outline" size={22} color={colors.text.secondary} /></button>}
    </div>
    <div className="ws-nav-scroll">
      {(['workspace', 'vault', 'insight'] as const).map((group) => {
        const items = links.filter((item) => item.group === group);
        if (!items.length) return null;
        const label = { workspace: 'Workspace', vault: 'Vault', insight: 'Perspective' }[group];
        return <nav key={group} aria-label={label} className="ws-nav-group">
          <div className={`ws-group-label ${iconRail ? 'ws-sr-only' : ''}`}>{group === 'vault' && !iconRail ? <VaultIcon size={16} color={colors.text.secondary} /> : null}{label}</div>
          {items.map((item) =>
            <a key={item.label} href={item.href} className="ws-nav-link" aria-label={item.label} aria-current={isWorkspaceLinkActive(item, pathname, params.view) ? 'page' : undefined}
              title={iconRail ? item.label : undefined} onClick={(event) => navigate(event, item.href)}>
              {item.icon === 'home-outline'
                ? <Ionicons name="home-outline" size={20} color="currentColor" />
                : item.icon === 'vault'
                  ? <VaultIcon size={20} color="currentColor" />
                  : <BrandIcon name={item.icon} size={20} color={isWorkspaceLinkActive(item, pathname, params.view) ? colors.text.accent : colors.text.secondary} />}
              {!iconRail && <span>{item.label}</span>}
              {iconRail && <span className="ws-rail-tooltip" aria-hidden="true">{item.label}</span>}
            </a>
          )}
        </nav>;
      })}
    </div>
    <div className="ws-sidebar-footer">
      <button type="button" className="ws-nav-link" aria-label="Settings" title={iconRail ? 'Settings' : undefined} onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
        <Ionicons name="settings-outline" size={20} color="currentColor" />{!iconRail && <span>Settings</span>}
      </button>
      <button type="button" className="ws-nav-link" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={iconRail ? 'Change appearance' : undefined} onClick={toggleTheme}>
        <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color="currentColor" />{!iconRail && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
      </button>
      {desktop && <div className="ws-account"><AvatarMenu />{!iconRail && <span>Account & settings</span>}</div>}
    </div>
  </>;

  return <WorkspaceThemeContext.Provider value={colors}>
    <div className="workspace-v2" data-theme={theme} data-collapsed={rail} style={style}>
      <a className="ws-skip" href="#workspace-content" onClick={() => mainRef.current?.focus()}>Skip to content</a>
      {desktop && <aside className="ws-sidebar" aria-label="Main sidebar">{navigation(rail)}</aside>}
      <div className="ws-workspace">
        <header className="ws-toolbar">
          <div className="ws-toolbar-context">
            <button ref={menuTrigger} type="button" className="ws-icon-button" aria-label={desktop ? collapsed ? 'Expand sidebar' : 'Collapse sidebar' : 'Open navigation'} aria-expanded={desktop ? !collapsed : menuOpen} aria-controls={desktop ? undefined : 'workspace-navigation-drawer'} onClick={desktop ? toggleSidebar : () => setMenuOpen(true)}>
              <Ionicons name="menu-outline" size={22} color={colors.text.secondary} />
            </button>
            <span className="ws-context-parent">{current?.group === 'vault' ? 'Vault' : 'Workspace'}</span>
            <span className="ws-context-divider" aria-hidden="true">/</span>
            {current?.label === 'Projects' && pathname.startsWith('/projects/') ? <a className="ws-context-current" href="/projects" aria-label="Back to Projects" style={{ color: 'inherit', textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }} onClick={(event) => navigate(event, '/projects')}>Projects</a> : <span className="ws-context-current">{current?.label ?? 'Workspace'}</span>}
          </div>
          <div className="ws-toolbar-actions">
            <GlobalCreateControl inline iconOnly={width < 600} onNewEntry={onNewEntry} onNewProject={onNewProject} />
            {!desktop && <AvatarMenu />}
          </div>
        </header>
        <WorkspaceDimensionsContext.Provider value={{ width: Math.max(0, width - sidebarWidth), height: Math.max(0, height - WORKSPACE.headerHeight) }}>
          <main id="workspace-content" ref={mainRef} tabIndex={-1} className="ws-content" aria-label={`${current?.label ?? 'Workspace'} content`}>{children}</main>
        </WorkspaceDimensionsContext.Provider>
      </div>
      <dialog ref={dialogRef} id="workspace-navigation-drawer" className="ws-drawer" aria-label="Workspace navigation" onCancel={(event) => { event.preventDefault(); closeDrawer(); }} onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
        <div className="ws-drawer-panel">{!desktop && navigation(false)}</div>
      </dialog>
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  </WorkspaceThemeContext.Provider>;
}
