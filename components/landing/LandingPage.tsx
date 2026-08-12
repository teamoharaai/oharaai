import { useEffect } from 'react';
import { Image, useWindowDimensions, ScrollView, View } from 'react-native';

import { PublicConstellation } from '@/components/constellation/PublicConstellation';
import { AIGoalCreationPreview } from '@/components/landing/AIGoalCreationPreview';
import { BrandArtwork } from '@/components/landing/BrandArtwork';
import { PublicMomentumTrendChart } from '@/components/landing/PublicMomentumTrendChart';
import {
  PreviewSurface,
  PublicButton,
  PublicFooter,
  PublicHeader,
  PublicPageCanvas,
  PublicSectionHeading,
  scrollToPublicSection,
  PUBLIC_COLORS,
} from '@/components/landing/PublicPrimitives';
import { Typography } from '@/components/ui/Typography';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';

function PreviewLabel({ children, icon }: { children: string; icon?: BrandIconName }) {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
      {icon ? <BrandIcon color={PUBLIC_COLORS.forest} name={icon} size={14} /> : null}
      <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.forest, fontSize: 9, letterSpacing: 1.3, lineHeight: 13, textTransform: 'uppercase' }}>
        {children}
      </Typography>
    </View>
  );
}

function PreviewBadge() {
  return (
    <View style={{ backgroundColor: PUBLIC_COLORS.sageSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.forest, fontSize: 8, letterSpacing: 0.8, lineHeight: 11, textTransform: 'uppercase' }}>
        Preview
      </Typography>
    </View>
  );
}

function MomentumPreviewHeader() {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        <PreviewLabel icon="momentum">Ohara Momentum</PreviewLabel>
        <PreviewBadge />
      </View>
      <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.forest, fontSize: 11 }}>
        Building
      </Typography>
    </View>
  );
}

type HeroStageMode = 'composed' | 'mobile';

function MomentumPreviewCard({ stageMode }: { stageMode: HeroStageMode }) {
  return (
    <PreviewSurface
      style={{
        minHeight: stageMode === 'composed' ? 202 : 196,
        overflow: 'hidden',
        padding: 18,
        ...(stageMode === 'composed'
          ? { position: 'absolute', right: 0, top: 18, width: '70%', zIndex: 2 }
          : { width: '100%' }),
      }}
    >
        <MomentumPreviewHeader />
        <View style={{ marginTop: 7 }}>
          <PublicMomentumTrendChart variant="compact" />
        </View>
    </PreviewSurface>
  );
}

function EchoPreviewCard({ stageMode }: { stageMode: HeroStageMode }) {
  return (
    <PreviewSurface
      style={{
        minHeight: 145,
        overflow: 'hidden',
        padding: 18,
        ...(stageMode === 'composed'
          ? { left: 0, position: 'absolute', top: '34%', width: '51%', zIndex: 4 }
          : { width: '100%' }),
      }}
    >
        <PreviewLabel icon="echo-add-entry">Echo Entry</PreviewLabel>
        <Typography style={{ color: PUBLIC_COLORS.ink, fontSize: 13, lineHeight: 20, marginTop: 14 }}>
          I showed up for my run even though I was tired. Small win, meaningful signal.
        </Typography>
        <Typography style={{ color: PUBLIC_COLORS.forest, fontSize: 11, marginTop: 15 }}>Self-Discipline · Today</Typography>
    </PreviewSurface>
  );
}

function FocusPreviewCard({ stageMode }: { stageMode: HeroStageMode }) {
  return (
    <PreviewSurface
      style={{
        minHeight: 118,
        overflow: 'hidden',
        padding: 18,
        ...(stageMode === 'composed'
          ? { position: 'absolute', right: 0, top: '45%', width: '43%', zIndex: 5 }
          : { width: '100%' }),
      }}
    >
        <PreviewLabel icon="today">Today&apos;s Focus</PreviewLabel>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 15 }}>
          <View style={{ borderColor: PUBLIC_COLORS.forest, borderRadius: 8, borderWidth: 1.5, height: 16, width: 16 }} />
          <View style={{ flex: 1 }}>
            <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.ink, fontSize: 13 }}>Run 30 minutes</Typography>
            <Typography style={{ color: PUBLIC_COLORS.quiet, fontSize: 11, marginTop: 3 }}>Build consistency</Typography>
          </View>
          <Typography style={{ color: PUBLIC_COLORS.forest }}>→</Typography>
        </View>
    </PreviewSurface>
  );
}

