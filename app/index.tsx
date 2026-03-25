import { Link } from "expo-router";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

// ─── Nav ────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <View
      className="flex-row items-center justify-between px-6 py-4 bg-cream/90"
      style={
        Platform.OS === "web"
          ? ({
              position: "sticky",
              top: 0,
              zIndex: 50,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            } as any)
          : {}
      }
    >
      {/* Wordmark */}
      <Text className="text-2xl font-bold text-near-black tracking-tight">
        Ohara
      </Text>

      {/* Nav links */}
      <View className="flex-row items-center gap-4">
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text className="text-base text-near-black/70 font-medium">
              Log in
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/signup" asChild>
          <TouchableOpacity
            className="bg-near-black rounded-full px-5 py-2 active:scale-95"
            style={{ transition: "transform 0.1s" } as any}
          >
            <Text className="text-base text-cream font-semibold">
              Get started
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

// ─── CTA Button ─────────────────────────────────────────────────────────────

function CTAButton({ label = "Start your journey" }: { label?: string }) {
  return (
    <Link href="/signup" asChild>
      <TouchableOpacity
        className="bg-near-black rounded-full px-10 py-4 self-center"
        style={
          Platform.OS === "web"
            ? ({
                transition: "transform 0.15s, background-color 0.15s",
                cursor: "pointer",
              } as any)
            : {}
        }
      >
        <Text className="text-base text-cream font-semibold tracking-wide">
          {label}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <View
      className="items-center justify-center px-6 py-32"
      style={{ minHeight: Platform.OS === "web" ? "90vh" : undefined } as any}
    >
      <View className="items-center" style={{ maxWidth: 680 }}>
        {/* Eyebrow tag */}
        <View className="bg-earth-green/10 rounded-full px-4 py-1.5 mb-8">
          <Text className="text-xs text-earth-green font-semibold tracking-widest uppercase">
            Now in open beta
          </Text>
        </View>

        {/* Headline — serif feel via letter-spacing + weight */}
        <Text
          className="text-5xl font-bold text-near-black text-center leading-tight mb-5"
          style={
            Platform.OS === "web"
              ? ({
                  fontSize: "clamp(2.5rem, 6vw, 4rem)",
                  lineHeight: 1.1,
                  fontFamily:
                    "'Instrument Serif', 'Georgia', 'Times New Roman', serif",
                } as any)
              : { fontSize: 38, lineHeight: 44 }
          }
        >
          Explore hobbies,{"\n"}track your goals.
        </Text>

        {/* Sub-headline */}
        <Text
          className="text-lg text-near-black/60 text-center mb-12 font-normal"
          style={{ maxWidth: 460 }}
        >
          A personal operating system for becoming.
        </Text>

        <CTAButton />

        {/* Trust line */}
        <Text className="mt-5 text-sm text-near-black/40 text-center">
          Free to use · No credit card required
        </Text>
      </View>
    </View>
  );
}

// ─── Section 2 — Value props ─────────────────────────────────────────────────

interface ValueCardProps {
  headline: string;
  body: string;
  tag: string;
}

function ValueCard({ headline, body, tag }: ValueCardProps) {
  return (
    <View
      className="bg-card-bg rounded-3xl p-8 flex-1"
      style={{ minWidth: 240 }}
    >
      <Text className="text-xs text-earth-green font-semibold tracking-widest uppercase mb-3">
        {tag}
      </Text>
      <Text className="text-xl font-bold text-near-black mb-3 leading-snug">
        {headline}
      </Text>
      <Text className="text-base text-muted leading-relaxed">{body}</Text>
    </View>
  );
}

