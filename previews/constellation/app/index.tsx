import { useLocalSearchParams } from 'expo-router';
import { ConstellationFixturePreview } from '@/features/constellation/dev/ConstellationFixturePreview';

export default function ConstellationPreviewRoute() {
  const params = useLocalSearchParams<{ appearance?: string | string[] }>();
  const requestedAppearance = Array.isArray(params.appearance)
    ? params.appearance[0]
    : params.appearance;

  return (
    <ConstellationFixturePreview
      appearance={requestedAppearance === 'dark' ? 'dark' : 'light'}
    />
  );
}