function ConstellationPreviewCard({ stageMode }: { stageMode: HeroStageMode }) {
  return (
    <PreviewSurface
      style={{
        minHeight: 185,
        overflow: 'hidden',
        padding: 18,
        ...(stageMode === 'composed'
          ? { bottom: 12, left: '17%', position: 'absolute', width: '66%', zIndex: 3 }
          : { width: '100%' }),
      }}
    >
      <PreviewLabel icon="constellation">Constellation</PreviewLabel>
      <View style={{ marginTop: 8, overflow: 'hidden', width: '100%' }}>
        <PublicConstellation variant="compact" />
      </View>
    </PreviewSurface>
  );
}

function HeroPreviews({ width }: { width: number }) {
  const stageMode: HeroStageMode = width >= 620 ? 'composed' : 'mobile';
  return (
    <View
      style={{
        aspectRatio: stageMode === 'composed' ? 660 / 610 : undefined,
        maxWidth: stageMode === 'composed' ? 680 : undefined,
        minHeight: stageMode === 'mobile' ? undefined : 0,
        paddingVertical: stageMode === 'composed' ? 0 : 16,
        position: 'relative',
        width: '100%',
      }}
    >
      <View
        style={{
          flexDirection: stageMode === 'mobile' ? 'column' : 'row',
          gap: stageMode === 'composed' ? 0 : 18,
          height: stageMode === 'composed' ? '100%' : undefined,
          position: 'relative',
          width: '100%',
        }}
      >
        <MomentumPreviewCard stageMode={stageMode} />
        <EchoPreviewCard stageMode={stageMode} />
        <FocusPreviewCard stageMode={stageMode} />
        <ConstellationPreviewCard stageMode={stageMode} />
      </View>
    </View>
  );
}

function EchoPreview() {
  return (
    <PreviewSurface>
      <PreviewLabel icon="echo-add-entry">Echo Entry</PreviewLabel>
      <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, fontSize: 15, lineHeight: 22, marginTop: 14 }}>
        What happened today that moved you closer to who you want to become?
      </Typography>
      <View style={{ borderColor: PUBLIC_COLORS.border, borderRadius: 12, borderWidth: 1, marginTop: 14, minHeight: 95, padding: 14 }}>
        <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 13, lineHeight: 20 }}>I showed up for my run even though I was tired. Small win, big signal.</Typography>
      </View>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
        <Typography style={{ color: PUBLIC_COLORS.forest, fontSize: 11 }}>Self-Discipline</Typography>
        <View style={{ backgroundColor: PUBLIC_COLORS.forest, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 8 }}>
          <Typography className="font-inter-semibold" style={{ color: '#F7F4EE', fontSize: 10 }}>Save entry</Typography>
        </View>
      </View>
    </PreviewSurface>
  );
}

