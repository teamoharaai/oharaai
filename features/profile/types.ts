export interface CharacterProfile {
  id: string;
  userId: string;
  interests: string[];
  strengths: string[];
  challenges: string[];
  patterns: ThornPattern[];
  lastUpdated: Date;
}

export interface ThornPattern {
  theme: string;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  relatedGoalIds: string[];
}
