import { Platform, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import type { ThemeTextColor } from '@/constants/colors';
import { useThemeColors } from '@/store/uiStore';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'field-label' | 'caption' | 'ai' | 'ai-italic' | 'eyebrow' | 'section-eyebrow' | 'greeting' | 'emphasis-sm' | 'meta' | 'content' | 'nav-back' | 'section-header' | 'nav-title' | 'subtitle' | 'hint' | 'description' | 'badge-text' | 'micro-label' | 'card-title' | 'card-description' | 'goal-title' | 'active-goal-title' | 'echo-entry-title' | 'echo-entry-preview' | 'echo-entry-meta' | 'echo-add-button' | 'echo-detail-meta' | 'echo-detail-title' | 'echo-detail-body' | 'echo-empty-title' | 'echo-empty-subtitle';

// Variants confirmed to route through theme text tokens.
// Every other variant keeps its existing color behavior pending a follow-up prompt.
const VARIANT_COLOR_KEY: Partial<Record<Variant, ThemeTextColor>> = {
  heading: 'primary',
  title: 'primary',
  body: 'secondary',
  caption: 'secondary',
  'field-label': 'primary',
  greeting: 'primary',
  content: 'primary',
  'nav-title': 'primary',
  'section-header': 'primary',
  'card-title': 'primary',
  'goal-title': 'primary',
  'echo-entry-title': 'primary',
  'echo-detail-title': 'primary',
  'echo-detail-body': 'primary',
  'echo-empty-title': 'primary',
  'emphasis-sm': 'primary',
  'active-goal-title': 'primary',
  'section-eyebrow': 'accent',
  label: 'secondary',
  eyebrow: 'secondary',
  subtitle: 'secondary',
  hint: 'secondary',
  description: 'secondary',
  'card-description': 'secondary',
  'echo-entry-preview': 'secondary',
  'echo-detail-meta': 'secondary',
  'echo-empty-subtitle': 'secondary',
  meta: 'secondary',
  'micro-label': 'muted',
  'echo-entry-meta': 'muted',
  ai: 'accent',
  'ai-italic': 'accent',
  'nav-back': 'accent',
  'echo-add-button': 'inverse',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:         'font-inter-semibold text-2xl leading-8',
  title:           'font-inter-medium text-lg leading-[26px]',
  body:            'font-sans text-base leading-6',
  label:           'font-inter-medium text-sm',
  'field-label':   'font-sans text-sm font-inter-medium',
  caption:         'font-sans text-xs',
  ai:              'font-sans text-base leading-relaxed',
  'ai-italic':     'font-sans italic text-base leading-relaxed',
  eyebrow:         'font-sans text-[11px] font-inter-medium uppercase tracking-[1.5px]',
  'section-eyebrow':'font-inter-semibold text-[11px] uppercase tracking-[2px]',
  greeting:        'font-inter-semibold text-[32px] leading-10 tracking-[-0.45px]',
  'emphasis-sm':   'text-sm font-inter-medium',
  meta:            'font-sans text-[13px] leading-5',
  content:         'font-sans text-[14px] leading-[21px]',
  'nav-back':      'text-[15px]',
  'section-header':'text-xl font-inter-medium',
  'nav-title':     'text-[15px] font-inter-medium',
  subtitle:        'font-sans text-sm',
  hint:            'font-sans text-xs',
  description:     'font-sans text-[14px] leading-[21px]',
  'badge-text':    'font-sans text-[11px] font-inter-medium',
  'micro-label':   'font-sans text-[13px]',
  'card-title':      'font-inter-medium text-[15.5px]', // ProjectCard title (exact spec)
  'card-description':'font-sans text-[12px] leading-[18px]', // ProjectCard description (exact spec)
  'goal-title':      'font-inter-medium text-[16px] leading-6',
  'active-goal-title': 'font-inter-medium text-[18px] leading-[26px]',
  'echo-entry-title':   'font-inter-medium text-echo-sm',
  'echo-entry-preview': 'font-sans text-echo-xs', // EchoEntryRow snippet
  'echo-entry-meta':    'font-inter-medium text-echo-2xs', // EchoEntryRow timestamp caption
  'echo-add-button':    'font-inter-medium text-echo-sm',
  'echo-detail-meta':   'font-inter-medium text-echo-xs',
  'echo-detail-title':  'font-inter-semibold text-echo-lg',
  'echo-detail-body':   'font-sans text-echo-base', // EchoDetailPane entry content
  'echo-empty-title':   'font-inter-medium text-echo-md',
  'echo-empty-subtitle':'font-sans text-echo-sm-loose', // EchoDetailPane empty-state subtext
};

interface TypographyProps extends Omit<TextProps, 'style'> {
  variant?: Variant;
  className?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function Typography({
  variant = 'body',
  className = '',
  style,
  children,
  ...rest
}: TypographyProps) {
  const colors = useThemeColors();
  const baseClasses = VARIANT_CLASSES[variant];
  const combined = className ? `${baseClasses} ${className}` : baseClasses;

  const colorKey = VARIANT_COLOR_KEY[variant];
  const variantStyle = colorKey ? { color: colors.text[colorKey] } : undefined;
  const systemFontStyle = Platform.OS === 'web'
    ? { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif' }
    : undefined;

  return (
    <Text className={combined} style={[systemFontStyle, variantStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

export default Typography;
