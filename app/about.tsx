import { ScrollView, useWindowDimensions, View } from 'react-native';

import { BrandArtwork } from '@/components/landing/BrandArtwork';
import {
  PublicButton,
  PublicFooter,
  PublicHeader,
  PublicPageCanvas,
  PublicSectionHeading,
  PUBLIC_COLORS,
} from '@/components/landing/PublicPrimitives';
import { Typography } from '@/components/ui/Typography';

function StoryBlock({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <View style={{ borderTopColor: PUBLIC_COLORS.border, borderTopWidth: 1, paddingTop: 28 }}>
      <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.forest, fontSize: 11, letterSpacing: 1.8, lineHeight: 16, textTransform: 'uppercase' }}>
        {eyebrow}
      </Typography>
      <View style={{ gap: 16, marginTop: 18 }}>{children}</View>
    </View>
  );
}

export default function AboutPage() {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  return (
    <PublicPageCanvas>
      <PublicHeader />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ minHeight: compact ? 520 : 620, overflow: 'hidden', position: 'relative' }}>
          <BrandArtwork opacity={compact ? 0.055 : 0.09} style={{ bottom: -80, height: 610, position: 'absolute', right: -80, width: 610 }} variant="vein" />
          <View style={{ justifyContent: 'center', marginHorizontal: 'auto', maxWidth: 1220, minHeight: compact ? 520 : 620, paddingHorizontal: compact ? 24 : 56, width: '100%' }}>
            <PublicSectionHeading
              eyebrow="About OHARA"
              title="Helping people understand themselves, not just track themselves."
              body="OHARA brings goals, habits, context, and reflection into one evolving view of personal growth."
            />
          </View>
        </View>

        <View style={{ backgroundColor: PUBLIC_COLORS.surface, borderBottomColor: PUBLIC_COLORS.border, borderBottomWidth: 1, borderTopColor: PUBLIC_COLORS.border, borderTopWidth: 1 }}>
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: compact ? 46 : 90, marginHorizontal: 'auto', maxWidth: 1120, paddingHorizontal: compact ? 24 : 56, paddingVertical: compact ? 72 : 96, width: '100%' }}>
            <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, flex: 0.8, fontSize: compact ? 31 : 40, letterSpacing: -1.3, lineHeight: compact ? 40 : 49 }}>
              Growth starts with understanding why we do what we do.
            </Typography>
            <View style={{ flex: 1, gap: 40 }}>
              <StoryBlock eyebrow="Why we exist">
                <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 16, lineHeight: 27 }}>
                  Most productivity and habit-tracking apps measure actions. OHARA is designed to uncover the patterns, beliefs, habits, and behaviors beneath those actions.
                </Typography>
                <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 16, lineHeight: 27 }}>
                  We believe meaningful growth comes from understanding why we do what we do, not simply recording what happened.
                </Typography>
              </StoryBlock>
              <StoryBlock eyebrow="What makes OHARA different">
                <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 16, lineHeight: 27 }}>
                  Goals are connected to identity. Habits are connected to context. Progress is connected to reflection.
                </Typography>
                <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 16, lineHeight: 27 }}>
                  Rather than treating goals as isolated checklists, OHARA looks for connections across the different areas of a person&apos;s life.
                </Typography>
              </StoryBlock>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: PUBLIC_COLORS.forestDark, overflow: 'hidden', position: 'relative' }}>
          <BrandArtwork dark fit="cover" opacity={compact ? 0.065 : 0.1} style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} variant="vein" />
          <View style={{ marginHorizontal: 'auto', maxWidth: 920, paddingHorizontal: compact ? 24 : 56, paddingVertical: 94, position: 'relative', width: '100%', zIndex: 1 }}>
            <Typography className="font-inter-semibold" style={{ color: '#A8C4AE', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Long-term vision</Typography>
            <Typography className="font-inter-medium" style={{ color: '#F7F4EE', fontSize: compact ? 32 : 42, letterSpacing: -1.3, lineHeight: compact ? 41 : 51, marginTop: 18 }}>
              A personalized system for self-understanding.
            </Typography>
            <View style={{ gap: 17, marginTop: 26, maxWidth: 760 }}>
              <Typography style={{ color: '#D8E3DA', fontSize: 16, lineHeight: 27 }}>
                In the future, OHARA will be able to connect data from goals, habits, reflections, and external applications to provide deeper insights and recommendations tailored to each individual.
              </Typography>
              <Typography style={{ color: '#D8E3DA', fontSize: 16, lineHeight: 27 }}>
                Every person&apos;s life is different. Their guidance should be too.
              </Typography>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 90 }}>
          <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, fontSize: compact ? 32 : 40, letterSpacing: -1.2, lineHeight: compact ? 40 : 48, marginBottom: 28, textAlign: 'center' }}>
            Begin with what matters to you.
          </Typography>
          <PublicButton href="/(auth)/signup" label="Start your journey" primary />
        </View>
        <PublicFooter />
      </ScrollView>
    </PublicPageCanvas>
  );
}
