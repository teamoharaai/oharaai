import { View, ScrollView, Pressable, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { deleteProject, fetchProjectWithGoals, updateProject } from '@/features/projects/services/project-service';
import { GoalCard } from '@/features/goals/components/GoalCard';
import type { ProjectWithGoals, ProjectStatus } from '@/features/projects/types';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3D5247" />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
        <View style={{ padding: 20 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Typography variant="nav-back">← Back</Typography>
          </Pressable>
          <Typography variant="body" style={{ fontSize: 17 }}>Project not found.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  const aggregateProgress = project.goals.length > 0
    ? Math.round(project.goals.reduce((sum, goal) => sum + goal.progress, 0) / project.goals.length)
    : 0;
  const statusLabel = project.status === 'active'
    ? 'Active'
    : project.status === 'complete'
      ? 'Complete'
      : 'Archived';
  const statusVariant = getProjectStatusBadgeVariant(project.status);

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE7E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1F1C',
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
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
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#3D5247',
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Typography
              variant="heading"
              style={{ fontFamily: 'Inter-Bold', color: '#1A1A1A', lineHeight: 30 }}
            >
              {project.title}
            </Typography>

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

            <Typography
              variant="caption"
              style={{ fontFamily: 'Inter-Italic', fontStyle: 'italic', color: '#9CA3AF', marginTop: 16, marginBottom: 10 }}
            >
              Long-term ambition
            </Typography>

            <View style={{ width: '100%', height: 8, borderRadius: 999, backgroundColor: '#E7E2D8', overflow: 'hidden' }}>
              <View
                style={{
                  width: `${aggregateProgress}%`,
                  height: '100%',
                  backgroundColor: '#3D5247',
                  borderRadius: 999,
                }}
              />
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
                  backgroundColor: '#3D5247',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="emphasis-sm" style={{ color: '#F5F1EA' }}>+ Add Goal</Typography>
              </Pressable>
            </View>

            {project.goals.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
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
                    backgroundColor: '#3D5247',
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                  }}
                >
                  <Typography variant="emphasis-sm" style={{ fontSize: 15, color: '#E8EDE9' }}>+ Add Goal</Typography>
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

          {/* Project Vault */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <Typography variant="section-header">
                Project Vault
              </Typography>
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: '#3D5247',
                  borderRadius: 12,
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="meta" style={{ fontSize: 20, lineHeight: 22, color: '#F5F1EA' }}>+</Typography>
              </Pressable>
            </View>

            {/* TODO: Project-level vault support requires a schema change — add nullable project_id
            // column to the vaults table (goal_id would remain nullable for goal-bound vaults).
            // Until that migration ships, this section is a placeholder only. */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 22,
                borderWidth: 1,
                borderColor: '#E7E2D8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <Typography variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
                Add project-level notes and resources
              </Typography>
            </View>
          </View>

          {/* Activity */}
          <View style={{ marginBottom: 28 }}>
            <Typography variant="section-header" style={{ marginBottom: 16 }}>
              Activity
            </Typography>

            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 22,
                borderWidth: 1,
                borderColor: '#E7E2D8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <Typography variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
                Activity will appear as you and your team make progress
              </Typography>
            </View>
          </View>

          {/* Settings */}
          <View style={{ marginBottom: 28 }}>
            <Typography variant="section-header" style={{ marginBottom: 16 }}>
              Settings
            </Typography>

            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E7E2D8',
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
                  borderBottomColor: '#EFE9DE',
                }}
              >
                <Typography variant="nav-title" style={{ fontFamily: 'Inter-Regular', color: '#1A1A1A' }}>
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
                <Typography variant="nav-title" style={{ color: '#DC2626' }}>
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
            placeholderTextColor="#9CAF9F"
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
            placeholderTextColor="#9CAF9F"
            editable={!isSubmittingEdit}
            multiline
          />
        </View>

        {editError ? (
          <Typography variant="meta" style={{ marginTop: 12, lineHeight: 18, color: '#DC2626' }}>
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
