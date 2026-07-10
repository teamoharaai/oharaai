import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'field-label' | 'caption' | 'ai' | 'ai-italic' | 'eyebrow' | 'section-eyebrow' | 'greeting' | 'emphasis-sm' | 'meta' | 'content' | 'nav-back' | 'section-header' | 'nav-title' | 'subtitle' | 'hint' | 'description' | 'badge-text' | 'micro-label' | 'card-title' | 'card-description' | 'goal-title';

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:         'font-semibold text-2xl text-[#211F1A]',
  title:           'font-medium text-lg text-[#211F1A]',
  body:            'font-sans text-base text-[#8A8172]',
  label:           'font-medium text-sm text-[#8A8172]',
  'field-label':   'font-sans text-sm font-medium text-[#211F1A]',
  caption:         'font-sans text-xs text-[#A79E8E]',
  ai:              'font-serif text-base text-[#4A7C5F] leading-relaxed',
  'ai-italic':     'font-serif-italic text-base text-[#4A7C5F] leading-relaxed',
  eyebrow:         'font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#8A8172]',
  'section-eyebrow':'font-semibold text-[11px] uppercase tracking-[2px] text-teal-soft',
  greeting:        'font-serif-italic-semibold text-[27px] tracking-[-0.2px] text-[#211F1A]',
  'emphasis-sm':   'text-sm font-semibold',
  meta:            'font-sans text-[13px] leading-5',
  content:         'font-sans text-[14px] leading-[21px] text-[#211F1A]',
  'nav-back':      'text-[15px] text-[#4A7C5F]',
  'section-header':'text-lg font-semibold text-[#211F1A]',
  'nav-title':     'text-[15px] font-medium text-[#211F1A]',
  subtitle:        'font-sans text-sm text-[#8A8172]',
  hint:            'font-sans text-xs text-[#8A8172]',
  description:     'font-sans text-[14px] leading-[21px] text-[#8A8172]',
  'badge-text':    'font-sans text-[11px] font-medium',
  'micro-label':   'font-sans text-[13px] text-[#A79E8E]',
  'card-title':      'font-medium text-[15.5px] text-[#211F1A]', // ProjectCard title (exact spec)
  'card-description':'font-sans text-[12px] leading-[18px] text-[#8A8172]', // ProjectCard description (exact spec)
  'goal-title':      'font-semibold text-[14.5px] leading-[19px] text-[#211F1A]', // GoalRingCard title (exact spec)
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
  const baseClasses = VARIANT_CLASSES[variant];
  const combined = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <Text className={combined} style={style} {...rest}>
      {children}
    </Text>
  );
}

export default Typography;
