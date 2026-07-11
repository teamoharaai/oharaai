import { useMemo, useRef } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';

type EchoPaneResizerProps = {
  width: number;
  collapsed: boolean;
  onResize: (width: number) => void;
  onToggleCollapse: () => void;
};

export function EchoPaneResizer({
  width,
  collapsed,
  onResize,
  onToggleCollapse,
}: EchoPaneResizerProps) {
  const startWidthRef = useRef(width);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !collapsed,
        onMoveShouldSetPanResponder: () => !collapsed,
        onPanResponderGrant: () => {
          startWidthRef.current = width;
        },
        onPanResponderMove: (_event, gestureState) => {
          onResize(startWidthRef.current - gestureState.dx);
        },
      }),
    [collapsed, onResize, width],
  );

  return (
    <>
      <View
        {...panResponder.panHandlers}
        style={{
          bottom: 0,
          cursor: collapsed ? 'auto' : 'col-resize',
          left: 0,
          position: 'absolute',
          top: 0,
          width: 8,
          zIndex: 5,
        } as any}
      />
      <View
        style={{
          alignItems: 'center',
          backgroundColor: LIGHT_THEME.background.page,
          borderColor: LIGHT_THEME.border.input,
          borderRadius: 13,
          borderWidth: 1,
          height: 26,
          justifyContent: 'center',
          left: 12,
          position: 'absolute',
          top: 14,
          width: 26,
          zIndex: 6,
        }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={onToggleCollapse}
      >
        <Text
          className="font-sans"
          style={{
            color: LIGHT_THEME.text.secondary,
            fontFamily: 'Inter-Bold',
            fontSize: 18,
            lineHeight: 20,
          }}
        >
          {collapsed ? '‹' : '›'}
        </Text>
      </View>
    </>
  );
}
