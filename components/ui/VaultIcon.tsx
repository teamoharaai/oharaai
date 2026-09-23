import Ionicons from '@expo/vector-icons/Ionicons';

/** Canonical OHARA Vault mark. Reuse this component on every Vault surface. */
export function VaultIcon({ color, size = 18 }: { color: string; size?: number }) {
  return <Ionicons color={color} name="layers-outline" size={size} />;
}
