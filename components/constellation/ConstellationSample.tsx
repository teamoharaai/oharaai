import type { ReactNode } from 'react';
import { Text, View, type DimensionValue } from 'react-native';
import { COLORS, LIGHT_THEME } from '@/constants/colors';

const FOREST = LIGHT_THEME.background.sidebar;
const CREAM = LIGHT_THEME.background.page;
const LABEL = '#6B7280';
const AMBER = COLORS.amber;

function Line({
  left,
  top,
  width,
  rotate,
}: {
  left: DimensionValue;
  top: DimensionValue;
  width: DimensionValue;
  rotate: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: 1,
        borderRadius: 999,
        backgroundColor: FOREST,
        opacity: 0.3,
        transform: [{ rotate }],
      }}
    />
  );
}

function Label({
  children,
  left,
  top,
}: {
  children: ReactNode;
  left: DimensionValue;
  top: DimensionValue;
}) {
  return (
    <Text
      style={{
        position: 'absolute',
        left,
        top,
        color: LABEL,
        fontFamily: 'Inter',
        fontSize: 11,
        textAlign: 'center',
      }}
    >
      {children}
    </Text>
  );
}

export default function ConstellationSample() {
  return (
    <View style={{ width: '100%', aspectRatio: 320 / 220 }}>
      <Line left="33%" top="40%" width="24%" rotate="-35deg" />
      <Line left="33%" top="26%" width="46%" rotate="3deg" />
      <Line left="33%" top="33%" width="50%" rotate="20deg" />
      <Line left="31%" top="49%" width="21%" rotate="57deg" />
      <Line left="17%" top="37%" width="60%" rotate="-12deg" />
      <Line left="67%" top="68%" width="16%" rotate="38deg" />
      <Line left="18%" top="65%" width="23%" rotate="25deg" />

      <View
        style={{
          position: 'absolute',
          left: '41.25%',
          top: '40.9%',
          width: '17.5%',
          height: '18.2%',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: FOREST,
          backgroundColor: CREAM,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '23.75%',
          top: '17.3%',
          width: '15%',
          height: '21.8%',
          borderRadius: 24,
          backgroundColor: FOREST,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '70.3%',
          top: '21.8%',
          width: '12.5%',
          height: '18.2%',
          borderRadius: 20,
          backgroundColor: FOREST,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '73.4%',
          top: '52.3%',
          width: '12.5%',
          height: '18.2%',
          borderRadius: 20,
          backgroundColor: FOREST,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '28.1%',
          top: '64.5%',
          width: '12.5%',
          height: '18.2%',
          borderRadius: 20,
          backgroundColor: FOREST,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '12.2%',
          top: '42.7%',
          width: '10%',
          height: '14.5%',
          borderRadius: 16,
          backgroundColor: AMBER,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '62.2%',
          top: '76.8%',
          width: '10%',
          height: '14.5%',
          borderRadius: 16,
          backgroundColor: AMBER,
        }}
      />

      <Label left="37%" top="31%">Current Season</Label>
      <Label left="23%" top="39%">Launch Ohara</Label>
      <Label left="67%" top="9%">Learn to Cook</Label>
      <Label left="71%" top="76%">Read 24 Books</Label>
      <Label left="22%" top="89%">Morning Routine</Label>
      <Label left="10%" top="63%">Patience</Label>
      <Label left="56%" top="69%">Self-Discipline</Label>
    </View>
  );
}
