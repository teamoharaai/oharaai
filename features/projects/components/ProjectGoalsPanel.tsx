import { View, Pressable } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { getGoalCategoryLabel, getGoalStatusLabel, getNextGoalMilestone } from '@/features/goals/goals-workspace';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ProjectWorkspace } from '../types';

export function ProjectGoalsPanel({ project, filter, onFilter, onOpen, onManage, onAdd, onCreate }: {
  project: ProjectWorkspace;
  filter: string;
  onFilter: (value: string) => void;
  onOpen: (goal: GoalWithDetails) => void;
  onManage: () => void;
  onAdd: () => void;
  onCreate: () => void;
}) {
  const colors = useThemeColors();
  const capabilities = new Set(project.collaboration.capabilities);
  const goals = project.goals.filter((goal) => filter === 'all' || (filter === 'historical' ? ['complete', 'expired', 'archived'].includes(goal.status) : goal.status === filter));
  return <View testID="project-goals-v2" style={{ gap: SPACE.xl }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="title">Associated Goals</Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        {project.collaboration.role === 'owner' ? <Button variant="secondary" onPress={onAdd}>Add Existing Goal</Button> : null}
        {capabilities.has('create_goal') ? <Button onPress={onCreate}>New Goal</Button> : null}
        {project.collaboration.role === 'owner' || capabilities.has('assign_goal_lead') || capabilities.has('create_task') || capabilities.has('create_milestone') ? <Button variant="secondary" onPress={onManage}>Manage Goals</Button> : null}
      </View>
    </View>
    <View accessibilityLabel="Project Goal lifecycle filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      {[['active', 'Active'], ['complete', 'Completed'], ['historical', 'Historical'], ['stagnant', 'Paused'], ['expired', 'Expired'], ['archived', 'Archived'], ['all', 'All']].map(([value, label]) => <Button key={value} aria-pressed={filter === value} variant={filter === value ? 'primary' : 'secondary'} onPress={() => onFilter(value)}>{label}</Button>)}
    </View>
    {goals.length ? goals.map((goal) => {
      const milestone = goal.status === 'active' || goal.status === 'stagnant' ? getNextGoalMilestone(goal.milestones) : null;
      const lead = project.collaboration.members.find((member) => member.userId === goal.projectLeadId);
      const successor = project.goals.find((candidate) => candidate.previous_goal_id === goal.id);
      return <Card key={goal.id}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open Goal ${goal.title}`} onPress={() => onOpen(goal)} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, minHeight: 64 }}>
          <BrandIcon name="goals" size={26} color={colors.text.accent} />
          <View style={{ flex: 1, minWidth: 0, gap: SPACE.sm }}>
            <Typography variant="title">{goal.title}</Typography>
            <Typography variant="caption">{getGoalStatusLabel(goal.status)} · {getGoalCategoryLabel(goal.category)}</Typography>
            <Typography variant="body-small">Lead: {lead?.displayName ?? 'Unassigned'}</Typography>
            {milestone ? <Typography variant="caption">Next milestone: {milestone.title}</Typography> : null}
          </View>
          <Typography variant="title" style={{ color: colors.text.accent }}>→</Typography>
        </Pressable>
        {successor ? <Button variant="ghost" onPress={() => onOpen(successor)}>Continue to {successor.title}</Button> : null}
      </Card>;
    }) : <Card style={{ gap: SPACE.lg, paddingVertical: SPACE['3xl'], alignItems: 'center' }}>
      <Typography variant="title">{project.goals.length ? 'No Goals in this view' : 'Goals are optional here'}</Typography>
      <Typography variant="body" style={{ textAlign: 'center' }}>{project.goals.length ? 'Choose another lifecycle filter to revisit this Project’s Goals.' : 'Your Project can hold information and conversation on its own. Add a Goal when you have an outcome to work toward.'}</Typography>
    </Card>}
  </View>;
}
