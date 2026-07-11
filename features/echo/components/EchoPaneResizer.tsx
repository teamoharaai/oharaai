import { useRef } from 'react';
import { View } from 'react-native';
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
  const startXRef = useRef(0);
  const draggingRef = useRef(false);

  const handlePointerDown = (e: any) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startWidthRef.current = width;
    startXRef.current = e.clientX;
    draggingRef.current = true;
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
    }
    e.preventDefault();
  };

  const handlePointerMove = (e: any) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    onResize(startWidthRef.current - dx);
  };

  const endDrag = (e: any) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
    }
  };

  return (
    <View
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
