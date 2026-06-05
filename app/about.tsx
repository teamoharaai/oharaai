import { ScrollView, View } from "react-native";
import { Typography } from "@/components/ui/Typography";

export default function AboutPage() {
  return (
    <ScrollView className="flex-1">
      <View className="mx-auto w-full max-w-5xl px-6 py-24">
        <Typography variant="display">
          About OHARA
        </Typography>

        <Typography variant="body" className="mt-6">
          Helping people understand themselves, not just track themselves.
        </Typography>

        <View className="mt-20">
          <Typography variant="headline">
            Why We Exist
          </Typography>

          <Typography variant="body" className="mt-4">
            Most productivity and habit-tracking apps measure actions.
            OHARA is designed to uncover the patterns, beliefs, habits,
            and behaviors beneath those actions.
          </Typography>

          <Typography variant="body" className="mt-4">
            We believe meaningful growth comes from understanding
            why we do what we do, not simply recording what happened.
          </Typography>
        </View>

        <View className="mt-16">
          <Typography variant="headline">
            What Makes OHARA Different
          </Typography>

          <Typography variant="body" className="mt-4">
            Goals are connected to identity.
            Habits are connected to context.
            Progress is connected to reflection.
          </Typography>

          <Typography variant="body" className="mt-4">
            Rather than treating goals as isolated checklists,
            OHARA looks for connections across the different
            areas of a person's life.
          </Typography>
        </View>

        <View className="mt-16">
          <Typography variant="headline">
            Long-Term Vision
          </Typography>

          <Typography variant="body" className="mt-4">
            Our vision is to create a personalized system for
            self-understanding.
          </Typography>

          <Typography variant="body" className="mt-4">
            In the future, OHARA will be able to connect data
            from goals, habits, reflections, and external
            applications to provide deeper insights and
            recommendations tailored to each individual.
          </Typography>

          <Typography variant="body" className="mt-4">
            Every person's life is different.
            Their guidance should be too.
          </Typography>
        </View>
      </View>
    </ScrollView>
  );
}