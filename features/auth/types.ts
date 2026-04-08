export interface Profile {
  id: string;
  display_name: string;
  character_profile: Record<string, unknown>;
  interests: unknown[];
  context: Record<string, unknown>;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
