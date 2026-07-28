import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';

export default function AcceptanceGoalDestination() {
  return (
    <View
      accessibilityLabel="Acceptance goal creation destination"
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Typography accessibilityRole="header" variant="heading">
        Goal creation destination
      </Typography>
    </View>
  );
}
