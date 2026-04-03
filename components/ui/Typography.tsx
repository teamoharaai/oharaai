import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'caption' | 'ai' | 'ai-italic';

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:     'font-semibold text-2xl text-[#1A1F1C]',
  title:       'font-medium font-sans text-lg text-[#1A1F1C]',
  body:        'font-sans text-base text-[#6B7B6E]',
  label:       'font-medium text-sm text-[#6B7B6E]',
  caption:     'font-sans text-xs text-[#9CAF9F]',
  ai:          'font-serif text-base text-[#4A7C5F] leading-relaxed',
  'ai-italic': 'font-serif-italic text-base text-[#4A7C5F] leading-relaxed',
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
