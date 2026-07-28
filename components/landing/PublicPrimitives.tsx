import { Link, type Href, usePathname } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';

const LOGO = require('../../assets/brand/ohara-logo.png');

export const PUBLIC_COLORS = {
  page: LIGHT_THEME.background.page,
  surface: LIGHT_THEME.background.card,
  surfaceSoft: LIGHT_THEME.background.goalCard,
  ink: LIGHT_THEME.text.primary,
  muted: LIGHT_THEME.text.secondary,
  quiet: LIGHT_THEME.text.muted,
  forest: LIGHT_THEME.accent.primary,
  forestDark: '#234434',
  sage: LIGHT_THEME.accent.tealSoft,
  sageSoft: LIGHT_THEME.background.selectedRow,
  border: LIGHT_THEME.border.warm,
  divider: LIGHT_THEME.border.divider,
  dividerSubtle: 'rgba(216, 209, 197, 0.38)',
  dividerSubtleDark: 'rgba(237, 230, 216, 0.14)',
};

const interactive = {
  cursor: 'pointer',
  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease, transform 160ms ease',
} as any;

export function PublicButton({
  href,
  label,
  primary = false,
}: {
  href: Href;
  label: string;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={{
          ...interactive,
          alignItems: 'center',
          backgroundColor: primary ? (hovered ? '#35634A' : PUBLIC_COLORS.forest) : hovered ? PUBLIC_COLORS.sageSoft : 'transparent',
          borderColor: primary ? PUBLIC_COLORS.forest : PUBLIC_COLORS.divider,
          borderRadius: 999,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: 46,
          paddingHorizontal: 24,
          paddingVertical: 11,
        }}
      >
        <Typography
          className="font-inter-semibold"
          style={{ color: primary ? LIGHT_THEME.text.onAccent : PUBLIC_COLORS.ink, fontSize: 14, lineHeight: 20 }}
        >
          {label}
        </Typography>
      </Pressable>
    </Link>
  );
}

type HeaderMode = 'default' | 'login' | 'signup';

export type PublicSectionId = 'product' | 'momentum' | 'echo' | 'constellation';

export function scrollToPublicSection(section: PublicSectionId, behavior: ScrollBehavior = 'smooth') {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(section);
  if (!target) return;
  target.scrollIntoView({ behavior, block: 'start' });
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

const NAV_ITEMS: { label: string; href: Href; section?: PublicSectionId }[] = [
  { label: 'Product', href: '/#product' as Href, section: 'product' },
  { label: 'Momentum', href: '/#momentum' as Href, section: 'momentum' },
  { label: 'Echo', href: '/#echo' as Href, section: 'echo' },
  { label: 'Constellation', href: '/#constellation' as Href, section: 'constellation' },
  { label: 'About Us', href: '/about' as Href },
];

function HeaderLink({
  href,
  label,
  onPress,
  section,
}: {
  href: Href;
  label: string;
  onPress?: () => void;
  section?: PublicSectionId;
}) {
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();

  const handlePress = (event: any) => {
    onPress?.();
    if (section && pathname === '/' && typeof window !== 'undefined') {
      event?.preventDefault?.();
      window.history.pushState(null, '', `/#${section}`);
      scrollToPublicSection(section);
    }
  };

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={handlePress}
        style={{ ...interactive, paddingHorizontal: 5, paddingVertical: 8 }}
      >
        <Typography
          className="font-inter-medium"
          style={{ color: hovered ? PUBLIC_COLORS.forest : PUBLIC_COLORS.ink, fontSize: 13, lineHeight: 18 }}
        >
          {label}
        </Typography>
      </Pressable>
    </Link>
  );
}

