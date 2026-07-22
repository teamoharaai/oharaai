import { Link, type Href } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { GoalTree } from "@/components/landing/GoalTree";
import { PublicNav } from "@/components/landing/PublicNav";
import { Typography } from "@/components/ui/Typography";
import { LIGHT_THEME } from "@/constants/colors";

const COLORS = {
  background: LIGHT_THEME.background.page,
  ink: LIGHT_THEME.text.primary,
  muted: LIGHT_THEME.text.secondary,
  green: LIGHT_THEME.accent.primary,
  greenHover: LIGHT_THEME.text.accent,
  border: LIGHT_THEME.border.warm,
  borderStrong: LIGHT_THEME.border.divider,
  footer: LIGHT_THEME.text.muted,
};

const webInteractiveStyle = {
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
} as any;

function HeroButton({
  href,
  label,
  primary = false,
}: {
  href: "/(auth)/login" | "/(auth)/signup";
  label: string;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={{
          ...webInteractiveStyle,
          backgroundColor: primary
            ? hovered ? COLORS.greenHover : COLORS.green
            : hovered ? "rgba(255,255,255,0.4)" : "transparent",
          borderColor: primary ? COLORS.green : hovered ? COLORS.green : COLORS.borderStrong,
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 30,
          paddingVertical: 14,
        }}
      >
        <Typography
          className="font-inter-semibold"
          style={{ color: primary ? COLORS.background : COLORS.ink, fontSize: 14, lineHeight: 20 }}
        >
          {label}
        </Typography>
      </Pressable>
    </Link>
  );
}

function Hero({ compact, stacked }: { compact: boolean; stacked: boolean }) {
  return (
    <View
      style={{
        alignItems: "center",
        marginHorizontal: "auto",
        maxWidth: 760,
        paddingBottom: stacked ? 64 : 88,
        paddingHorizontal: compact ? 20 : 48,
        paddingTop: stacked ? 64 : 96,
        width: "100%",
      }}
    >
      <View style={{ alignItems: "center", width: "100%" }}>
        <Typography
          style={
            {
              animation: "riseIn 1s ease-out forwards",
              animationDelay: "0.9s",
              color: COLORS.ink,
              fontFamily: "Inter-SemiBold",
              fontSize: compact ? 50 : 64,
              fontStyle: "italic",
              fontWeight: "600",
              letterSpacing: compact ? -0.7 : -1,
              lineHeight: compact ? 53 : 67,
              marginBottom: compact ? 22 : 26,
              opacity: 0,
              textAlign: "center",
            } as any
          }
        >
          OharaAI
        </Typography>
        <Typography
          style={{
            color: COLORS.muted,
            fontSize: compact ? 16 : 18,
            lineHeight: compact ? 27 : 30,
            marginBottom: compact ? 32 : 40,
            maxWidth: 620,
            textAlign: "center",
          }}
        >
          Stop circling the same goal. Ohara turns your next ambition into a clear plan, daily momentum, and real proof you&apos;re becoming who you set out to be — start today.
        </Typography>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "center",
          }}
        >
          <HeroButton href="/(auth)/signup" label="Sign up" primary />
          <HeroButton href="/(auth)/login" label="Log in" />
        </View>
      </View>
    </View>
  );
}

function SectionHeader({
  eyebrow,
  title,
  marginBottom = 20,
}: {
  eyebrow: string;
  title: string;
  marginBottom?: number;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Typography
        className="font-inter-semibold"
        style={{ color: COLORS.green, fontSize: 11, letterSpacing: 2.2, lineHeight: 16, marginBottom: 16, textTransform: "uppercase" }}
      >
        {eyebrow}
      </Typography>
      <Typography
        style={{
          color: COLORS.ink,
          fontFamily: "Inter-SemiBold",
          fontSize: 32,
          fontWeight: "600",
          letterSpacing: -0.5,
          lineHeight: 42,
          marginBottom,
          textAlign: "center",
        }}
      >
        {title}
      </Typography>
    </View>
  );
}

const SeedIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46">
    <Rect x={6} y={8} width={34} height={6} rx={3} fill="#3D5247" />
    <Rect x={6} y={20} width={34} height={6} rx={3} fill="#6B8A73" />
    <Rect x={6} y={32} width={20} height={6} rx={3} fill="#A9C0AE" />
  </Svg>
);

const SaplingIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46">
    <Path d="M23 40 C23 26 23 18 23 6" stroke="#2E6B52" strokeWidth={3} fill="none" strokeLinecap="round" />
    <Path d="M23 24 C16 20 12 14 14 8 C20 10 24 16 23 24Z" fill="#6FDFB8" />
    <Path d="M23 30 C30 26 34 20 32 14 C26 16 22 22 23 30Z" fill="#3D5247" />
  </Svg>
);

const TreeIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 46 46">
    <Rect x={21} y={26} width={4} height={16} fill="#8A5A22" />
    <Circle cx={23} cy={18} r={14} fill="#E09F3E" />
    <Circle cx={14} cy={22} r={9} fill="#E6B15C" />
    <Circle cx={32} cy={22} r={9} fill="#E6B15C" />
  </Svg>
);

