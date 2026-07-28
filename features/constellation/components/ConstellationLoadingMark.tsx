import { ActivityIndicator, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface ConstellationLoadingMarkProps {
  color: string;
  size?: 'small' | 'large';
}

/** A non-animated equivalent for indeterminate loading states. */
export function ConstellationLoadingMark({
  color,
  size = 'small',
}: ConstellationLoadingMarkProps) {
  const reducedMotion = useReducedMotion();

  if (!reducedMotion) {
    return <ActivityIndicator color={color} size={size} />;
  }

  const dimension = size === 'large' ? 24 : 14;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: color,
        borderRadius: dimension / 2,
        height: dimension,
        opacity: 0.75,
        width: dimension,
      }}
    />
  );
}