export function PublicHeader({ mode = 'default' }: { mode?: HeaderMode }) {
  const { width } = useWindowDimensions();
  const mobile = width < 920;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<View>(null);

  useEffect(() => {
    if (!menuOpen || typeof document === 'undefined') return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeOutside = (event: MouseEvent) => {
      const node = menuRef.current as unknown as HTMLElement | null;
      if (node && !node.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOutside);
    };
  }, [menuOpen]);

  const showLogin = mode === 'default';
  const primaryHref: Href = mode === 'signup' ? '/(auth)/login' : '/(auth)/signup';
  const primaryLabel = mode === 'signup' ? 'Log in' : 'Start your journey';

  return (
    <View
      ref={menuRef}
      style={{
        backgroundColor: 'rgba(247,244,238,0.96)',
        borderBottomColor: PUBLIC_COLORS.dividerSubtle,
        borderBottomWidth: 1,
        paddingHorizontal: mobile ? 20 : 42,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          height: mobile ? 70 : 76,
          justifyContent: 'space-between',
          marginHorizontal: 'auto',
          maxWidth: 1440,
          width: '100%',
        }}
      >
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="OHARA home"
            accessibilityRole="link"
            style={{ ...interactive, alignItems: 'center', flexDirection: 'row', gap: 10 }}
          >
            <Image source={LOGO} resizeMode="contain" style={{ height: 32, tintColor: PUBLIC_COLORS.forest, width: 32 }} />
            <Typography
              className="font-inter-semibold"
              style={{ color: PUBLIC_COLORS.ink, fontSize: 13, letterSpacing: 3.2, lineHeight: 18 }}
            >
              OHARA
            </Typography>
          </Pressable>
        </Link>

        {!mobile ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 22 }}>
            {NAV_ITEMS.map((item) => <HeaderLink key={item.label} {...item} />)}
          </View>
        ) : null}

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
          {!mobile && showLogin ? <HeaderLink href="/(auth)/login" label="Log in" /> : null}
          <PublicButton href={primaryHref} label={primaryLabel} primary />
          {mobile ? (
            <Pressable
              accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              accessibilityRole="button"
              accessibilityState={{ expanded: menuOpen }}
              onPress={() => setMenuOpen((open) => !open)}
              style={{
                ...interactive,
                alignItems: 'center',
                borderColor: PUBLIC_COLORS.divider,
                borderRadius: 999,
                borderWidth: 1,
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              <View style={{ gap: 4 }}>
                <View style={{ backgroundColor: PUBLIC_COLORS.ink, height: 1.5, width: 17 }} />
                <View style={{ backgroundColor: PUBLIC_COLORS.ink, height: 1.5, width: 17 }} />
                <View style={{ backgroundColor: PUBLIC_COLORS.ink, height: 1.5, width: 17 }} />
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
      {mobile && menuOpen ? (
        <View
          accessibilityRole="menu"
          style={{
            backgroundColor: PUBLIC_COLORS.surface,
            borderColor: PUBLIC_COLORS.border,
            borderRadius: 18,
            borderWidth: 1,
            gap: 2,
            padding: 14,
            position: 'absolute',
            right: 20,
            shadowColor: PUBLIC_COLORS.ink,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            top: 64,
            width: 220,
          }}
        >
          {NAV_ITEMS.map((item) => <HeaderLink key={item.label} {...item} onPress={() => setMenuOpen(false)} />)}
          {showLogin ? <HeaderLink href="/(auth)/login" label="Log in" onPress={() => setMenuOpen(false)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function PublicPageCanvas({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const framed = width >= 1180;
  return (
    <View style={{ backgroundColor: '#EFEAE2', flex: 1, padding: framed ? 16 : 0 }}>
      <View
        style={{
          backgroundColor: PUBLIC_COLORS.page,
          borderColor: framed ? PUBLIC_COLORS.border : 'transparent',
          borderRadius: framed ? 30 : 0,
          borderWidth: framed ? 1 : 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function PublicSectionHeading({
  eyebrow,
  title,
  body,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: 'left' | 'center';
}) {
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start', maxWidth: 590 }}>
      <Typography
        className="font-inter-semibold"
        style={{ color: PUBLIC_COLORS.forest, fontSize: 11, letterSpacing: 2, lineHeight: 16, marginBottom: 14, textTransform: 'uppercase' }}
      >
        {eyebrow}
      </Typography>
      <Typography
        className="font-inter-medium"
        style={{ color: PUBLIC_COLORS.ink, fontSize: 38, letterSpacing: -1.3, lineHeight: 44, textAlign: align }}
      >
        {title}
      </Typography>
      {body ? (
        <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 15, lineHeight: 24, marginTop: 18, textAlign: align }}>
          {body}
        </Typography>
      ) : null}
    </View>
  );
}

export function PreviewSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderColor: PUBLIC_COLORS.border,
          borderRadius: 18,
          borderWidth: 1,
          padding: 20,
          shadowColor: PUBLIC_COLORS.ink,
          shadowOffset: { width: 0, height: 9 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PublicFooter() {
  return (
    <View style={{ alignItems: 'center', borderTopColor: PUBLIC_COLORS.dividerSubtle, borderTopWidth: 1, padding: 30 }}>
      <Typography style={{ color: PUBLIC_COLORS.quiet, fontSize: 12, lineHeight: 18 }}>© 2026 OharaAI</Typography>
    </View>
  );
}