function WhatIsOhara() {
  const cards: ValueCardProps[] = [
    {
      tag: "Goals",
      headline: "Set goals that actually stick",
      body: "SMART goal creation through conversation — no blank page, no overwhelm.",
    },
    {
      tag: "Reflection",
      headline: "Reflect and grow",
      body: "Journaling that builds self-awareness over time, not just a diary.",
    },
    {
      tag: "Progress",
      headline: "See your progress",
      body: "A living record of who you're becoming, one milestone at a time.",
    },
  ];

  return (
    <View
      className="px-6 py-24 items-center"
      style={
        Platform.OS === "web"
          ? ({ minHeight: "80vh" } as any)
          : {}
      }
    >
      <View style={{ maxWidth: 900, width: "100%" }}>
        {/* Section label */}
        <Text className="text-xs text-muted font-semibold tracking-widest uppercase text-center mb-6">
          What Ohara does
        </Text>

        <Text
          className="text-3xl font-bold text-near-black text-center mb-16 leading-snug"
          style={
            Platform.OS === "web"
              ? ({
                  fontFamily:
                    "'Instrument Serif', 'Georgia', 'Times New Roman', serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                } as any)
              : { fontSize: 28 }
          }
        >
          Built for the whole journey,{"\n"}not just the destination.
        </Text>

        <View
          className="gap-4"
          style={
            Platform.OS === "web"
              ? ({
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "stretch",
                } as any)
              : {}
          }
        >
          {cards.map((card) => (
            <ValueCard key={card.tag} {...card} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Section 3 — How it works ────────────────────────────────────────────────

interface StepProps {
  number: string;
  headline: string;
  body: string;
}

function Step({ number, headline, body }: StepProps) {
  return (
    <View className="flex-1 items-start" style={{ minWidth: 220 }}>
      <Text className="text-4xl font-bold text-earth-green/25 mb-4 leading-none">
        {number}
      </Text>
      <Text className="text-lg font-bold text-near-black mb-2 leading-snug">
        {headline}
      </Text>
      <Text className="text-base text-muted leading-relaxed">{body}</Text>
    </View>
  );
}

function HowItWorks() {
  const steps: StepProps[] = [
    {
      number: "01",
      headline: "Tell us what's on your mind",
      body: "Start a conversation, not a form. Just talk — we'll do the rest.",
    },
    {
      number: "02",
      headline: "We help you shape it",
      body: "AI turns your ambition into a realistic, step-by-step plan.",
    },
    {
      number: "03",
      headline: "Track, reflect, grow",
      body: "Milestones, journaling, and a personal record of effort.",
    },
  ];

  return (
    <View
      className="bg-near-black px-6 py-24 items-center"
      style={
        Platform.OS === "web"
          ? ({ minHeight: "80vh" } as any)
          : {}
      }
    >
      <View style={{ maxWidth: 900, width: "100%" }}>
        <Text className="text-xs text-cream/40 font-semibold tracking-widest uppercase text-center mb-6">
          How it works
        </Text>

        <Text
          className="text-3xl font-bold text-cream text-center mb-20 leading-snug"
          style={
            Platform.OS === "web"
              ? ({
                  fontFamily:
                    "'Instrument Serif', 'Georgia', 'Times New Roman', serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                } as any)
              : { fontSize: 28 }
          }
        >
          Three steps to clarity.
        </Text>

        <View
          className="gap-12"
          style={
            Platform.OS === "web"
              ? ({
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 48,
                } as any)
              : {}
          }
        >
          {steps.map((step) => (
            <Step key={step.number} {...step} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Section 4 — Social proof ────────────────────────────────────────────────

interface TestimonialProps {
  quote: string;
  name: string;
  context: string;
}

function TestimonialCard({ quote, name, context }: TestimonialProps) {
  return (
    <View
      className="bg-card-bg rounded-3xl p-8 flex-1"
      style={{ minWidth: 260 }}
    >
      <Text className="text-amber text-2xl leading-none mb-4">"</Text>
      <Text className="text-base text-near-black leading-relaxed mb-6 italic">
        {quote}
      </Text>
      <View>
        <Text className="text-sm font-bold text-near-black">{name}</Text>
        <Text className="text-xs text-muted mt-0.5">{context}</Text>
      </View>
    </View>
  );
}

function SocialProof() {
  const testimonials: TestimonialProps[] = [
    {
      quote:
        "I've tried every goal app out there. Ohara is the first one that actually feels like a conversation with someone who gets it.",
      name: "Maya L.",
      context: "Runner, 6 months on Ohara",
    },
    {
      quote:
        "The journaling feature alone changed how I reflect on my week. I didn't expect that from a goals app.",
      name: "Daniel R.",
      context: "Entrepreneur, 4 months on Ohara",
    },
    {
      quote:
        "It's the only app where I look back and actually see growth — not just a checklist.",
      name: "Priya S.",
      context: "Therapist & lifelong learner",
    },
  ];

  return (
    <View
      className="px-6 py-24 items-center"
      style={
        Platform.OS === "web"
          ? ({ minHeight: "70vh" } as any)
          : {}
      }
    >
      <View style={{ maxWidth: 960, width: "100%" }}>
        <Text className="text-xs text-muted font-semibold tracking-widest uppercase text-center mb-6">
          Early community
        </Text>

        <Text
          className="text-3xl font-bold text-near-black text-center mb-16 leading-snug"
          style={
            Platform.OS === "web"
              ? ({
                  fontFamily:
                    "'Instrument Serif', 'Georgia', 'Times New Roman', serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                } as any)
              : { fontSize: 28 }
          }
        >
          People are growing.
        </Text>

        <View
          className="gap-4"
          style={
            Platform.OS === "web"
              ? ({
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "stretch",
                } as any)
              : {}
          }
        >
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Section 5 — Final CTA ───────────────────────────────────────────────────

function FinalCTA() {
  return (
    <View
      className="bg-earth-green px-6 py-32 items-center"
      style={
        Platform.OS === "web"
          ? ({ minHeight: "70vh" } as any)
          : {}
      }
    >
      <View className="items-center" style={{ maxWidth: 600 }}>
        <Text
          className="text-4xl font-bold text-cream text-center mb-6 leading-tight"
          style={
            Platform.OS === "web"
              ? ({
                  fontFamily:
                    "'Instrument Serif', 'Georgia', 'Times New Roman', serif",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  lineHeight: 1.1,
                } as any)
              : { fontSize: 32, lineHeight: 38 }
          }
        >
          Your goals deserve better{"\n"}than a to-do list.
        </Text>

        <Text className="text-base text-cream/70 text-center mb-12">
          Join thousands already building the life they want.
        </Text>

        {/* Light button variant for green bg */}
        <Link href="/signup" asChild>
          <TouchableOpacity
            className="bg-cream rounded-full px-10 py-4 self-center"
            style={
              Platform.OS === "web"
                ? ({
                    transition: "transform 0.15s, opacity 0.15s",
                    cursor: "pointer",
                  } as any)
                : {}
            }
          >
            <Text className="text-base text-near-black font-semibold tracking-wide">
              Start your journey
            </Text>
          </TouchableOpacity>
        </Link>

        <Text className="mt-5 text-sm text-cream/50 text-center">
          Free to use · No credit card required
        </Text>
      </View>
    </View>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <View className="bg-near-black px-6 py-10 items-center">
      <View
        className="w-full items-center"
        style={{ maxWidth: 900 }}
      >
        {/* Links row */}
        <View className="flex-row items-center gap-6 mb-6 flex-wrap justify-center">
          {["About", "Privacy", "Terms"].map((label) => (
            <TouchableOpacity key={label}>
              <Text className="text-sm text-cream/40 font-medium">{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wordmark + copyright */}
        <Text className="text-sm text-cream/20 text-center">
          © {new Date().getFullYear()} Ohara. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <View className="flex-1 bg-cream">
      <NavBar />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Hero />
        <WhatIsOhara />
        <HowItWorks />
        <SocialProof />
        <FinalCTA />
        <Footer />
      </ScrollView>
    </View>
  );
}
