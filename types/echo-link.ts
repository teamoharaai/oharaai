export type EchoLinkSource = 'manual' | 'ai_suggested' | 'ai_auto';

export interface EchoGoalLink {
  id: string;
  echoEntryId: string;
  goalId: string;
  linkSource: EchoLinkSource;
  confidence: number | null;
  confirmed: boolean;
  createdAt: string;
}
