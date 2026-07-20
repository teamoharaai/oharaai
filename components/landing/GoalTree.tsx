import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

const WebAnimatedPath = Path as any;
const WebAnimatedCircle = Circle as any;

type GoalTreeProps = {
  width: number | string;
};

function AnimatedLine({
  d,
  stroke,
  strokeWidth,
  dash,
  delay,
}: {
  d: string;
  stroke: string;
  strokeWidth: number;
  dash: number;
  delay: number;
}) {
  return (
    <WebAnimatedPath
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={dash}
      style={
        {
          animation: "growLine 1.4s ease-out forwards",
          animationDelay: `${delay}s`,
        } as any
      }
    />
  );
}

function AnimatedLeaf({
  cx,
  cy,
  r,
  fill,
  duration,
  delay,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  duration: number;
  delay: number;
}) {
  return (
    <WebAnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      style={
        {
          transformOrigin: `${cx}px ${cy}px`,
          animation: `leafPulse ${duration}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        } as any
      }
    />
  );
}

function TreeLabel({
  x,
  y,
  children,
  size,
  fill,
  italic = false,
  weight,
}: {
  x: number;
  y: number;
  children: string;
  size: number;
  fill: string;
  italic?: boolean;
  weight?: "500" | "600";
}) {
  return (
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize={size}
      fontFamily={italic ? "Lora-Italic, Georgia, serif" : "Inter-SemiBold, Inter, sans-serif"}
      fontStyle={italic ? "italic" : "normal"}
      fontWeight={weight}
    >
      {children}
    </SvgText>
  );
}

export function GoalTree({ width }: GoalTreeProps) {
  return (
    <Svg
      accessibilityLabel="A goal tree showing habits branching into self-discipline, self-awareness, and follow-through, while Echo redirects a thorn into growth."
      width={width}
      height={340}
      viewBox="0 0 1620 340"
      preserveAspectRatio="xMidYMid meet"
    >
      <G
        style={
          {
            transformOrigin: "810px 240px",
            animation: "treeSway 6s ease-in-out infinite",
          } as any
        }
      >
        <AnimatedLine d="M810 240 C 840 213, 777 183, 810 144" stroke="#D8D2C4" strokeWidth={4} dash={500} delay={0} />
        <AnimatedLine d="M810 144 C 705 108, 645 177, 558 132 C 483 94.5, 438 81, 375 60" stroke="#D8D2C4" strokeWidth={3.2} dash={500} delay={0.15} />
        <AnimatedLine d="M810 144 C 843 114, 777 84, 810 51" stroke="#D8D2C4" strokeWidth={3.2} dash={500} delay={0.3} />
        <AnimatedLine d="M810 144 C 915 108, 975 177, 1062 132 C 1137 94.5, 1182 81, 1245 60" stroke="#D8D2C4" strokeWidth={3.2} dash={500} delay={0.45} />
        <AnimatedLine d="M558 132 C 470 138, 380 138, 330 148" stroke="#D8D2C4" strokeWidth={2} dash={220} delay={0.6} />
        <AnimatedLine d="M1062 132 C 1150 138, 1240 138, 1290 148" stroke="#D8D2C4" strokeWidth={2} dash={220} delay={0.7} />
        <AnimatedLine d="M810 144 C 870 160, 920 190, 960 222" stroke="#B7A99C" strokeWidth={2.4} dash={220} delay={0.55} />
        <AnimatedLine d="M960 222 C 985 244, 1005 262, 1030 282" stroke="#8FAE94" strokeWidth={2.4} dash={220} delay={1.6} />

        <Circle cx={810} cy={12} r={3} fill="#D8D2C4" />
        <Circle cx={810} cy={48} r={3} fill="#D8D2C4" />
        <Circle cx={810} cy={84} r={3} fill="#D8D2C4" />
        <Circle cx={810} cy={120} r={3} fill="#D8D2C4" />
        <Circle cx={810} cy={240} r={8} fill="#8A8172" />
        <Circle cx={810} cy={144} r={12} fill="#6B7F6E" />

        <AnimatedLeaf cx={375} cy={60} r={18} fill="#3D5247" duration={3.2} delay={0} />
        <AnimatedLeaf cx={810} cy={51} r={20} fill="#6FDFB8" duration={3.2} delay={0.4} />
        <AnimatedLeaf cx={1245} cy={60} r={18} fill="#E09F3E" duration={3.2} delay={0.8} />
        <AnimatedLeaf cx={330} cy={148} r={9} fill="#8FAE94" duration={3.4} delay={1.1} />
        <AnimatedLeaf cx={1290} cy={148} r={9} fill="#EEC488" duration={3.4} delay={1.3} />

        <Path d="M960 222 l -9 -7 l 18 -2 Z" fill="#9C6B5C" stroke="#7A4E42" strokeWidth={1} />
        <Circle cx={960} cy={222} r={8} fill="none" stroke="#9C6B5C" strokeWidth={2} strokeDasharray="3 3" />
        <AnimatedLeaf cx={1030} cy={282} r={11} fill="#6FDFB8" duration={3.4} delay={1.9} />

        <TreeLabel x={375} y={30} size={15} fill="#3D5247" weight="600">Workout 3×/week</TreeLabel>
        <TreeLabel x={375} y={96} size={14} fill="#8A8172" italic>→ Self-Discipline</TreeLabel>
        <TreeLabel x={330} y={176} size={12} fill="#8FAE94" italic>→ Consistency compounds</TreeLabel>
        <TreeLabel x={810} y={16} size={15} fill="#2E6B52" weight="600">Daily journaling</TreeLabel>
        <TreeLabel x={810} y={192} size={14} fill="#8A8172" italic>→ Self-Awareness</TreeLabel>
        <TreeLabel x={1245} y={30} size={15} fill="#B97A1E" weight="600">Finish a certification</TreeLabel>
        <TreeLabel x={1245} y={96} size={14} fill="#8A8172" italic>→ Follow-Through</TreeLabel>
        <TreeLabel x={1290} y={176} size={12} fill="#EEC488" italic>→ Confidence grows</TreeLabel>
        <TreeLabel x={960} y={252} size={14} fill="#7A4E42" weight="600">2 hrs/day doomscrolling</TreeLabel>
        <TreeLabel x={960} y={270} size={12} fill="#9C6B5C" italic>↳ thorn Echo flags for you</TreeLabel>
        <TreeLabel x={1030} y={306} size={13} fill="#2E6B52" weight="600">Redirected into running, cooking, grooming</TreeLabel>
        <TreeLabel x={1030} y={324} size={12} fill="#8A8172" italic>→ compounds into growth by year&apos;s end</TreeLabel>
      </G>
    </Svg>
  );
}
