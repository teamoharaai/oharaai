/**
 * SaveDraftButton — outlined footer button for the Review screen.
 *
 * Copy to: features/goals/components/SaveDraftButton.tsx
 * Renders alongside the existing "Create this goal" primary Button in the
 * sticky footer of GoalReviewScreen.tsx.
 *
 * The submit handler (props.onPress) should POST the same payload as Create,
 * with status: 'draft'. See AIGoalCreation.tsx submitGoal() for the extension
 * point.
 */
import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { FocusedField as T } from '@/constants/focused-tokens';

export interface SaveDraftButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function SaveDraftButton({ onPress, disabled, isSubmitting }: SaveDraftButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isSubmitting}
      accessibilityRole="button"
      accessibilityLabel="Save this goal as a draft"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'transparent',
        borderColor: T.border.faint,
        borderWidth: 1,
        borderRadius: T.radius.button,
        paddingVertical: 11,
        paddingHorizontal: 20,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 10, height: 10, borderRadius: 5,
          borderColor: T.text.muted, borderWidth: 1.5,
          backgroundColor: 'transparent',
        }}
      />
      <Typography
        style={{
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: '500',
          color: T.text.inverse,
        }}
      >
        {isSubmitting ? 'Saving…' : 'Save draft'}
      </Typography>
    </Pressable>
  );
}

export default SaveDraftButton;
