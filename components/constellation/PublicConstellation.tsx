import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { CATEGORY_ACCENT_THEME } from '@/constants/themes';

type PublicConstellationProps = {
  dark?: boolean;
  variant?: 'compact' | 'detailed';
};

const ACCENTS = {
  health: CATEGORY_ACCENT_THEME.health.color,
  education: CATEGORY_ACCENT_THEME.education.color,
  relationships: CATEGORY_ACCENT_THEME.relationships.color,
  growth: CATEGORY_ACCENT_THEME.growth.color,
  creative: CATEGORY_ACCENT_THEME.creative.color,
};

export function PublicConstellation({
  dark = false,
  variant = 'detailed',
}: PublicConstellationProps) {
  const compact = variant === 'compact';
  const line = dark ? '#A8B9AE' : '#9BAA9F';
  const label = dark ? '#E3EAE4' : '#5F5B52';
  const quiet = dark ? '#AFC0B4' : '#7C766B';
  const centerFill = dark ? '#E8EFE9' : '#F7F4EE';
  const centerStroke = dark ? '#BFD0C3' : '#4A7C5F';
  const viewBox = compact ? '0 0 480 150' : '0 0 720 360';

  return (
    <View style={{ aspectRatio: compact ? 480 / 150 : 720 / 360, overflow: 'hidden', width: '100%' }}>
      <Svg
        accessibilityLabel={compact ? 'Compact preview of an OHARA personal constellation' : 'Detailed preview of an OHARA personal constellation'}
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        viewBox={viewBox}
        width="100%"
      >
        {compact ? (
          <>
            <G fill="none" stroke={line} strokeOpacity={0.58} strokeWidth={1.4}>
              <Path d="M240 75 C202 52 167 42 126 42" />
              <Path d="M240 75 C282 48 324 37 367 40" />
              <Path d="M240 75 C197 95 164 112 121 113" />
              <Path d="M240 75 C282 94 325 108 372 110" />
              <Path d="M126 42 C104 68 104 91 121 113" strokeDasharray="3 5" />
              <Path d="M367 40 C391 63 393 88 372 110" strokeDasharray="3 5" />
            </G>
            <Circle cx={240} cy={75} r={12} fill={centerFill} stroke={centerStroke} strokeWidth={2.2} />
            <Circle cx={126} cy={42} r={7} fill={ACCENTS.health} stroke={centerFill} strokeWidth={2} />
            <Circle cx={367} cy={40} r={7} fill={ACCENTS.education} stroke={centerFill} strokeWidth={2} />
            <Circle cx={121} cy={113} r={6} fill={ACCENTS.relationships} stroke={centerFill} strokeWidth={2} />
            <Circle cx={372} cy={110} r={6} fill={ACCENTS.growth} stroke={centerFill} strokeWidth={2} />
            <Circle cx={302} cy={78} r={4.5} fill={ACCENTS.creative} stroke={centerFill} strokeWidth={1.5} />
            <G fill={label} fontFamily="Inter-Medium" fontSize={10}>
              <SvgText x={240} y={102} textAnchor="middle">Focus</SvgText>
              <SvgText x={126} y={24} textAnchor="middle">Health</SvgText>
              <SvgText x={367} y={22} textAnchor="middle">Learning</SvgText>
              <SvgText x={121} y={138} textAnchor="middle">Connection</SvgText>
              <SvgText x={372} y={136} textAnchor="middle">Reflection</SvgText>
            </G>
          </>
        ) : (
          <>
            <G fill="none" stroke={line} strokeOpacity={0.52} strokeWidth={1.5}>
              <Path d="M360 178 C295 130 249 100 184 91" />
              <Path d="M360 178 C419 119 472 88 538 83" />
              <Path d="M360 178 C290 214 238 249 179 274" />
              <Path d="M360 178 C428 210 487 244 550 266" />
              <Path d="M184 91 C147 126 131 165 139 207" strokeDasharray="4 6" />
              <Path d="M538 83 C582 119 598 161 588 207" strokeDasharray="4 6" />
              <Path d="M139 207 C145 236 158 256 179 274" />
              <Path d="M588 207 C580 234 567 253 550 266" />
              <Path d="M184 91 C278 61 438 57 538 83" strokeDasharray="3 7" />
              <Path d="M179 274 C276 307 449 303 550 266" strokeDasharray="3 7" />
            </G>

            <Circle cx={360} cy={178} r={20} fill={centerFill} stroke={centerStroke} strokeWidth={3} />
            <Circle cx={184} cy={91} r={12} fill={ACCENTS.health} stroke={centerFill} strokeWidth={3} />
            <Circle cx={538} cy={83} r={12} fill={ACCENTS.education} stroke={centerFill} strokeWidth={3} />
            <Circle cx={179} cy={274} r={10} fill={ACCENTS.relationships} stroke={centerFill} strokeWidth={3} />
            <Circle cx={550} cy={266} r={10} fill={ACCENTS.growth} stroke={centerFill} strokeWidth={3} />
            <Circle cx={139} cy={207} r={7} fill={ACCENTS.creative} stroke={centerFill} strokeWidth={2} />
            <Circle cx={588} cy={207} r={7} fill={ACCENTS.creative} stroke={centerFill} strokeWidth={2} />

            <Rect x={296} y={210} width={128} height={32} rx={16} fill={dark ? 'rgba(17,43,30,.86)' : '#FFFFFF'} stroke={centerStroke} strokeOpacity={0.45} />
            <SvgText x={360} y={231} fill={label} fontFamily="Inter-SemiBold" fontSize={12} textAnchor="middle">Intentional growth</SvgText>

            <G fontFamily="Inter-Medium" fontSize={12}>
              <SvgText x={184} y={61} fill={label} textAnchor="middle">Run consistently</SvgText>
              <SvgText x={538} y={53} fill={label} textAnchor="middle">Keep learning</SvgText>
              <SvgText x={179} y={307} fill={label} textAnchor="middle">Connection</SvgText>
              <SvgText x={550} y={299} fill={label} textAnchor="middle">Reflection</SvgText>
            </G>
            <G fill={quiet} fontFamily="Inter-Regular" fontSize={10}>
              <SvgText x={139} y={229} textAnchor="middle">Practice</SvgText>
              <SvgText x={588} y={229} textAnchor="middle">Insight</SvgText>
              <SvgText x={360} y={152} textAnchor="middle">Current focus</SvgText>
            </G>
          </>
        )}
      </Svg>
    </View>
  );
}
