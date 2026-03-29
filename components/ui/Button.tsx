import { TouchableOpacity, Text } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  const base = 'rounded-full px-6 py-3 items-center';
  const variants = {
    primary: `${base} bg-near-black`,
    secondary: `${base} bg-card-bg border border-muted`,
    ghost: `${base}`,
  };
  const textVariants = {
    primary: 'text-cream font-semibold',
    secondary: 'text-near-black font-medium',
    ghost: 'text-near-black font-medium',
  };

  return (
    <TouchableOpacity className={variants[variant]} onPress={onPress}>
      <Text className={textVariants[variant]}>{label}</Text>
    </TouchableOpacity>
  );
}
