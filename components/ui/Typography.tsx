import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'caption' | 'ai' | 'ai-italic' | 'eyebrow' | 'emphasis-sm' | 'meta' | 'content' | 'nav-back' | 'section-header' | 'nav-title' | 'subtitle' | 'hint';

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:         'font-semibold text-2xl text-[#1A1F1C]',
  title:           'font-medium text-lg text-[#1A1F1C]',
  body:            'font-sans text-base text-[#6B7B6E]',
  label:           'font-medium text-sm text-[#6B7B6E]',
  caption:         'font-sans text-xs text-[#9CAF9F]',
  ai:              'font-serif text-base text-[#4A7C5F] leading-relaxed',
  'ai-italic':     'font-serif-italic text-base text-[#4A7C5F] leading-relaxed',
  eyebrow:         'font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]',
  'emphasis-sm':   'text-sm font-semibold',
  meta:            'font-sans text-[13px] leading-5',
  content:         'font-sans text-[14px] leading-[21px] text-[#1A1F1C]',
  'nav-back':      'text-[15px] text-[#4A7C5F]',
  'section-header':'text-lg font-semibold text-[#1A1F1C]',
  'nav-title':     'text-[15px] font-medium text-[#1A1F1C]',
  subtitle:        'font-sans text-sm text-[#6B7B6E]',
  hint:            'font-sans text-xs text-[#6B7B6E]',
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
