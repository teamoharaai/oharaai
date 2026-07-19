import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'field-label' | 'caption' | 'ai' | 'ai-italic' | 'eyebrow' | 'section-eyebrow' | 'greeting' | 'emphasis-sm' | 'meta' | 'content' | 'nav-back' | 'section-header' | 'nav-title' | 'subtitle' | 'hint' | 'description' | 'badge-text' | 'micro-label' | 'card-title' | 'card-description' | 'goal-title' | 'active-goal-title' | 'echo-entry-title' | 'echo-entry-preview' | 'echo-entry-meta' | 'echo-add-button' | 'echo-detail-meta' | 'echo-detail-title' | 'echo-detail-body' | 'echo-empty-title' | 'echo-empty-subtitle';

// Variants confirmed to route through theme tokens (text.primary / text.secondary).
// Every other variant keeps its hardcoded hex in VARIANT_CLASSES below pending a follow-up prompt.
const VARIANT_COLOR_KEY: Partial<Record<Variant, 'primary' | 'secondary'>> = {
  heading: 'primary',
  title: 'primary',
  body: 'secondary',
  caption: 'secondary',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:         'font-inter-semibold text-2xl',
  title:           'font-inter-medium text-lg',
  body:            'font-sans text-base',
  label:           'font-inter-medium text-sm text-[#8A8172]',
  'field-label':   'font-sans text-sm font-inter-medium text-[#211F1A]',
  caption:         'font-sans text-xs',
  ai:              'font-serif text-base text-[#4A7C5F] leading-relaxed',
  'ai-italic':     'font-serif-italic text-base text-[#4A7C5F] leading-relaxed',
  eyebrow:         'font-sans text-[11px] font-inter-medium uppercase tracking-[1.5px] text-[#8A8172]',
  'section-eyebrow':'font-inter-semibold text-[11px] uppercase tracking-[2px] text-teal-soft',
  greeting:        'font-serif-italic-semibold text-[27px] tracking-[-0.2px] text-[#211F1A]',
  'emphasis-sm':   'text-sm font-inter-semibold',
  meta:            'font-sans text-[13px] leading-5',
  content:         'font-sans text-[14px] leading-[21px] text-[#211F1A]',
  'nav-back':      'text-[15px] text-[#4A7C5F]',
  'section-header':'text-lg font-inter-semibold text-[#211F1A]',
  'nav-title':     'text-[15px] font-inter-medium text-[#211F1A]',
  subtitle:        'font-sans text-sm text-[#8A8172]',
  hint:            'font-sans text-xs text-[#8A8172]',
  description:     'font-sans text-[14px] leading-[21px] text-[#8A8172]',
  'badge-text':    'font-sans text-[11px] font-inter-medium',
  'micro-label':   'font-sans text-[13px] text-[#A79E8E]',
  'card-title':      'font-inter-medium text-[15.5px] text-[#211F1A]', // ProjectCard title (exact spec)
  'card-description':'font-sans text-[12px] leading-[18px] text-[#8A8172]', // ProjectCard description (exact spec)
  'goal-title':      'font-inter-semibold text-[14.5px] leading-[19px] text-[#211F1A]', // GoalRingCard title (exact spec)
  'active-goal-title': 'font-inter-semibold text-[17px] leading-6 text-[#211F1A]', // dashboard ActiveGoalCard title (exact spec)
  'echo-entry-title':   'font-inter-bold text-echo-sm text-[#211F1A]', // EchoEntryRow title
  'echo-entry-preview': 'font-sans text-echo-xs text-[#8A8172]', // EchoEntryRow snippet
  'echo-entry-meta':    'font-inter-medium text-echo-2xs text-[#A79E8E]', // EchoEntryRow timestamp caption
  'echo-add-button':    'font-inter-semibold text-echo-sm text-[#EDE7DA]', // EchoScreen "+ Add an entry"
  'echo-detail-meta':   'font-inter-semibold text-echo-xs text-[#8A8172]', // EchoDetailPane container/date header
  'echo-detail-title':  'font-inter-extrabold text-echo-lg text-[#211F1A]', // EchoDetailPane entry title
  'echo-detail-body':   'font-sans text-echo-base text-[#211F1A]', // EchoDetailPane entry content
  'echo-empty-title':   'font-inter-bold text-echo-md text-[#211F1A]', // EchoDetailPane "Select an entry"
  'echo-empty-subtitle':'font-sans text-echo-sm-loose text-[#8A8172]', // EchoDetailPane empty-state subtext
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

  return (
    <Text className={combined} style={[variantStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

export default Typography;
