import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const landing = readFileSync(resolve(process.cwd(), 'app/(app)/projects/index.tsx'), 'utf8');
const projectCard = readFileSync(resolve(process.cwd(), 'features/projects/components/ProjectCard.tsx'), 'utf8');
const workspace = readFileSync(resolve(process.cwd(), 'app/(app)/projects/[id].tsx'), 'utf8');
const vault = readFileSync(resolve(process.cwd(), 'features/projects/components/ProjectVaultWorkspace.tsx'), 'utf8');
const nav = readFileSync(resolve(process.cwd(), 'components/layout/AppNavigation.tsx'), 'utf8');
const goalHeader = readFileSync(resolve(process.cwd(), 'features/goals/components/GoalDetailHeader.tsx'), 'utf8');
const service = readFileSync(resolve(process.cwd(), 'features/projects/services/project-service.ts'), 'utf8');
const sharedVault = readFileSync(resolve(process.cwd(), 'features/goals/components/GoalVault.tsx'), 'utf8');
const brandIcon = readFileSync(resolve(process.cwd(), 'components/ui/BrandIcon.tsx'), 'utf8');
const manage = readFileSync(resolve(process.cwd(), 'features/projects/components/ManageProjectModal.tsx'), 'utf8');
const intelligence = readFileSync(resolve(process.cwd(), 'features/projects/intelligence.ts'), 'utf8');
const contextualIntelligence = readFileSync(resolve(process.cwd(), 'features/intelligence/contextual-insights.ts'), 'utf8');
const comments = readFileSync(resolve(process.cwd(), 'features/projects/components/ProjectComments.tsx'), 'utf8');
const chat = readFileSync(resolve(process.cwd(), 'features/projects/components/ProjectChat.tsx'), 'utf8');
const intelligenceHeader = readFileSync(resolve(process.cwd(), 'components/ui/IntelligenceHeader.tsx'), 'utf8');
const momentum = readFileSync(resolve(process.cwd(), 'app/(app)/momentum.tsx'), 'utf8');
const goalIntelligence = readFileSync(resolve(process.cwd(), 'features/goals/components/IntelligencePanel.tsx'), 'utf8');
const taskEndpoint = readFileSync(resolve(process.cwd(), 'app/api/task-occurrences/[id]+api.ts'), 'utf8');
const goalsWorkspace = readFileSync(resolve(process.cwd(), 'features/goals/components/GoalsWorkspace.tsx'), 'utf8');
const tasksPanel = readFileSync(resolve(process.cwd(), 'features/tasks/components/TasksPanel.tsx'), 'utf8');

test('Projects is a first-class horizontal navigation destination', () => {
  assert.match(nav, /label: 'Projects'.*href: '\/\(app\)\/projects'/);
  assert.match(brandIcon, /name === 'project'[\s\S]*folder-outline/);
});

test('landing uses meaningful data without progress percentages or imagery', () => {
  assert.match(landing, /Your bigger picture/);
  assert.match(landing, /fetchProjectSummaries/);
  assert.doesNotMatch(landing, /progress percentage|scenic|quote/i);
});

test('Projects landing uses fixed responsive column tracks instead of content-sized flex cards', () => {
  assert.match(landing, /width >= 1180 \? 3 : width >= 720 \? 2 : 1/);
  assert.match(landing, /projectGridWidth - SPACE\.xl \* \(projectColumns - 1\)/);
  assert.match(landing, /accessibilityLabel=\{`\$\{projectColumns\}-column Project grid`\}/);
  assert.doesNotMatch(projectCard, /flexBasis: 380|flexGrow: 1|maxWidth: 520/);
  assert.match(projectCard, /minWidth: 0[\s\S]*width: width \?\? '100%'/);
  assert.match(projectCard, /maxWidth: '100%'[\s\S]*numberOfLines=\{1\}/);
});

