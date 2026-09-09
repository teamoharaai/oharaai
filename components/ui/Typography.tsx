import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import type { ThemeTextColor } from '@/constants/colors';
import { FONT, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

type Variant = 'heading' | 'title' | 'body' | 'body-small' | 'body-large' | 'control' | 'editor-body' | 'chart-label' | 'label' | 'field-label' | 'caption' | 'ai' | 'ai-italic' | 'eyebrow' | 'section-eyebrow' | 'greeting' | 'emphasis-sm' | 'meta' | 'content' | 'nav-back' | 'section-header' | 'nav-title' | 'subtitle' | 'hint' | 'description' | 'badge-text' | 'micro-label' | 'card-title' | 'card-description' | 'goal-title' | 'active-goal-title' | 'echo-entry-title' | 'echo-entry-preview' | 'echo-entry-meta' | 'echo-add-button' | 'echo-detail-meta' | 'echo-detail-title' | 'echo-detail-body' | 'echo-empty-title' | 'echo-empty-subtitle';

// Variants confirmed to route through theme text tokens.
// Every other variant keeps its existing color behavior pending a follow-up prompt.
const VARIANT_COLOR_KEY: Partial<Record<Variant, ThemeTextColor>> = {
  heading: 'primary',
  title: 'primary',
  body: 'secondary',
  'body-small': 'secondary',
  'body-large': 'primary',
  control: 'secondary',
  'editor-body': 'primary',
  'chart-label': 'muted',
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

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  heading: TYPE.pageTitle,
  title: TYPE.cardTitle,
  body: TYPE.body,
  'body-small': TYPE.bodySmall,
  'body-large': TYPE.bodyLarge,
  control: TYPE.control,
  'editor-body': TYPE.editorBody,
  'chart-label': TYPE.chartLabel,
  label: { ...TYPE.bodySmall, fontFamily: FONT.ui.medium },
  'field-label': { ...TYPE.bodySmall, fontFamily: FONT.ui.medium },
  caption: TYPE.caption,
  ai: { ...TYPE.body, color: undefined },
  'ai-italic': { ...TYPE.body, fontFamily: FONT.ui.italic, fontStyle: 'italic' },
  eyebrow: { ...TYPE.overline, letterSpacing: 1.4, textTransform: 'uppercase' },
  'section-eyebrow': {
    ...TYPE.overline,
    fontFamily: FONT.ui.semibold,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: FONT.ui.semibold,
    fontSize: 32,
    letterSpacing: -0.45,
    lineHeight: 40,
  },
  'emphasis-sm': { ...TYPE.bodySmall, fontFamily: FONT.ui.medium },
  meta: TYPE.meta,
  content: { ...TYPE.body, fontSize: 15, lineHeight: 23 },
  'nav-back': TYPE.control,
  'section-header': TYPE.sectionTitle,
  'nav-title': TYPE.control,
  subtitle: TYPE.bodySmall,
  hint: TYPE.caption,
  description: { ...TYPE.body, fontSize: 15, lineHeight: 23 },
  'badge-text': { ...TYPE.meta, lineHeight: 16 },
  'micro-label': TYPE.meta,
  'card-title': TYPE.cardTitle,
  'card-description': TYPE.bodySmall,
  'goal-title': TYPE.cardTitle,
  'active-goal-title': TYPE.sectionTitle,
  'echo-entry-title': { ...TYPE.bodySmall, fontFamily: FONT.ui.medium, lineHeight: 20 },
  'echo-entry-preview': TYPE.caption,
  'echo-entry-meta': TYPE.meta,
  'echo-add-button': TYPE.control,
  'echo-detail-meta': { ...TYPE.caption, fontFamily: FONT.ui.medium },
  'echo-detail-title': TYPE.pageTitle,
  'echo-detail-body': TYPE.editorBody,
  'echo-empty-title': TYPE.cardTitle,
  'echo-empty-subtitle': TYPE.bodySmall,
};

function explicitClassFont(className: string): TextStyle | undefined {
  if (className.includes('font-inter-extrabold')) return { fontFamily: 'Inter-ExtraBold' };
  if (className.includes('font-inter-bold')) return { fontFamily: FONT.ui.bold };
  if (className.includes('font-inter-semibold')) return { fontFamily: FONT.ui.semibold };
  if (className.includes('font-inter-medium')) return { fontFamily: FONT.ui.medium };
  if (className.includes('font-inter-regular')) return { fontFamily: FONT.ui.regular };
  return undefined;
}

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
  const colorKey = VARIANT_COLOR_KEY[variant];
  const variantStyle = colorKey ? { color: colors.text[colorKey] } : undefined;

  return (
    <Text
      className={className}
      style={[VARIANT_STYLES[variant], explicitClassFont(className), variantStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default Typography;
