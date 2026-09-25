import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import supabase from '@/lib/db/client';
import { fetchIncomingProjectInvitations, fetchProjectSummaries, respondProjectInvitation } from '@/features/projects/services/project-service';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import type { IncomingProjectInvitation, ProjectStatus, ProjectSummary } from '@/features/projects/types';

type Filter = 'all' | ProjectStatus;

export default function ProjectsScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [invitations, setInvitations] = useState<IncomingProjectInvitation[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to view Projects.');
      const [nextProjects, nextInvitations] = await Promise.all([fetchProjectSummaries(user.id), fetchIncomingProjectInvitations()]);
      setProjects(nextProjects); setInvitations(nextInvitations);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Projects could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => projects.filter((project) => (filter === 'all' || project.status === filter)
    && `${project.title} ${project.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()), [filter, projects, search]);

  async function respond(id: string, response: 'accepted' | 'declined') {
    setInviteBusy(id);
    try { await respondProjectInvitation(id, response); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Invitation could not be updated.'); }
    finally { setInviteBusy(null); }
  }

  return <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE['3xl'], maxWidth: LAYOUT.contentMaxWidth, padding: compact ? SPACE.xl : LAYOUT.wideGutter, width: '100%' }}>
      <View style={{ alignItems: compact ? 'stretch' : 'flex-start', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
        <View style={{ gap: SPACE.xs }}><Typography accessibilityRole="header" variant="heading">Projects</Typography><Typography variant="title">Your bigger picture.</Typography><Typography variant="body">Bring your Goals, thinking, progress, and people together around what you’re building.</Typography></View>
        <Button leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setCreateOpen(true)}>New Project</Button>
      </View>
      <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.xs }}>
          {(['all', 'active', 'complete', 'archived'] as Filter[]).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={{ backgroundColor: filter === value ? colors.accent.primary : 'transparent', borderColor: colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, minWidth: 82, paddingHorizontal: 14, paddingVertical: 9 }}><Typography variant="emphasis-sm" style={{ color: filter === value ? colors.text.onAccent : colors.text.secondary, textAlign: 'center' }}>{value === 'all' ? 'All' : value === 'complete' ? 'Completed' : value[0].toUpperCase() + value.slice(1)}</Typography></Pressable>)}
        </ScrollView>
        <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACE.md, minWidth: compact ? 0 : 280, paddingHorizontal: SPACE.lg }}><Ionicons color={colors.text.muted} name="search-outline" size={18} /><TextInput accessibilityLabel="Search Projects" placeholder="Search Projects…" placeholderTextColor={colors.text.muted} value={search} onChangeText={setSearch} style={{ color: colors.text.primary, flex: 1, minHeight: 44 }} /></View>
      </View>
      {invitations.length ? <View style={{ backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: SPACE.xl }}>
        <Typography variant="section-header">Project invitations</Typography>
        {invitations.map((invitation) => <View key={invitation.id} style={{ alignItems: compact ? 'stretch' : 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between', paddingBottom: SPACE.md }}>
          <View style={{ flex: 1 }}><Typography variant="emphasis-sm">{invitation.projectTitle}</Typography><Typography variant="caption">{invitation.inviterName} invited you as {invitation.relationshipLabel || invitation.role}.</Typography></View>
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" disabled={inviteBusy === invitation.id} onPress={() => void respond(invitation.id, 'accepted')}>Accept</Button><Button size="compact" variant="secondary" disabled={inviteBusy === invitation.id} onPress={() => void respond(invitation.id, 'declined')}>Decline</Button></View>
        </View>)}
      </View> : null}
      {loading ? <ActivityIndicator color={colors.accent.primary} /> : error ? <View style={{ alignItems: 'center', gap: SPACE.lg, padding: SPACE['4xl'] }}><Typography variant="body">{error}</Typography><Button onPress={() => void load()} variant="secondary">Retry</Button></View> : visible.length ? <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.xl }}>{visible.map((project) => <ProjectCard key={project.id} project={project} />)}</View> : <View style={{ alignItems: 'center', borderColor: colors.border.divider, borderRadius: RADIUS.xl, borderStyle: 'dashed', borderWidth: 1, gap: SPACE.md, padding: SPACE['5xl'] }}><Ionicons color={colors.text.muted} name="folder-outline" size={30} /><Typography variant="title">No Projects yet.</Typography><Typography variant="body">Bring related Goals, Notes, and ideas together around what you’re building.</Typography><Button onPress={() => setCreateOpen(true)}>New Project</Button></View>}
    </ScrollView>
    <CreateProjectModal visible={createOpen} onClose={() => { setCreateOpen(false); void load(); }} />
  </>;
}