function FeatureSection({
  id,
  eyebrow,
  title,
  body,
  visual,
  reverse,
  stacked,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
  stacked: boolean;
}) {
  const copy = <PublicSectionHeading eyebrow={eyebrow} title={title} body={body} />;
  return (
    <View
      nativeID={id}
      style={{
        borderTopColor: PUBLIC_COLORS.dividerSubtle,
        borderTopWidth: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <BrandArtwork
        fit="cover"
        opacity={stacked ? 0.045 : 0.06}
        style={{ bottom: -24, left: -24, position: 'absolute', right: -24, top: -24 }}
        variant="woodgrain"
      />
      <View
        style={{
          alignItems: 'center',
          flexDirection: stacked ? 'column' : reverse ? 'row-reverse' : 'row',
          gap: stacked ? 42 : 86,
          marginHorizontal: 'auto',
          maxWidth: 1280,
          paddingHorizontal: stacked ? 24 : 56,
          paddingVertical: stacked ? 72 : 100,
          position: 'relative',
          width: '100%',
          zIndex: 1,
        }}
      >
        <View style={{ flex: 0.85, width: stacked ? '100%' : undefined }}>{copy}</View>
        <View style={{ flex: 1.15, width: stacked ? '100%' : undefined }}>{visual}</View>
      </View>
    </View>
  );
}

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const stacked = width < 1180;
  const compact = width < 620;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollFromHash = () => {
      const section = window.location.hash.slice(1);
      if (!['product', 'echo', 'momentum', 'constellation'].includes(section)) return;
      scrollToPublicSection(section as 'product' | 'echo' | 'momentum' | 'constellation', 'auto');
    };
    const frame = window.requestAnimationFrame(scrollFromHash);
    const settle = window.setTimeout(scrollFromHash, 120);
    window.addEventListener('hashchange', scrollFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('hashchange', scrollFromHash);
    };
  }, []);

  return (
    <PublicPageCanvas>
      <PublicHeader />
      <ScrollView nativeID="landing-page" style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ overflow: 'hidden', position: 'relative', width: '100%' }}>
          <BrandArtwork
            fit="cover"
            opacity={compact ? 0.1 : stacked ? 0.14 : 0.16}
            style={{ bottom: -28, left: -28, position: 'absolute', right: -28, top: -28 }}
            variant="woodgrain"
          />
          <View style={{ marginHorizontal: 'auto', maxWidth: 1380, paddingHorizontal: compact ? 24 : 56, paddingVertical: stacked ? 66 : 92, position: 'relative', width: '100%', zIndex: 1 }}>
            <View style={{ alignItems: 'center', flexDirection: stacked ? 'column' : 'row', gap: stacked ? 40 : 0, justifyContent: stacked ? undefined : 'space-between' }}>
              <View style={{ minWidth: 0, width: stacked ? '100%' : '43%' }}>
                <PreviewLabel>Grow with intention</PreviewLabel>
                <Typography className="font-inter-regular" style={{ color: PUBLIC_COLORS.ink, fontSize: compact ? 62 : width < 1380 ? 76 : 88, letterSpacing: compact ? -2.8 : -4, lineHeight: compact ? 68 : width < 1380 ? 83 : 94, marginTop: 20 }}>
                  OharaAI
                </Typography>
                <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 18, lineHeight: 30, marginTop: 24, maxWidth: 520 }}>
                  Turn what matters to you into goals, reflections, and meaningful progress—all connected in one evolving journey.
                </Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 34 }}>
                  <PublicButton href="/(auth)/signup" label="Start your journey" primary />
                  <PublicButton href="/#product" label="See how it works →" />
                </View>
              </View>
              <View style={{ alignItems: stacked ? 'center' : undefined, marginTop: stacked ? 14 : 0, minWidth: 0, width: stacked ? '100%' : '52%' }}><HeroPreviews width={width} /></View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: PUBLIC_COLORS.surfaceSoft, borderTopColor: PUBLIC_COLORS.dividerSubtle, borderTopWidth: 1, overflow: 'hidden', position: 'relative' }}>
          <BrandArtwork
            fit="cover"
            opacity={compact ? 0.035 : 0.05}
            style={{ bottom: -24, left: -24, position: 'absolute', right: -24, top: -24 }}
            variant="woodgrain"
          />
          <View style={{ alignItems: stacked ? 'flex-start' : 'center', flexDirection: stacked ? 'column' : 'row', gap: 36, justifyContent: 'space-between', marginHorizontal: 'auto', maxWidth: 1160, paddingHorizontal: compact ? 24 : 56, paddingVertical: 76, position: 'relative', width: '100%', zIndex: 1 }}>
            <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, flex: 1, fontSize: compact ? 30 : 38, letterSpacing: -1.3, lineHeight: compact ? 39 : 48 }}>
              Most tools track what you do.{'\n'}OHARA helps you understand who you&apos;re becoming.
            </Typography>
            <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 15, lineHeight: 25, maxWidth: 390 }}>
              Goals, daily actions, reflection, and progress become one connected system—so growth can be understood in context.
            </Typography>
          </View>
        </View>

        <FeatureSection
          id="product"
          stacked={stacked}
          eyebrow="Conversational Goals"
          title="Turn your intentions into clear, actionable goals."
          body="Use the guided builder manually or shape your goal in conversation with Echo—step by step, with the same clear structure beneath both paths."
          visual={<AIGoalCreationPreview />}
        />
        <FeatureSection id="echo" stacked={stacked} reverse eyebrow="Echo Entries" title="Reflect daily. Grow intentionally." body="Echo Entries preserve meaningful thoughts and connect reflection to your goals, actions, and evolving sense of growth." visual={<EchoPreview />} />
        <FeatureSection
          id="momentum"
          stacked={stacked}
          eyebrow="Ohara Momentum"
          title="See your progress. Stay on course."
          body="Momentum helps make movement visible before a goal is complete, bringing recent actions and reflection into a calm, supportive view."
          visual={
            <PreviewSurface style={{ padding: 24 }}>
              <MomentumPreviewHeader />
              <View style={{ marginTop: 8 }}>
                <PublicMomentumTrendChart variant="standard" />
              </View>
            </PreviewSurface>
          }
        />

        <View nativeID="constellation" style={{ backgroundColor: PUBLIC_COLORS.forestDark, overflow: 'hidden', position: 'relative' }}>
          <BrandArtwork
            dark
            fit="cover"
            opacity={compact ? 0.065 : 0.09}
            style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
            variant="vein"
          />
          <View style={{ alignItems: 'center', flexDirection: stacked ? 'column' : 'row', gap: 64, marginHorizontal: 'auto', maxWidth: 1280, paddingHorizontal: compact ? 24 : 56, paddingVertical: 100, position: 'relative', width: '100%', zIndex: 1 }}>
            <View style={{ flex: 0.9, width: stacked ? '100%' : undefined }}>
              <Typography className="font-inter-semibold" style={{ color: '#A8C4AE', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Constellation</Typography>
              <Typography className="font-inter-medium" style={{ color: '#F7F4EE', fontSize: 42, letterSpacing: -1.5, lineHeight: 49, marginTop: 16 }}>Connect the dots. See the bigger you.</Typography>
              <Typography style={{ color: '#D8E3DA', fontSize: 15, lineHeight: 25, marginTop: 18 }}>Constellation maps your goals and reflections together, revealing patterns and guiding your next step.</Typography>
            </View>
            <View style={{ backgroundColor: 'rgba(10,30,21,.42)', borderColor: 'rgba(255,255,255,.13)', borderRadius: 20, borderWidth: 1, flex: 1.1, padding: 20, width: stacked ? '100%' : undefined }}>
              <PublicConstellation dark variant="detailed" />
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'center', overflow: 'hidden', paddingHorizontal: 24, paddingVertical: 100, position: 'relative' }}>
          <BrandArtwork
            fit="cover"
            opacity={compact ? 0.035 : 0.055}
            style={{ bottom: -24, left: -24, position: 'absolute', right: -24, top: -24 }}
            variant="woodgrain"
          />
          <Image source={require('../../assets/brand/ohara-logo.png')} resizeMode="contain" style={{ height: 48, position: 'relative', tintColor: PUBLIC_COLORS.forest, width: 48, zIndex: 1 }} />
          <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, fontSize: compact ? 35 : 44, letterSpacing: -1.5, lineHeight: compact ? 43 : 52, marginBottom: 30, marginTop: 22, textAlign: 'center' }}>
            Your goals will change.{'\n'}Your life will too.
          </Typography>
          <PublicButton href="/(auth)/signup" label="Start your journey" primary />
          <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 18, textAlign: 'center' }}>Begin with what matters now. Let the journey evolve with you.</Typography>
        </View>
        <PublicFooter />
      </ScrollView>
    </PublicPageCanvas>
  );
}
