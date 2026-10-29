import { useWorkspaceDimensions } from '@/components/layout/WorkspaceContext';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import supabase from '@/lib/db/client';
import { fetchIncomingProjectInvitations, fetchProjectSummaries, respondProjectInvitation } from '@/features/projects/services/project-service';
import { ProjectCard, ProjectListRow } from '@/features/projects/components/ProjectCard';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import type { IncomingProjectInvitation, ProjectStatus, ProjectSummary } from '@/features/projects/types';

type Filter = 'all' | ProjectStatus;
type ProjectView = 'grid' | 'list';

export default function ProjectsScreen() {
  const colors = useThemeColors();
  const { width } = useWorkspaceDimensions();
  const compact = width < 720;
  const projectColumns = width >= 1180 ? 3 : width >= 720 ? 2 : 1;
  const [projectGridWidth, setProjectGridWidth] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<ProjectView>('list');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [invitations, setInvitations] = useState<IncomingProjectInvitation[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [context, setContext] = useState('all');
  const [category, setCategory] = useState('all');
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    setLoading(true); setError(null); setInviteError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to view Projects.');
      setUserId(user.id);
      const [projectResult, invitationResult] = await Promise.allSettled([fetchProjectSummaries(user.id), fetchIncomingProjectInvitations()]);
      if (invitationResult.status === 'fulfilled') { setInvitations(invitationResult.value); if (invitationResult.value.length) setInvitationsOpen(true); }
      else setInviteError('Invitations could not load. Your Projects are still available.');
      if (projectResult.status === 'rejected') throw projectResult.reason;
      setProjects(projectResult.value);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Projects could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => projects.filter((project) => (filter === 'all' || project.status === filter)
    && (context === 'all' || (context === 'shared' ? project.user_id !== userId : project.mode === context))
    && (category === 'all' || project.visualCategory === category)
    && `${project.title} ${project.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()), [filter, projects, search, context, category, userId]);
  const hasFilters = filter !== 'all' || category !== 'all' || search.trim().length > 0 || (context !== 'all' && context !== 'shared');
  const resetFilters = () => { setSearch(''); setFilter('all'); setCategory('all'); setContext('all'); };

  async function respond(id: string, response: 'accepted' | 'declined') {
    setInviteBusy(id);
    try { await respondProjectInvitation(id, response); await load(); }
    catch (caught) { setInviteError(caught instanceof Error ? caught.message : 'Invitation could not be updated.'); }
    finally { setInviteBusy(null); }
  }

  return <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE['3xl'], maxWidth: LAYOUT.contentMaxWidth, padding: compact ? SPACE.xl : LAYOUT.wideGutter, width: '100%' }}>
      <View style={{ alignItems: compact ? 'stretch' : 'flex-start', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
        <View style={{ gap: SPACE.sm, flex: 1 }}><Typography accessibilityRole="header" variant="heading">Projects</Typography><Typography variant="body">A space for everything you're building.</Typography></View>
        <Button accessibilityLabel="New Project" leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setCreateOpen(true)}>New Project</Button>
      </View>
      <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.xs }}>
          {(['all', 'active', 'complete', 'archived'] as Filter[]).map((value) => <Pressable key={value} accessibilityRole="button" aria-pressed={filter === value} onPress={() => setFilter(value)} style={{ backgroundColor: filter === value ? colors.accent.primary : 'transparent', borderColor: colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 82, paddingHorizontal: 14, paddingVertical: 9 }}><Typography variant="emphasis-sm" style={{ color: filter === value ? colors.text.onAccent : colors.text.secondary, textAlign: 'center' }}>{value === 'all' ? 'All' : value === 'complete' ? 'Completed' : value[0].toUpperCase() + value.slice(1)}</Typography></Pressable>)}
        </ScrollView>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <View accessibilityLabel="Project view" accessibilityRole="toolbar" style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', padding: 3 }}>
            {([
              { id: 'grid', icon: 'grid-outline', label: 'Grid view' },
              { id: 'list', icon: 'list-outline', label: 'List view' },
            ] as const).map((option) => {
              const selected = view === option.id;
              return <Pressable key={option.id} accessibilityLabel={`${option.label}${selected ? ', selected' : ''}`} accessibilityRole="button" aria-pressed={selected} onPress={() => setView(option.id)} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: selected ? colors.background.card : 'transparent', borderRadius: RADIUS.sm, height: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1, width: 44 })}><Ionicons color={selected ? colors.accent.primary : colors.text.secondary} name={option.icon} size={19} /></Pressable>;
            })}
          </View>
          <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flex: 1, flexDirection: 'row', gap: SPACE.md, minWidth: compact ? 0 : 280, paddingHorizontal: SPACE.lg }}><Ionicons color={colors.text.muted} name="search-outline" size={18} /><TextInput accessibilityLabel="Search Projects" placeholder="Search Projects…" placeholderTextColor={colors.text.muted} value={search} onChangeText={setSearch} style={{ color: colors.text.primary, flex: 1, minHeight: 44 }} /></View>
        </View>
      </View>
      <View style={{ gap: SPACE.md }}>
        <Button accessibilityLabel="Project filters" accessibilityState={{ expanded: showFilters }} variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => setShowFilters(!showFilters)}>{showFilters ? 'Hide filters' : 'Filters'}{context !== 'all' || category !== 'all' ? ' · Applied' : ''}</Button>
        {showFilters ? <Card style={{ gap: SPACE.md }}>
        <View accessibilityLabel="Project context filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{[['all', 'All contexts'], ['personal', 'Personal'], ['team', 'Team'], ['guide', 'Guide'], ['shared', 'Shared with me']].map(([value, label]) => <Button key={value} style={{ minHeight: 44 }} size="compact" aria-pressed={context === value} variant={context === value ? 'primary' : 'secondary'} onPress={() => setContext(value)}>{label}</Button>)}</View>
        <View accessibilityLabel="Project category filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{[['all', 'All categories'], ['Health & Fitness', 'Health & Fitness'], ['Work & Money', 'Work & Money'], ['Learning & Creativity', 'Learning & Creativity'], ['Life & Relationships', 'Life & Relationships'], ['mixed', 'Mixed / Uncategorized']].map(([value, label]) => <Button key={value} style={{ minHeight: 44 }} size="compact" aria-pressed={category === value} variant={category === value ? 'primary' : 'ghost'} onPress={() => setCategory(value)}>{label}</Button>)}</View>
        </Card> : null}
      </View>
      <Card padding="compact" style={{ gap: SPACE.lg, ...(!loading && !inviteError && !invitations.length && !invitationsOpen ? { alignSelf: 'flex-start', backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0, paddingVertical: 0 } : {}) }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Project Invitations${loading ? ' · Loading' : ` · ${invitations.length}`}`} accessibilityState={{ expanded: invitationsOpen }} onPress={() => setInvitationsOpen(!invitationsOpen)} style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 44 }}><Typography variant="emphasis-sm">Project Invitations{loading ? ' · Loading…' : ` · ${invitations.length}`}</Typography><Ionicons color={colors.text.secondary} name={invitationsOpen ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>
        {inviteError ? <View style={{ gap: SPACE.sm }}><Typography accessibilityRole="alert" variant="body-small">{inviteError}</Typography><Button variant="secondary" onPress={() => void load()}>Retry invitations</Button></View> : null}
        {invitationsOpen && !loading && !invitations.length && !inviteError ? <Typography variant="body-small">No pending invitations.</Typography> : null}
        {(invitationsOpen ? invitations : []).map((invitation) => <View key={invitation.id} style={{ alignItems: compact ? 'stretch' : 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between', paddingBottom: SPACE.md }}>
          <View style={{ flex: 1 }}><Typography variant="emphasis-sm">{invitation.projectTitle}</Typography><Typography variant="caption">{invitation.inviterName} invited you as {invitation.relationshipLabel || invitation.role}.</Typography></View>
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" disabled={inviteBusy === invitation.id} onPress={() => void respond(invitation.id, 'accepted')}>Accept</Button><Button size="compact" variant="secondary" disabled={inviteBusy === invitation.id} onPress={() => void respond(invitation.id, 'declined')}>Decline</Button></View>
        </View>)}
      </Card>
      {loading ? <ActivityIndicator color={colors.accent.primary} /> : error ? <View style={{ alignItems: 'center', gap: SPACE.lg, padding: SPACE['4xl'] }}><Typography variant="body">{error}</Typography><Button onPress={() => void load()} variant="secondary">Retry</Button></View> : visible.length ? view === 'grid' ? <View
        accessibilityLabel={`${projectColumns}-column Project grid`}
        onLayout={(event) => setProjectGridWidth(event.nativeEvent.layout.width)}
        style={{ alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xl, width: '100%' }}
      >{visible.map((project) => <ProjectCard
        key={project.id}
        project={project}
        width={projectGridWidth > 0
          ? Math.max(0, (projectGridWidth - SPACE.xl * (projectColumns - 1)) / projectColumns)
          : undefined}
      />)}</View> : <View accessibilityLabel="Project list" style={{ gap: SPACE.sm, width: '100%' }}>{visible.map((project) => <ProjectListRow key={project.id} project={project} />)}</View> : <Card style={{ alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE['5xl'] }}><Ionicons color={colors.text.muted} name="folder-outline" size={30} /><Typography variant="title">{hasFilters ? 'No matching Projects' : context === 'shared' ? 'No shared Projects' : 'No Projects yet'}</Typography><Typography variant="body" style={{ textAlign: 'center' }}>{hasFilters ? 'Try another search, status, category, or context.' : context === 'shared' ? 'Projects you join will appear here. Check your invitations above.' : 'Start with an idea, a collection of information, or people to collaborate with. Goals are optional.'}</Typography>{hasFilters || context === 'shared' ? <Button onPress={resetFilters} variant="secondary">Clear filters</Button> : <Button onPress={() => setCreateOpen(true)}>New Project</Button>}</Card>}
    </ScrollView>
    <CreateProjectModal visible={createOpen} onClose={() => { setCreateOpen(false); void load(); }} />
  </>;
}
