import { View } from 'react-native';
import { COLORS, LIGHT_THEME } from '@/constants/colors';

const FOREST = LIGHT_THEME.background.sidebar;
const CREAM = LIGHT_THEME.background.page;
const LABEL = '#8A8172';
const AMBER = COLORS.amber;

export default function ConstellationSample() {
  return (
    <View style={{ width: '100%', aspectRatio: 320 / 220 }}>
      {/* @ts-ignore - SVG elements are valid in React Native Web */}
      <svg
        aria-label="Sample constellation map"
        fill="none"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 320 220"
        width="100%"
      >
        {/* @ts-ignore - Inline SVG styles are valid on web */}
        <style>{`@media (prefers-reduced-motion:no-preference){.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 4s ease-in-out infinite}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.82;transform:scale(1.06)}}`}</style>
        {/* @ts-ignore - SVG group elements are valid on web */}
        <g stroke={FOREST} strokeOpacity={0.3} strokeWidth={1}>
          {/* @ts-ignore */}
          <path d="M160 110Q126 88 100 62" />
          {/* @ts-ignore */}
          <path d="M100 62Q170 28 245 68" />
          {/* @ts-ignore */}
          <path d="M100 62Q196 74 255 135" />
          {/* @ts-ignore */}
          <path d="M100 62Q105 126 110 162" />
          {/* @ts-ignore */}
          <path d="M245 68Q158 64 55 110" />
          {/* @ts-ignore */}
          <path d="M255 135Q244 170 215 185" />
          {/* @ts-ignore */}
          <path d="M110 162Q74 160 55 110" />
        </g>
        {/* @ts-ignore */}
        <rect className="pulse" x="132" y="90" width="56" height="40" rx="20" fill={CREAM} stroke={FOREST} />
        {/* @ts-ignore */}
        <circle cx="100" cy="62" r="24" fill={FOREST} />
        {/* @ts-ignore */}
        <circle cx="245" cy="68" r="20" fill={FOREST} />
        {/* @ts-ignore */}
        <circle cx="255" cy="135" r="20" fill={FOREST} />
        {/* @ts-ignore */}
        <circle cx="110" cy="162" r="20" fill={FOREST} />
        {/* @ts-ignore */}
        <circle cx="55" cy="110" r="16" fill={AMBER} />
        {/* @ts-ignore */}
        <circle cx="215" cy="185" r="16" fill={AMBER} />
        {/* @ts-ignore */}
        <g fill={LABEL} fontFamily="Inter-Regular" fontSize="11" textAnchor="middle">
          {/* @ts-ignore */}
          <text x="160" y="80">Current Season</text>
          {/* @ts-ignore */}
          <text x="100" y="97">Launch Ohara</text>
          {/* @ts-ignore */}
          <text x="245" y="34">Learn to Cook</text>
          {/* @ts-ignore */}
          <text x="255" y="168">Read 24 Books</text>
          {/* @ts-ignore */}
          <text x="110" y="196">Morning Routine</text>
          {/* @ts-ignore */}
          <text x="55" y="142">Patience</text>
          {/* @ts-ignore */}
          <text x="215" y="158">Self-Discipline</text>
        </g>
      </svg>
    </View>
  );
}