test('workspace contains approved overview and owner-only Vault hierarchy', () => {
  for (const label of ['Current Goals', 'Project Chat', 'Recent Activity', 'Notes', 'Reflections', 'Upcoming Milestones', 'Project Tasks', 'Project Snapshot', 'Momentum Snapshot', 'Echo']) assert.match(`${workspace}\n${chat}`, new RegExp(label));
  assert.doesNotMatch(workspace, /Project Notice/);
  assert.doesNotMatch(workspace, /title="Sticky Notes"/);
  assert.doesNotMatch(vault, /Project Sticky Note|Add Sticky Note|Sticky Notes/);
  assert.match(sharedVault, /origins/);
  assert.match(workspace, /\{projectHeader\}\{milestonesCard\}\{tasksCard\}/);
  assert.match(workspace, /\{snapshotCard\}\{intelligenceCard\}\{momentumCard\}\{activityCard\}/);
});

test('workspace keeps Goal summaries compact and bounds attention to meaningful Tasks', () => {
  assert.match(workspace, /Task needs.*attention/);
  assert.match(workspace, /task\.timing === 'overdue'.*task\.timing === 'today'/);
  assert.match(workspace, /Lead: \{leadName\}/);
  assert.match(workspace, /Assign →/);
  assert.doesNotMatch(workspace, /borderTopColor: colors\.border\.divider/);
  assert.doesNotMatch(workspace, /Next: \{nextMilestone\.title\}/);
  assert.doesNotMatch(workspace, /ProjectGoalRow/);
});

test('workspace presents an actionable Task assignment menu and separated contextual Comments', () => {
  assert.doesNotMatch(workspace, /accessibilityRole="radiogroup"/);
  assert.match(workspace, /Assigned to:/);
  assert.match(workspace, /assignProjectTask/);
  assert.match(workspace, /Assignee options for/);
  assert.match(workspace, /Unassigned/);
  assert.match(workspace, /expandedCommentTaskId/);
  assert.match(workspace, /Comments for \$\{task\.title\}/);
  assert.match(workspace, /\+ Add comment/);
  assert.doesNotMatch(workspace, /project\.comments\.slice\(0, 2\)/);
});

test('Project Tasks execute canonical occurrences and preserve Goal return context', () => {
  assert.match(workspace, /mutateTaskOccurrence/);
  assert.match(workspace, /accessibilityRole="checkbox"/);
  assert.match(workspace, /Log \+1/);
  assert.match(workspace, /refreshMomentumAfterMeaningfulMutation/);
  assert.match(workspace, /goalWorkspaceHref\(task\.goalId, 'active', task\.id\)/);
  assert.match(taskEndpoint, /mutate_project_task_occurrence_v12/);
  assert.match(goalsWorkspace, /focusedTaskId/);
  assert.match(tasksPanel, /OPENED FROM PROJECT/);
});

test('Notes and Reflections cards use canonical project-aware destinations', () => {
  assert.match(workspace, /\+ New \{kind === 'note' \? 'Note' : 'Reflection'\}/);
  assert.match(workspace, /kind === 'note' \? '\/\(app\)\/notes' : '\/\(app\)\/reflections'/);
  assert.match(workspace, /params: \{ create: kind, projectId: project\.id \}/);
});

test('Echo uses one presentation hierarchy without changing facts', () => {
  assert.match(intelligenceHeader, />\s*Echo\s*</);
  assert.match(intelligenceHeader, /— \{label\}/);
  assert.match(workspace, /IntelligenceHeader insightType/);
  assert.match(momentum, /IntelligenceHeader insightType/);
  assert.match(goalIntelligence, /Echo — Goal Insight/);
  assert.match(workspace, /variant="ai-italic"/);
});

test('Project Vault separates Notes and Reflections and applies strict Source semantics', () => {
  assert.match(sharedVault, /title="Notes"/);
  assert.match(sharedVault, /title="Reflections"/);
  assert.match(sharedVault, /filter\(isSourceVaultItem\)/);
  assert.doesNotMatch(sharedVault, /label: 'Sticky Notes'/);
});