function LifecycleCard({
  Icon,
  panel,
  label,
  labelColor,
  dot,
  title,
  body,
  stacked,
}: {
  Icon: () => React.ReactElement;
  panel: string;
  label: string;
  labelColor: string;
  dot: string;
  title: string;
  body: string;
  stacked: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: COLORS.border,
        borderRadius: 18,
        borderWidth: 1,
        flex: stacked ? undefined : 1,
        overflow: "hidden",
        width: stacked ? "100%" : undefined,
      }}
    >
      <View style={{ alignItems: "center", backgroundColor: panel, gap: 10, height: 170, justifyContent: "center", width: "100%" }}>
        <Icon />
        <Typography
          className="font-inter-semibold"
          style={{ color: labelColor, fontSize: 11, letterSpacing: 1, lineHeight: 16, textTransform: "uppercase" }}
        >
          {label}
        </Typography>
      </View>
      <View style={{ padding: 24 }}>
        <View style={{ backgroundColor: dot, borderRadius: 5, height: 10, marginBottom: 14, width: 10 }} />
        <Typography className="font-inter-semibold" style={{ color: COLORS.ink, fontSize: 17, lineHeight: 24, marginBottom: 8 }}>
          {title}
        </Typography>
        <Typography style={{ color: COLORS.muted, fontSize: 14, lineHeight: 22 }}>{body}</Typography>
      </View>
    </View>
  );
}

function WhatIsOhara({ compact, stacked }: { compact: boolean; stacked: boolean }) {
  const treeWidth = compact ? 1120 : "100%";

  return (
    <View
      style={{
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        marginHorizontal: "auto",
        maxWidth: 1180,
        paddingBottom: stacked ? 80 : 100,
        paddingHorizontal: compact ? 20 : 48,
        paddingTop: 70,
        width: "100%",
      }}
    >
      <SectionHeader eyebrow="What is Ohara" title="Rooted in three habits, grown into one practice" />
      <ScrollView
        horizontal={compact}
        showsHorizontalScrollIndicator={compact}
        contentContainerStyle={compact ? { paddingBottom: 10 } : undefined}
      >
        <GoalTree width={treeWidth} />
      </ScrollView>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 24, marginTop: 8 }}>
        <LifecycleCard stacked={stacked} Icon={SeedIcon} panel="#EEF3EE" label="The seed" labelColor="#3D5247" dot="#3D5247" title="Set SMART goals" body="Break an ambiguous idea into a clear, trackable goal — built step by step, your way." />
        <LifecycleCard stacked={stacked} Icon={SaplingIcon} panel="#EAF7F0" label="The sapling" labelColor="#2E6B52" dot="#6FDFB8" title="Reflect with Echo" body="Journal entries surface as buds, roses, and thorns — momentum made visible." />
        <LifecycleCard stacked={stacked} Icon={TreeIcon} panel="#FBF1E1" label="The flourished tree" labelColor="#B97A1E" dot="#E09F3E" title="See yourself clearly" body="A character profile that builds over time from your goals and reflections." />
      </View>
    </View>
  );
}

function NumberedCard({
  number,
  title,
  body,
  stacked,
}: {
  number: string;
  title: string;
  body: string;
  stacked: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: COLORS.border,
        borderRadius: 18,
        borderWidth: 1,
        flex: stacked ? undefined : 1,
        padding: 28,
        width: stacked ? "100%" : undefined,
      }}
    >
      <Typography style={{ color: COLORS.green, fontFamily: "Inter-Regular", fontSize: 15, fontStyle: "italic", lineHeight: 21, marginBottom: 14 }}>
        {number}
      </Typography>
      <Typography className="font-inter-semibold" style={{ color: COLORS.ink, fontSize: 16, lineHeight: 23, marginBottom: 8 }}>
        {title}
      </Typography>
      <Typography style={{ color: COLORS.muted, fontSize: 14, lineHeight: 22 }}>{body}</Typography>
    </View>
  );
}

function Essentials({ compact, stacked }: { compact: boolean; stacked: boolean }) {
  return (
    <View
      style={{
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        marginHorizontal: "auto",
        maxWidth: 1180,
        paddingBottom: stacked ? 70 : 90,
        paddingHorizontal: compact ? 20 : 48,
        paddingTop: 70,
        width: "100%",
      }}
    >
      <SectionHeader eyebrow="All you need to do" title="The essentials to execute your plan" marginBottom={48} />
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 24 }}>
        <NumberedCard stacked={stacked} number="One" title="Define your goal" body="Use the guided builder to shape it into something SMART." />
        <NumberedCard stacked={stacked} number="Two" title="Track milestones" body="Check off steps as you move, at your own pace." />
        <NumberedCard stacked={stacked} number="Three" title="Reflect & grow" body="Echo entries feed a character profile that sharpens over time." />
      </View>
    </View>
  );
}

function Footer({ compact }: { compact: boolean }) {
  return (
    <View style={{ alignItems: "center", borderTopColor: COLORS.border, borderTopWidth: 1, paddingHorizontal: compact ? 20 : 48, paddingVertical: 40 }}>
      <Typography style={{ color: COLORS.footer, fontSize: 12, lineHeight: 17 }}>© 2026 OharaAI</Typography>
    </View>
  );
}

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const stacked = width < 860;

  return (
    <View nativeID="landing-page" style={{ backgroundColor: COLORS.background, flex: 1 }}>
      <PublicNav compact={compact} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Hero compact={compact} stacked={stacked} />
        <WhatIsOhara compact={compact} stacked={stacked} />
        <Essentials compact={compact} stacked={stacked} />
        <Footer compact={compact} />
      </ScrollView>
    </View>
  );
}
