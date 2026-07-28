import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';

export default function AcceptanceEchoDestination() {
  return (
    <View
      accessibilityLabel="Acceptance Echo destination"
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Typography accessibilityRole="header" variant="heading">
        Echo destination
      </Typography>
    </View>
  );
}
