import { useLocalSearchParams } from 'expo-router';
import { ConstellationFixturePreview } from '@/features/constellation/dev/ConstellationFixturePreview';
import {
  resolveConstellationPreviewAppearance,
  resolveConstellationPreviewState,
} from '@/features/constellation/dev/preview-state.dev';

export default function ConstellationPreviewRoute() {
  const params = useLocalSearchParams<{
    appearance?: string | string[];
    state?: string | string[];
  }>();

  return (
    <ConstellationFixturePreview
      appearance={resolveConstellationPreviewAppearance(params.appearance)}
      previewState={resolveConstellationPreviewState(params.state)}
    />
  );
}
