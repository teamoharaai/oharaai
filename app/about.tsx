import { Link } from "expo-router";
import type { Href } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Typography } from "@/components/ui/Typography";

function NavLink({
  label,
  href,
}: {
  label: string;
  href: Href;
}) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity>
        <Typography variant="label">{label}</Typography>
      </TouchableOpacity>
    </Link>
  );
}

export default function AboutPage() {
  return (
    <View className="flex-1 bg-dark-bg">
      {/* Background Glow */}
      <View className="absolute inset-0 overflow-hidden">
        <View
          className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-36 -translate-y-36 rounded-full bg-white/10"
          style={
            {
              filter: "blur(120px)",
            } as any
          }
        />
        <View className="absolute inset-0 bg-dark-bg/78" />
      </View>

      {/* Header */}
      <View
        className="px-6 pt-6"
        style={
          {
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          } as any
        }
      >
        <View className="mx-auto w-full max-w-6xl flex-row items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-4">
  <Link href="/" asChild>
    <TouchableOpacity>
      <Typography
        variant="label"
        className="font-semibold text-base tracking-[0.24em] text-ink"
      >
        OharaAI
      </Typography>
    </TouchableOpacity>
  </Link>

  <View className="flex-row items-center gap-5">
    <NavLink label="About Us" href={"/about" as Href} />
    <NavLink label="Log in" href="/(auth)/login" />
    <NavLink label="Sign up" href="/(auth)/signup" />
    <NavLink label="Roadmap" href="/" />
  </View>
</View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-5xl px-6 py-24">
          {/* Hero */}
          <Typography
            variant="heading"
            className="mb-6 text-center"
            style={
              {
                fontSize: "clamp(3.5rem, 9vw, 6.5rem)",
                lineHeight: 1,
                letterSpacing: -3,
              } as any
            }
          >
            About OHARA
          </Typography>

          <Typography
            variant="body"
            className="mb-20 text-center leading-7"
            style={{ maxWidth: 560, alignSelf: "center" }}
          >
            Helping people understand themselves, not just track themselves.
          </Typography>

          {/* Why We Exist */}
          <View className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 items-center">
            <Typography
              variant="caption"
              className="mb-4 text-center font-medium uppercase tracking-[0.28em]"
            >
              Why We Exist
            </Typography>

            <Typography
              variant="body"
              className="text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              Most productivity and habit-tracking apps measure actions. OHARA
              is designed to uncover the patterns, beliefs, habits, and
              behaviors beneath those actions.
            </Typography>

            <Typography
              variant="body"
              className="mt-4 text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              We believe meaningful growth comes from understanding why we do
              what we do, not simply recording what happened.
            </Typography>
          </View>

          {/* What Makes OHARA Different */}
          <View className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 items-center">
            <Typography
              variant="caption"
              className="mb-4 text-center font-medium uppercase tracking-[0.28em]"
            >
              What Makes OHARA Different
            </Typography>

            <Typography
              variant="body"
              className="text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              Goals are connected to identity. Habits are connected to context.
              Progress is connected to reflection.
            </Typography>

            <Typography
              variant="body"
              className="mt-4 text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              Rather than treating goals as isolated checklists, OHARA looks for
              connections across the different areas of a person's life.
            </Typography>
          </View>

          {/* Long-Term Vision */}
          <View className="mb-16 rounded-3xl border border-white/10 bg-white/[0.04] p-8 items-center">
            <Typography
              variant="caption"
              className="mb-4 text-center font-medium uppercase tracking-[0.28em]"
            >
              Long-Term Vision
            </Typography>

            <Typography
              variant="body"
              className="text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              Our vision is to create a personalized system for
              self-understanding.
            </Typography>

            <Typography
              variant="body"
              className="mt-4 text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              In the future, OHARA will be able to connect data from goals,
              habits, reflections, and external applications to provide deeper
              insights and recommendations tailored to each individual.
            </Typography>

            <Typography
              variant="body"
              className="mt-4 text-center leading-7"
              style={{ maxWidth: 720 }}
            >
              Every person's life is different. Their guidance should be too.
            </Typography>
          </View>

          {/* Footer */}
          <View className="border-t border-white/10 pt-10">
            <Typography
              variant="caption"
              className="text-center"
              style={{ opacity: 0.7 }}
            >
              © 2026 OharaAI
            </Typography>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
