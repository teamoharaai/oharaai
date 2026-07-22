import type { GoalCategory } from '@/lib/goals/schema';

export type AgentSessionStatus = 'active' | 'draft' | 'published' | 'failed';

export type SessionEventType =
  | 'change'
  | 'database_record'
  | 'verification'
  | 'failure'
  | 'note';

export type SessionDatabaseRecord = {
  table: string;
  id: string;
  operation: 'created' | 'updated' | 'deleted';
};
export type SessionVerificationResult = {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  details?: string;
};

export type SessionSummaryDraft = {
  changedFiles: string[];
  databaseRecords: SessionDatabaseRecord[];
  verificationResults: SessionVerificationResult[];
  unresolvedFailures: string[];
  reflection: string;
};

export type StartSessionInput = {
  externalSessionId: string;
  projectId?: string | null;
  projectTitle: string;
  projectDescription?: string | null;
  periodKey: string;
  startDate: string;
  endDate: string;
  goalTitle: string;
  goalDescription?: string | null;
  goalCategory?: GoalCategory;
};

export type StartSessionResult = {
  sessionId: string;
  projectId: string;
  goalId: string;
  created: boolean;
};

export type FinishSessionResult = {
  status: AgentSessionStatus;
  finalEntryId: string | null;
  requiresApproval: boolean;
};
