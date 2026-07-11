import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';

type EchoPaneResizerProps = {
  width: number;
  onResize: (width: number) => void;
};

export function EchoPaneResizer({
  width,
  onResize,
}: EchoPaneResizerProps) {
  const startWidthRef = useRef(width);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startWidthRef.current = width;
        },
        onPanResponderMove: (_event, gestureState) => {
          onResize(startWidthRef.current - gestureState.dx);
        },
      }),
    [onResize, width],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        alignItems: 'center',
        bottom: 0,
        cursor: 'col-resize',
        justifyContent: 'center',
        left: -4,
        position: 'absolute',
        top: 0,
        width: 8,
        zIndex: 5,
      } as any}
    >
      <View
        style={{
          backgroundColor: LIGHT_THEME.border.divider,
          height: '100%',
          width: 1,
        } as any}
      />
    </View>
  );
}
