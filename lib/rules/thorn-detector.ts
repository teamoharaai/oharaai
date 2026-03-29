export interface ThornPattern {
  theme: string;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
}

export async function detectThornPatterns(_userId: string): Promise<ThornPattern[]> {
  // TODO: implement thorn pattern detection
  return [];
}
