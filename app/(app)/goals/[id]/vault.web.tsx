import { Redirect, useLocalSearchParams } from 'expo-router';

/** Preserve Roots/bookmarked Vault URLs; native keeps its existing screen. */
export default function GoalVaultDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/(app)/goals', params: { goal: id, view: 'vault' } }} />;
}
