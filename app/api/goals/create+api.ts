import { callLLM } from '@/lib/ai/client';
import {
  GOAL_CREATION_SYSTEM_PROMPT,
  GOAL_CREATION_FINALIZE_PROMPT,
} from '@/lib/ai/prompts/goal-creation';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

interface RequestBody {
  userMessage: string;
  conversationHistory?: ConversationMessage[];
  userId: string;
}

interface SmartData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

interface AiMeasurable {
  title: string;
  type: 'counter' | 'habit' | 'checklist';
  targetValue: number | null;
  targetUnit: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
}

export interface GoalData {
  goal: {
    title: string;
    description: string;
    category: string;
    deadline: string | null;
    smart: SmartData;
  };
  measurables: AiMeasurable[];
  reasoning: string;
}

interface CreateResponse {
  message: string;
  isComplete: boolean;
  goalData?: GoalData;
}

const FINALIZE_SIGNAL = /i think i have what i need/i;

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userMessage, conversationHistory = [] } = body;

  if (!userMessage?.trim()) {
    return Response.json({ error: 'userMessage is required' }, { status: 400 });
  }

  const history: ConversationMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let aiMessage: string;
  try {
    const result = await callLLM({
      pipeline: 'goalCreation',
      systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
      messages: history,
    });
    aiMessage = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI call failed';
    return Response.json({ error: message }, { status: 500 });
  }

  if (!FINALIZE_SIGNAL.test(aiMessage)) {
    const response: CreateResponse = { message: aiMessage, isComplete: false };
    return Response.json(response);
  }

  // Finalization: build conversation transcript and call finalize prompt
  const transcript = [
    ...history,
    { role: 'assistant' as const, content: aiMessage },
  ]
    .map((m) => `${m.role === 'user' ? 'User' : 'Guide'}: ${m.content}`)
    .join('\n\n');

  let goalData: GoalData;
  try {
    const finalResult = await callLLM({
      pipeline: 'goalCreation',
      systemPrompt: GOAL_CREATION_FINALIZE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the conversation:\n\n${transcript}\n\nProduce the goal JSON now.`,
        },
      ],
    });

    goalData = JSON.parse(finalResult.text) as GoalData;
  } catch (err) {
    // Finalization failed — return the conversational message without goalData
    console.error('Goal finalization failed:', err);
    const response: CreateResponse = { message: aiMessage, isComplete: false };
    return Response.json(response);
  }

  const response: CreateResponse = { message: aiMessage, isComplete: true, goalData };
  return Response.json(response);
}
