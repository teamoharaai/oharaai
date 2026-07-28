import { Image, View, type ImageResizeMode, type StyleProp, type ViewStyle } from 'react-native';

const ARTWORK = {
  branch: require('../../assets/brand/artwork/ohara-branch.png'),
  veinDark: require('../../assets/brand/artwork/ohara-vein-dark.png'),
  veinLight: require('../../assets/brand/artwork/ohara-vein-light.png'),
  woodgrain: require('../../assets/brand/artwork/ohara-woodgrain.png'),
};

export type BrandArtworkVariant = 'vein' | 'woodgrain' | 'branch';

export function BrandArtwork({
  dark = false,
  fit = 'contain',
  opacity = 0.14,
  rotation = 0,
  style,
  variant,
}: {
  dark?: boolean;
  fit?: ImageResizeMode;
  opacity?: number;
  rotation?: number;
  style?: StyleProp<ViewStyle>;
  variant: BrandArtworkVariant;
}) {
  const source =
    variant === 'vein'
      ? dark
        ? ARTWORK.veinDark
        : ARTWORK.veinLight
      : ARTWORK[variant];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ opacity, overflow: 'hidden' }, style]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode={fit}
        source={source}
        style={{
          height: '100%',
          transform: rotation ? [{ rotate: `${rotation}deg` }] : undefined,
          width: '100%',
        }}
      />
    </View>
  );
}