test('Goal title and sibling actions share the intentional header row', () => {
  assert.match(goalHeader, /GoalTitleRow[\s\S]*Back to Overview[\s\S]*ManageGoalControl/);
  assert.match(goalHeader, /Add to Vault/);
});

test('Project activity is truthful, bounded, and partial-source failures degrade independently', () => {
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /Task completed/);
  assert.match(service, /entry_goal_links/);
  assert.match(service, /New Phase created/);
  assert.match(service, /partialErrors/);
  assert.match(service, /activityTargetTitle/);
  assert.match(workspace, /commented on \$\{targetLabel\}/);
  assert.match(workspace, /on: \$\{item\.origin\}/);
});

test('Project first render avoids full-account Momentum and full Entry library hydration', () => {
  assert.doesNotMatch(workspace, /useMomentumHomeSummary\(/);
  assert.match(service, /get_project_goal_momentum_v11/);
  assert.doesNotMatch(service, /fetchEntries\(\)/);
  assert.match(workspace, /includeSecondary: !deferSecondary/);
  assert.match(service, /includeSecondary \? authedFetch/);
  assert.doesNotMatch(service, /enrichGoalsWithSignals/);
  assert.doesNotMatch(service, /\.select\('[^']*(?:conversation_turns|takeaway)/);
});

test('Project and Goal routes isolate render failures behind route boundaries', () => {
  const goalRoute = readFileSync(resolve(process.cwd(), 'app/(app)/goals/index.tsx'), 'utf8');
  assert.match(workspace, /export function ErrorBoundary/);
  assert.match(goalRoute, /export function ErrorBoundary/);
  assert.match(workspace, /Retry Project/);
  assert.match(goalRoute, /Retry Goal/);
});

test('Goal context tolerates older partial Momentum projections', () => {
  assert.match(goalsWorkspace, /Array\.isArray\(summary\?\.history\)/);
  assert.match(goalsWorkspace, /Array\.isArray\(summary\?\.reasons\)/);
  assert.doesNotMatch(goalsWorkspace, /summary\?\.history\.length/);
  assert.doesNotMatch(goalsWorkspace, /summary\?\.reasons\[0\]/);
});

test('collaboration UI exposes modes, bounded membership, responsibility, and contextual comments', () => {
  for (const label of ['Personal', 'Team', 'OHARA Guide', 'Goal Lead', 'Invite to Project', 'Invite Guide', 'Access / Mode']) assert.match(manage, new RegExp(label));
  assert.match(manage, /PROJECT_MEMBER_LIMIT/);
  assert.match(manage, /assignProjectMilestone/);
  assert.doesNotMatch(manage, /createProjectComment/);
  assert.doesNotMatch(manage, />Comment</);
  assert.match(workspace, /\['mine', 'everyone', 'upcoming'\]/);
  assert.match(comments, /Edit comment by/);
  assert.match(comments, /Delete comment by/);
  assert.match(comments, /editingId/);
  assert.match(comments, /Delete comment\?/);
  assert.match(comments, /currentUserId === comment\.authorId/);
});

test('Project Chat is a distinct realtime conversation with author-only controls', () => {
  assert.match(chat, /project_chat_messages/);
  assert.match(chat, /Project Chat becomes available when collaborators join/);
  assert.match(chat, /createProjectChatMessage/);
  assert.match(chat, /editProjectChatMessage/);
  assert.match(chat, /deleteProjectChatMessage/);
  assert.match(chat, /message\.authorId === currentUserId/);
  assert.match(chat, /maxHeight: 300/);
  assert.doesNotMatch(chat, /ProjectComments/);
});

test('Project Intelligence is deterministic and does not call an LLM', () => {
  assert.match(intelligence, /structured facts/);
  assert.match(contextualIntelligence, /selectContextualInsight/);
  assert.match(contextualIntelligence, /\.sort\(/);
  assert.doesNotMatch(`${intelligence}\n${contextualIntelligence}`, /openai|anthropic|fetch\(/i);
  assert.match(workspace, /IntelligenceHeader insightType="Project Insight"/);
});
