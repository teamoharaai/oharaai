import { Lora_600SemiBold } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { Link, type Href } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { GoalTree } from "@/components/landing/GoalTree";
import { Typography } from "@/components/ui/Typography";

const LOGO = require("../../assets/brand/ohara-logo.png");

const COLORS = {
  background: "#F5F1EA",
  ink: "#211F1A",
  muted: "#6B6B6B",
  green: "#3D5247",
  greenHover: "#2A3B31",
  border: "#E4DED0",
  borderStrong: "#D8D2C4",
  footer: "#8A8172",
};

const webInteractiveStyle = {
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
} as any;

function NavTextLink({ label, href }: { label: string; href: Href }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={webInteractiveStyle}
      >
        <Typography
          variant="badge-text"
          className="font-inter-medium"
          style={{ color: hovered ? COLORS.greenHover : COLORS.muted, fontSize: 14, lineHeight: 20 }}
        >
          {label}
        </Typography>
      </Pressable>
    </Link>
  );
}

function Nav({ compact }: { compact: boolean }) {
  const [signupHovered, setSignupHovered] = useState(false);

  return (
    <View style={{ paddingTop: 20, paddingHorizontal: compact ? 20 : 48 }}>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginHorizontal: "auto",
          maxWidth: 1180,
          width: "100%",
        }}
      >
        <Link href="/" asChild>
          <TouchableOpacity
            accessibilityLabel="OharaAI home"
            accessibilityRole="link"
            style={{ ...webInteractiveStyle, alignItems: "center", flexDirection: "row", gap: 10 }}
          >
            <View
              className="bg-lp-green-hover"
              style={{ alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 }}
            >
              <Image source={LOGO} resizeMode="contain" style={{ height: 24, width: 24 }} />
            </View>
            <Typography
              className="font-inter-semibold"
              style={{ color: COLORS.ink, fontSize: 14, letterSpacing: 3.4, lineHeight: 20, textTransform: "uppercase" }}
            >
              OharaAI
            </Typography>
          </TouchableOpacity>
        </Link>

        <View style={{ alignItems: "center", flexDirection: "row", gap: compact ? 14 : 28 }}>
          {!compact ? <NavTextLink label="About Us" href={"/about" as Href} /> : null}
          <NavTextLink label="Log in" href="/(auth)/login" />
          <Link href="/(auth)/signup" asChild>
            <Pressable
              accessibilityRole="link"
              onHoverIn={() => setSignupHovered(true)}
              onHoverOut={() => setSignupHovered(false)}
              style={{
                ...webInteractiveStyle,
                backgroundColor: signupHovered ? COLORS.greenHover : COLORS.green,
                borderRadius: 999,
                paddingHorizontal: compact ? 16 : 20,
                paddingVertical: 10,
              }}
            >
              <Typography className="font-inter-semibold" style={{ color: COLORS.background, fontSize: 14, lineHeight: 20 }}>
                Sign up
              </Typography>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

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
        flexDirection: stacked ? "column" : "row",
        gap: stacked ? 32 : 60,
        marginHorizontal: "auto",
        maxWidth: 1180,
        paddingBottom: stacked ? 70 : 90,
        paddingHorizontal: compact ? 20 : 48,
        paddingTop: stacked ? 48 : 70,
        width: "100%",
      }}
    >
      <View style={{ flex: stacked ? undefined : 1.1, width: stacked ? "100%" : undefined }}>
        <Typography
          style={
            {
              animation: "riseIn 1s ease-out forwards",
              animationDelay: "0.9s",
              color: COLORS.ink,
              fontFamily: "Lora-SemiBold-Italic, Lora-Italic, Georgia, serif",
              fontSize: compact ? 50 : 64,
              fontStyle: "italic",
              fontWeight: "600",
              letterSpacing: compact ? -0.7 : -1,
              lineHeight: compact ? 53 : 67,
              marginBottom: compact ? 22 : 26,
              opacity: 0,
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
            marginBottom: compact ? 30 : 36,
            maxWidth: 440,
          }}
        >
          Stop circling the same goal. Ohara turns your next ambition into a clear plan, daily momentum, and real proof you&apos;re becoming who you set out to be — start today.
        </Typography>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <HeroButton href="/(auth)/signup" label="Sign up" primary />
          <HeroButton href="/(auth)/login" label="Log in" />
        </View>
      </View>

      <View
        style={{
          alignItems: "center",
          flex: stacked ? undefined : 0.9,
          height: stacked ? 290 : 340,
          justifyContent: "center",
          position: "relative",
          width: stacked ? "100%" : undefined,
        }}
      >
        <View
          style={
            {
              background: "radial-gradient(circle, rgba(111,223,184,.28), transparent 70%)",
              borderRadius: compact ? 130 : 150,
              height: compact ? 260 : 300,
              position: "absolute",
              width: compact ? 260 : 300,
            } as any
          }
        />
        <View
          style={
            {
              animation: "sprout 1.3s ease-out forwards",
              opacity: 0,
              transformOrigin: "bottom center",
            } as any
          }
        >
          <View
            className="bg-lp-green-medallion"
            style={
              {
                alignItems: "center",
                animation: "floatLogo 5s ease-in-out infinite",
                animationDelay: "1.3s",
                borderRadius: compact ? 110 : 130,
                boxShadow: "0 24px 48px rgba(36,49,42,.28)",
                height: compact ? 220 : 260,
                justifyContent: "center",
                width: compact ? 220 : 260,
              } as any
            }
          >
            <Image source={LOGO} resizeMode="contain" style={{ height: compact ? 160 : 190, width: compact ? 160 : 190 }} />
          </View>
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
          fontFamily: "Lora-SemiBold, Lora-Regular, Georgia, serif",
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
      <Typography style={{ color: COLORS.green, fontFamily: "Lora-Italic, Georgia, serif", fontSize: 15, fontStyle: "italic", lineHeight: 21, marginBottom: 14 }}>
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
  const [fontLoaded] = useFonts({ "Lora-SemiBold": Lora_600SemiBold });
  const compact = width < 760;
  const stacked = width < 860;

  if (!fontLoaded) {
    return <View style={{ backgroundColor: COLORS.background, flex: 1 }} />;
  }

  return (
    <View nativeID="landing-page" style={{ backgroundColor: COLORS.background, flex: 1 }}>
      <Nav compact={compact} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Hero compact={compact} stacked={stacked} />
        <WhatIsOhara compact={compact} stacked={stacked} />
        <Essentials compact={compact} stacked={stacked} />
        <Footer compact={compact} />
      </ScrollView>
    </View>
  );
}
