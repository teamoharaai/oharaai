import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function NavLink({
  label,
  href,
  onPress,
}: {
  label: string;
  href?: "/(auth)/login" | "/(auth)/signup";
  onPress?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} asChild>
        <TouchableOpacity>
          <Text className="text-sm font-medium text-ink-dim">{label}</Text>
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Text className="text-sm font-medium text-ink-dim">{label}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({
  label,
  href,
  variant = "primary",
}: {
  label: string;
  href: "/(auth)/login" | "/(auth)/signup";
  variant?: "primary" | "secondary";
}) {
  const baseClassName =
    variant === "primary"
      ? "bg-ink border border-white/10"
      : "bg-white/5 border border-white/12";

  const textClassName =
    variant === "primary" ? "text-dark-bg" : "text-ink";

  return (
    <Link href={href} asChild>
      <TouchableOpacity
        className={`${baseClassName} rounded-full px-6 py-3.5`}
        style={
          Platform.OS === "web"
            ? ({
                cursor: "pointer",
                transition:
                  "transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
              } as any)
            : undefined
        }
      >
        <Text className={`${textClassName} text-sm font-semibold`}>
          {label}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}

function Header({
  onPressRoadmap,
  onPressAbout,
}: {
  onPressRoadmap: () => void;
  onPressAbout: () => void;
}) {
  return (
    <View
      className="px-6 pt-6"
      style={
        Platform.OS === "web"
          ? ({
              position: "sticky",
              top: 0,
              zIndex: 50,
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            } as any)
          : undefined
      }
    >
      <View className="mx-auto w-full max-w-6xl flex-row items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-4">
        <Text className="text-base font-semibold tracking-[0.24em] text-ink">
          OharaAI
        </Text>

        <View className="flex-row items-center gap-5">
          <NavLink label="Log in" href="/(auth)/login" />
          <NavLink label="Sign up" href="/(auth)/signup" />
          <NavLink label="Roadmap" onPress={onPressRoadmap} />
          <NavLink label="About us" onPress={onPressAbout} />
        </View>
      </View>
    </View>
  );
}

function Hero() {
  return (
    <View
      className="items-center justify-center px-6 pb-20 pt-16"
      style={{ minHeight: Platform.OS === "web" ? "78vh" : undefined } as any}
    >
      <View className="items-center" style={{ maxWidth: 720 }}>
        <View className="mb-8 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <Text className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-dim">
            Premium demo presentation
          </Text>
        </View>

        <Text
          className="mb-6 text-center font-semibold text-ink"
          style={
            Platform.OS === "web"
              ? ({
                  fontSize: "clamp(3.5rem, 9vw, 6.5rem)",
                  lineHeight: 1,
                  letterSpacing: -3,
                } as any)
              : { fontSize: 52, lineHeight: 52, letterSpacing: -2 }
          }
        >
          OharaAI
        </Text>

        <Text
          className="mb-10 text-center text-base leading-7 text-ink-dim"
          style={{ maxWidth: 560 }}
        >
          A calm, high-clarity workspace for focused decision-making, progress
          visibility, and professional execution.
        </Text>

        <View className="flex-row items-center justify-center gap-4">
          <ActionButton label="Sign up" href="/(auth)/signup" />
          <ActionButton
            label="Log in"
            href="/(auth)/login"
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
}

function Footer({
  onRoadmapLayout,
  onAboutLayout,
}: {
  onRoadmapLayout: (y: number) => void;
  onAboutLayout: (y: number) => void;
}) {
  return (
    <View className="border-t border-white/10 px-6 py-10">
      <View className="mx-auto w-full max-w-6xl gap-8">
        <View
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
          onLayout={(event) => onRoadmapLayout(event.nativeEvent.layout.y)}
        >
          <Text className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-ink-dim">
            Roadmap
          </Text>
          <Text className="text-sm leading-6 text-ink-dim">
            This demo landing page is intentionally minimal. The product path
            centers on focused planning, intelligent progress tracking, and a
            premium operating rhythm.
          </Text>
        </View>

        <View
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
          onLayout={(event) => onAboutLayout(event.nativeEvent.layout.y)}
        >
          <Text className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-ink-dim">
            About us
          </Text>
          <Text className="text-sm leading-6 text-ink-dim">
            OharaAI is presented here as a refined product demo: measured,
            modern, and designed to communicate confidence without noise.
          </Text>
        </View>

        <Text className="text-center text-xs text-ink-dim/70">
          © {new Date().getFullYear()} OharaAI
        </Text>
      </View>
    </View>
  );
}

export default function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);
  const [roadmapY, setRoadmapY] = useState<number>(0);
  const [aboutY, setAboutY] = useState<number>(0);

  function scrollTo(y: number) {
    scrollRef.current?.scrollTo({ y: Math.max(y - 120, 0), animated: true });
  }

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="absolute inset-0 overflow-hidden">
        <View
          className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-36 -translate-y-36 rounded-full bg-white/10"
          style={
            Platform.OS === "web"
              ? ({
                  filter: "blur(120px)",
                } as any)
              : undefined
          }
        />
        <Image
          source={require("../assets/images/icon.png")}
          resizeMode="contain"
          blurRadius={Platform.OS === "ios" || Platform.OS === "android" ? 14 : 0}
          className="absolute left-1/2 top-1/2 h-[440px] w-[440px]"
          style={
            Platform.OS === "web"
              ? ({
                  filter: "blur(20px)",
                  opacity: 0.16,
                  transform: "translate(-220px, -220px)",
                } as any)
              : ({
                  opacity: 0.16,
                  transform: [{ translateX: -220 }, { translateY: -220 }],
                } as any)
          }
        />
        <View className="absolute inset-0 bg-dark-bg/78" />
        {Platform.OS === "web" ? (
          <View
            className="absolute inset-0"
            style={{
              backgroundColor: "transparent",
              backgroundImage:
                "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 36%)",
            } as any}
          />
        ) : null}
      </View>

      <Header
        onPressRoadmap={() => scrollTo(roadmapY)}
        onPressAbout={() => scrollTo(aboutY)}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-6xl flex-1">
          <Hero />
          <Footer
            onRoadmapLayout={setRoadmapY}
            onAboutLayout={setAboutY}
          />
        </View>
      </ScrollView>
    </View>
  );
}
