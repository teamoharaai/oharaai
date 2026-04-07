export type SpaceType = 'personal' | 'team' | 'institutional' | 'community';

export type SpaceRole =
  | 'owner'
  | 'member'
  | 'admin'
  | 'instructor'
  | 'student'
  | 'organizer'
  | 'sponsor'
  | 'volunteer';

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  ownerId: string;
  config: {
    llmTier?: 'haiku' | 'sonnet' | 'opus';
    featuresEnabled?: string[];
    branding?: { accentColor?: string; logoUrl?: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceRole;
  status: 'active' | 'archived' | 'invited';
  joinedAt: string;
}
