import { View, ScrollView, Pressable, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { deleteProject, fetchProjectWithGoals, updateProject } from '@/features/projects/services/project-service';
import { ProjectTitleRow } from '@/features/projects/components/ProjectTitleRow';
import { GoalCard } from '@/features/goals/components/GoalCard';
import type { ProjectWithGoals, ProjectStatus } from '@/features/projects/types';
import { useThemeColors } from '@/store/uiStore';

function getProjectStatusBadgeVariant(status: ProjectStatus): 'active' | 'complete' | 'archived' {
  switch (status) {
    case 'active':
      return 'active';
    case 'archived':
      return 'archived';
    case 'complete':
    default:
      return 'complete';
  }
}

export default function ProjectDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectWithGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProjectWithGoals(id).then((data) => {
      setProject(data);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
        <View style={{ padding: 20 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Typography variant="nav-back">← Back</Typography>
          </Pressable>
          <Typography variant="body" style={{ fontSize: 17 }}>Project not found.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = project.status === 'active'
    ? 'Active'
    : project.status === 'complete'
      ? 'Complete'
      : 'Archived';
  const statusVariant = getProjectStatusBadgeVariant(project.status);

  const inputStyle = {
    backgroundColor: colors.background.input,
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
  } as const;

  const openEditModal = () => {
    setEditTitle(project.title);
    setEditDescription(project.description ?? '');
    setEditError(null);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    if (isSubmittingEdit) return;
    setEditTitle(project.title);
    setEditDescription(project.description ?? '');
    setEditError(null);
    setIsEditModalVisible(false);
  };

  const handleEditProjectPress = () => {
    openEditModal();
  };

  const handleSaveProject = async () => {
    if (isSubmittingEdit) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError('Project name is required.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);

      const updatedProject = await updateProject(project.id, {
        title: trimmedTitle,
        description: editDescription,
      });

      setProject((currentProject) => (
        currentProject
          ? { ...currentProject, ...updatedProject }
          : currentProject
      ));
      setEditTitle(updatedProject.title);
      setEditDescription(updatedProject.description ?? '');
      setIsEditModalVisible(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update project.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      setIsDeleteModalVisible(false);
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/(app)/dashboard');
    } catch {
      setIsDeleteModalVisible(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          {/* Back nav */}
          <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <Typography variant="nav-back">← Back</Typography>
          </Pressable>

          {/* Project hero */}
          <View
            style={{
              backgroundColor: colors.background.card,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent.primary,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <ProjectTitleRow
              title={project.title}
              variant="heading"
              iconSize={26}
              iconStyle={{ marginRight: 10 }}
              textStyle={{ fontFamily: 'Inter-Bold', color: colors.text.primary, lineHeight: 30 }}
            />

            {project.description && (
              <Typography
                variant="body"
                style={{ fontSize: 14, lineHeight: 20, marginTop: 8 }}
              >
                {project.description}
              </Typography>
            )}

            <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
              <Badge label={statusLabel} variant={statusVariant} />
            </View>

            {/* TODO: space badge requires space_id join — not available from current project query */}
          </View>

          {/* Goals section */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <Typography variant="section-header">
                  Goals
                </Typography>
                <Badge label={`${project.goals.length}`} variant="category" />
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/goals/create', params: { projectId: project.id } })}
                style={{
                  backgroundColor: colors.accent.primary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>+ Add Goal</Typography>
              </Pressable>
            </View>

            {project.goals.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.background.card,
                  borderColor: colors.border.warm,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 28,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 1,
                }}
              >
                <Typography
                  variant="body"
                  style={{ marginBottom: 16, textAlign: 'center' }}
                >
                  Break this ambition into achievable goals
                </Typography>
                <Pressable
                  onPress={() => router.push({ pathname: '/goals/create', params: { projectId: project.id } })}
                  style={{
                    backgroundColor: colors.accent.primary,
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                  }}
                >
                  <Typography variant="emphasis-sm" style={{ fontSize: 15, color: colors.text.onAccent }}>+ Add Goal</Typography>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {project.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={{ marginBottom: 28 }}>
            <Typography variant="section-header" style={{ marginBottom: 16 }}>
              Settings
            </Typography>

            <View
              style={{
                backgroundColor: colors.background.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border.warm,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <Pressable
                onPress={handleEditProjectPress}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.divider,
                }}
              >
                <Typography variant="nav-title" style={{ fontFamily: 'Inter-Regular', color: colors.text.primary }}>
                  Edit project name and description
                </Typography>
              </Pressable>

              {/* TODO: Manage members visibility requires space_id join — hidden until available */}

              <Pressable
                onPress={() => setIsDeleteModalVisible(true)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                }}
              >
                <Typography variant="nav-title" style={{ color: colors.feedback.danger.text }}>
                  Delete project
                </Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        onClose={closeEditModal}
        showCloseButton={false}
        closeDisabled={isSubmittingEdit}
        cancelText="Cancel"
        onCancel={closeEditModal}
        cancelDisabled={isSubmittingEdit}
        confirmText={isSubmittingEdit ? 'Saving…' : 'Save changes'}
        onConfirm={() => {
          void handleSaveProject();
        }}
        confirmDisabled={isSubmittingEdit}
      >
        <Typography variant="section-header" style={{ marginBottom: 10 }}>
          Edit project
        </Typography>
        <Typography variant="body" style={{ fontSize: 14, lineHeight: 21, marginBottom: 18 }}>
          Update the project name and long-term intent.
        </Typography>

        <View style={{ marginBottom: 14 }}>
          <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
            Project name
          </Typography>
          <TextInput
            style={inputStyle}
            value={editTitle}
            onChangeText={(value) => {
              setEditTitle(value);
              if (editError) setEditError(null);
            }}
            placeholder="e.g. Build financial independence"
            placeholderTextColor={colors.text.muted}
            editable={!isSubmittingEdit}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View>
          <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
            Long-term intent (optional)
          </Typography>
          <TextInput
            style={[inputStyle, { minHeight: 88, maxHeight: 132, textAlignVertical: 'top' }]}
            value={editDescription}
            onChangeText={(value) => {
              setEditDescription(value);
              if (editError) setEditError(null);
            }}
            placeholder="Describe what achieving this means to you..."
            placeholderTextColor={colors.text.muted}
            editable={!isSubmittingEdit}
            multiline
          />
        </View>

        {editError ? (
          <Typography variant="meta" style={{ marginTop: 12, lineHeight: 18, color: colors.feedback.danger.text }}>
            {editError}
          </Typography>
        ) : null}
      </Modal>

      <Modal
        visible={isDeleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalVisible(false);
          }
        }}
        showCloseButton={false}
        closeDisabled={isDeleting}
        cancelText="Cancel"
        onCancel={() => setIsDeleteModalVisible(false)}
        cancelDisabled={isDeleting}
        confirmText={isDeleting ? 'Deleting…' : 'Delete'}
        onConfirm={() => {
          void handleDeleteProject();
        }}
        confirmDisabled={isDeleting}
        confirmVariant="destructive"
      >
        <Typography variant="section-header" style={{ marginBottom: 10 }}>
          Delete project
        </Typography>
        <Typography variant="body" style={{ fontSize: 14, lineHeight: 21 }}>
          Are you sure you want to delete this project? This cannot be undone.
        </Typography>
      </Modal>
    </SafeAreaView>
  );
}
