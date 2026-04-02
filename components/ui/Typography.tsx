import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

type Variant = 'heading' | 'title' | 'body' | 'label' | 'caption' | 'ai' | 'ai-italic';

const VARIANT_CLASSES: Record<Variant, string> = {
  heading:     'font-semibold text-2xl text-white',
  title:       'font-medium text-lg text-white',
  body:        'font-sans text-base text-[#C0C0CC]',
  label:       'font-medium text-sm text-[#888899]',
  caption:     'font-sans text-xs text-[#555566]',
  ai:          'font-serif text-base text-[#C8D8C8] leading-relaxed',
  'ai-italic': 'font-serif-italic text-base text-[#C8D8C8] leading-relaxed',
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
