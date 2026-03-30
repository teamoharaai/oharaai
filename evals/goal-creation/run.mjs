import fs from 'node:fs/promises';
import path from 'node:path';

const VALID_CATEGORIES = ['body', 'mind', 'money', 'create', 'connect', 'contribute'];
const VALID_TYPES = ['counter', 'habit', 'checklist'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'];
const DEFAULT_BEHAVIOR_EXPECTATIONS = {
  shouldFinalize: true,
  shouldOfferScopeReduction: false,
  shouldSplitGoal: false,
  shouldAcknowledgeEmotion: false,
  shouldPreserveAmbition: false,
};
const SCOPE_REDUCTION_PATTERNS = [
  { label: 'start-smaller', pattern: /\bstart (smaller|with|by)\b/i },
  { label: 'focus-first', pattern: /\bfocus on\b.*\bfirst\b/i },
  { label: 'narrow-scope', pattern: /\b(narrow|reduce|shrink|trim) (the )?scope\b/i },
  { label: 'phase-one', pattern: /\bphase (1|one)\b/i },
  { label: 'for-now', pattern: /\bfor now\b/i },
  { label: 'smaller-version', pattern: /\bsmaller|simpler|more realistic\b/i },
  { label: 'foundation-goal', pattern: /\bfoundation|baseline|prep|prepare\b/i },
  { label: 'first-milestone', pattern: /\bfirst milestone|first version|first step\b/i },
];
const SPLIT_GOAL_PATTERNS = [
  { label: 'one-goal', pattern: /\bone goal\b/i },
  { label: 'pick-one', pattern: /\bpick (one|a primary)\b/i },
  { label: 'separate-later', pattern: /\bseparate (goal|track)|save .* for later|park .* for later\b/i },
  { label: 'focus-one-area', pattern: /\bfocus on\b.*\b(first|for now)\b/i },
  { label: 'split-goals', pattern: /\bsplit\b.*\bgoals?\b/i },
];
const EMOTIONAL_ACKNOWLEDGMENT_PATTERNS = [
  { label: 'sounds-hard', pattern: /\b(that|this|it) sounds\b.*\b(hard|heavy|overwhelming|exhausting|frustrating|painful|lonely)\b/i },
  { label: 'makes-sense', pattern: /\bit makes sense\b/i },
  { label: 'can-see-why', pattern: /\bi can see why\b|\bI can see how\b/i },
  { label: 'stuck-validation', pattern: /\bfeeling stuck\b|\bstuck\b.*\bmakes sense\b/i },
  { label: 'overwhelmed-validation', pattern: /\boverwhelm(ed|ing)\b/i },
  { label: 'burnout-validation', pattern: /\bburnt? out\b/i },
];
const AMBITION_PRESERVATION_PATTERNS = [
  { label: 'long-term-vision', pattern: /\blong[- ]term|someday|eventually\b/i },
  { label: 'keep-ambition', pattern: /\bkeep\b.*\b(bigger|larger|original)\b.*\b(goal|vision)\b/i },
  { label: 'toward-bigger-goal', pattern: /\btoward\b.*\b(goal|vision)\b/i },
  { label: 'still-counts', pattern: /\bstill\b.*\bcounts|still moves you\b/i },
  { label: 'bridge-goal', pattern: /\bbridge|stepping stone|foundation\b/i },
];
const PAYLOAD_SCOPE_REDUCTION_PATTERNS = [
  { label: 'foundation-payload', pattern: /\bfoundation|baseline|starter|prep|prepare\b/i },
  { label: 'consistency-payload', pattern: /\bconsisten|routine|sustainable\b/i },
  { label: 'first-step-payload', pattern: /\bfirst step|first milestone|phase 1\b/i },
];

function parseArgs(argv) {
  const args = {
    baseUrl: 'http://localhost:8081',
    fixture: null,
    maxTurns: 4,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--base-url' && next) {
      args.baseUrl = next.replace(/\/$/, '');
      index += 1;
      continue;
    }
    if (token === '--fixture' && next) {
      args.fixture = next;
      index += 1;
      continue;
    }
    if (token === '--max-turns' && next) {
      args.maxTurns = Number(next);
      index += 1;
      continue;
    }
    if (token === '--output' && next) {
      args.output = next;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Goal creation eval harness

Usage:
  node evals/goal-creation/run.mjs [options]

Options:
  --base-url <url>   API base URL (default: http://localhost:8081)
  --fixture <id>     Run a single fixture
  --max-turns <n>    Max assistant turns before forced finalization (default: 4)
  --output <path>    Write JSON results to a custom path
  --help             Show this message`);
}

async function loadFixtures() {
  const fixturePath = path.resolve('evals/goal-creation/fixtures/cases.json');
  const raw = await fs.readFile(fixturePath, 'utf8');
  return JSON.parse(raw);
}

async function postGoalCreate(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/goals/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function countQuestions(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('?') || /\?\s*$/.test(line))
    .length;
}

function isStructuredDraft(text) {
  const normalized = text.toLowerCase();
  const signals = [
    /draft title|goal title|title:/,
    /summary:|what this looks like|draft/,
    /why this matters|why it matters|why:/,
    /assumed timeline|timeframe:|target date|deadline:/,
    /first milestones?|milestones?|next steps?/,
    /assumptions?:/,
  ];
  return signals.filter((pattern) => pattern.test(normalized)).length >= 3;
}

function includesKeyword(text, keyword) {
  return text.toLowerCase().includes(String(keyword).toLowerCase());
}

function getBehaviorExpectations(expected = {}) {
  return {
    ...DEFAULT_BEHAVIOR_EXPECTATIONS,
    ...expected,
  };
}

function collectGoalText(goalData) {
  if (!goalData || typeof goalData !== 'object') return '';
  const smart = goalData.goal?.smart ? Object.values(goalData.goal.smart) : [];
  const measurables = Array.isArray(goalData.measurables)
    ? goalData.measurables.flatMap((item) => [item.title, item.targetUnit])
    : [];
  return [
    goalData.goal?.title,
    goalData.goal?.description,
    ...smart,
    ...measurables,
    goalData.reasoning,
    ...(goalData.assumptions ?? []),
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join('\n');
}

function detectPatterns(text, matchers) {
  const matches = [];
  for (const matcher of matchers) {
    if (matcher.pattern.test(text)) {
      matches.push(matcher.label);
    }
  }
  return matches;
}

function hasAnyMatch(matches) {
  return Array.isArray(matches) && matches.length > 0;
}

function keywordCoverage(text, keywords = []) {
  if (!keywords.length) return 0;
  return keywords.filter((keyword) => includesKeyword(text, keyword)).length / keywords.length;
}

function validateGoalData(goalData) {
  if (!goalData || typeof goalData !== 'object') {
    return { ok: false, errors: ['Missing goalData'] };
  }

  const errors = [];
  const { goal, measurables, reasoning, assumptions } = goalData;

  if (!goal || typeof goal !== 'object') {
    errors.push('goal must be an object');
  } else {
    if (!goal.title || typeof goal.title !== 'string') errors.push('goal.title missing');
    if (typeof goal.description !== 'string') errors.push('goal.description missing');
    if (!VALID_CATEGORIES.includes(goal.category)) errors.push('goal.category invalid');
    if (goal.deadline !== null && typeof goal.deadline !== 'string') errors.push('goal.deadline invalid');

    const smart = goal.smart;
    if (!smart || typeof smart !== 'object') {
      errors.push('goal.smart missing');
    } else {
      for (const key of ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']) {
        if (typeof smart[key] !== 'string' || smart[key].trim().length < 6) {
          errors.push(`goal.smart.${key} invalid`);
        }
      }
    }
  }

  if (!Array.isArray(measurables)) {
    errors.push('measurables must be an array');
  } else {
    for (const [index, item] of measurables.entries()) {
      if (!item || typeof item !== 'object') {
        errors.push(`measurable[${index}] invalid`);
        continue;
      }
      if (typeof item.title !== 'string' || item.title.trim().length === 0) {
        errors.push(`measurable[${index}].title invalid`);
      }
      if (!VALID_TYPES.includes(item.type)) {
        errors.push(`measurable[${index}].type invalid`);
      }
      if (!VALID_FREQUENCIES.includes(item.frequency)) {
        errors.push(`measurable[${index}].frequency invalid`);
      }
      if (item.targetValue !== null && typeof item.targetValue !== 'number') {
        errors.push(`measurable[${index}].targetValue invalid`);
      }
      if (item.targetUnit !== null && typeof item.targetUnit !== 'string') {
        errors.push(`measurable[${index}].targetUnit invalid`);
      }
      if (item.type === 'counter') {
        if (typeof item.targetValue !== 'number' || !Number.isFinite(item.targetValue)) {
          errors.push(`measurable[${index}].counter targetValue missing`);
        }
        if (typeof item.targetUnit !== 'string' || item.targetUnit.trim().length === 0) {
          errors.push(`measurable[${index}].counter targetUnit missing`);
        }
      }
      if (item.type === 'checklist') {
        if (item.targetValue !== null || item.targetUnit !== null) {
          errors.push(`measurable[${index}].checklist target fields invalid`);
        }
      }
    }
  }

  if (typeof reasoning !== 'string') {
    errors.push('reasoning missing');
  }
  if (assumptions !== undefined && (!Array.isArray(assumptions) || assumptions.some((item) => typeof item !== 'string'))) {
    errors.push('assumptions invalid');
  }

  return { ok: errors.length === 0, errors };
}

function scoreTimeToDraft(firstDraftTurn) {
  if (firstDraftTurn === 1) return 5;
  if (firstDraftTurn === 2) return 3;
  if (typeof firstDraftTurn === 'number') return 1;
  return 0;
}

function scoreClarificationQuestions(count, max) {
  if (count <= max) return 5;
  if (count === max + 1) return 3;
  return 1;
}

function scoreAssumptions(goalData, expected) {
  const source = [
    ...(goalData?.assumptions ?? []),
    goalData?.reasoning ?? '',
  ].join(' ').toLowerCase();

  const desired = expected.assumptionKeywords ?? [];
  const matches = desired.filter((keyword) => includesKeyword(source, keyword)).length;
  const forbidden = (expected.forbiddenAssumptionKeywords ?? []).filter((keyword) => includesKeyword(source, keyword)).length;

  if (!source.trim()) {
    return expected.shouldUseAssumptions ? 1 : 3;
  }
  if (forbidden > 0) return 1;
  if (desired.length === 0) return 4;

  const ratio = matches / desired.length;
  if (ratio >= 0.67) return 5;
  if (ratio >= 0.34) return 3;
  return 1;
}

function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function daysFromNow(date) {
  return Math.round((date.getTime() - Date.now()) / 86400000);
}

function scoreSmart(goalData, expected) {
  if (!goalData?.goal?.smart) return 0;
  const validation = validateGoalData(goalData);
  if (!validation.ok) return 1;

  let score = 3;
  const smart = goalData.goal.smart;
  const denseFields = Object.values(smart).filter((value) => String(value).trim().length >= 18).length;
  if (denseFields >= 4) score += 1;

  const deadlineKind = expected.deadline?.kind;
  if (deadlineKind === 'open') {
    if (goalData.goal.deadline === null && /no fixed deadline/i.test(smart.timeBound)) {
      score += 1;
    }
  } else if (deadlineKind === 'bounded') {
    if (typeof goalData.goal.deadline === 'string') {
      score += 1;
    }
  }

  return Math.min(score, 5);
}

function scoreRealism(goalData, expected) {
  if (!goalData?.goal) return 0;

  let score = 5;
  const deadlineExpectation = expected.deadline;
  const deadline = parseDateOnly(goalData.goal.deadline);

  if (deadlineExpectation?.kind === 'open') {
    if (goalData.goal.deadline !== null) score -= 2;
  }

  if (deadlineExpectation?.kind === 'bounded') {
    if (!deadline) {
      score -= 2;
    } else {
      const delta = daysFromNow(deadline);
      if (delta < 1) score -= 3;
      if (typeof deadlineExpectation.maxDaysFromNow === 'number' && delta > deadlineExpectation.maxDaysFromNow) {
        score -= 2;
      }
    }
  }

  const maxTarget = expected.realism?.maxCounterTargetValue;
  for (const measurable of goalData.measurables ?? []) {
    if (measurable.type === 'counter' && typeof measurable.targetValue === 'number') {
      if (measurable.targetValue <= 0) score -= 2;
      if (typeof maxTarget === 'number' && measurable.targetValue > maxTarget) score -= 2;
    }
  }

  const measurableCount = goalData.measurables?.length ?? 0;
  if (measurableCount < (expected.measurables?.min ?? 1)) score -= 2;
  if (measurableCount > (expected.measurables?.max ?? 4)) score -= 1;

  const checklistCount = (goalData.measurables ?? []).filter((item) => item.type === 'checklist').length;
  if (measurableCount > 0 && checklistCount === measurableCount) score -= 1;

  return Math.max(0, Math.min(score, 5));
}

function analyzeBehaviorHeuristics(caseDef, assistantMessages, goalData, finalResponse, assistantTurns, followUpsConsumed) {
  const expectations = getBehaviorExpectations(caseDef.expected);
  const messageText = assistantMessages.join('\n');
  const firstAssistantMessage = assistantMessages[0] ?? '';
  const payloadText = collectGoalText(goalData);

  const scopeMessageMatches = detectPatterns(messageText, SCOPE_REDUCTION_PATTERNS);
  const scopePayloadMatches = detectPatterns(payloadText, PAYLOAD_SCOPE_REDUCTION_PATTERNS);
  const splitMatches = detectPatterns(messageText, SPLIT_GOAL_PATTERNS);
  const emotionFirstTurnMatches = detectPatterns(firstAssistantMessage, EMOTIONAL_ACKNOWLEDGMENT_PATTERNS);
  const emotionAnyTurnMatches = detectPatterns(messageText, EMOTIONAL_ACKNOWLEDGMENT_PATTERNS);
  const ambitionMatches = detectPatterns(`${messageText}\n${payloadText}`, AMBITION_PRESERVATION_PATTERNS);
  const payloadKeywordCoverage = keywordCoverage(payloadText.toLowerCase(), caseDef.expected.assumptionKeywords ?? []);

  return {
    shouldFinalize: {
      expected: expectations.shouldFinalize,
      finalizedBy: finalResponse.finalizedBy ?? 'user',
      assistantFinalized: finalResponse.finalizedBy === 'assistant',
      falseFinalization: detectFalseFinalization(
        caseDef,
        finalResponse.finalizedBy,
        assistantTurns,
        followUpsConsumed,
      ),
    },
    scopeReduction: {
      expected: expectations.shouldOfferScopeReduction,
      detected: hasAnyMatch(scopeMessageMatches) || hasAnyMatch(scopePayloadMatches),
      messageDetected: hasAnyMatch(scopeMessageMatches),
      payloadDetected: hasAnyMatch(scopePayloadMatches),
      matchedPatterns: [...scopeMessageMatches, ...scopePayloadMatches],
      preserveAmbitionExpected: expectations.shouldPreserveAmbition,
      preserveAmbitionDetected: hasAnyMatch(ambitionMatches),
      ambitionPatterns: ambitionMatches,
      payloadKeywordCoverage,
    },
    multiGoalSplitting: {
      expected: expectations.shouldSplitGoal,
      detected: hasAnyMatch(splitMatches),
      matchedPatterns: splitMatches,
      payloadKeywordCoverage,
    },
    emotionalAcknowledgment: {
      expected: expectations.shouldAcknowledgeEmotion,
      firstTurnDetected: hasAnyMatch(emotionFirstTurnMatches),
      anyTurnDetected: hasAnyMatch(emotionAnyTurnMatches),
      matchedPatterns: emotionAnyTurnMatches,
    },
  };
}

function scoreShouldFinalizeCorrectness(flags) {
  if (!flags.expected) {
    return flags.assistantFinalized ? 1 : 5;
  }
  if (flags.assistantFinalized && !flags.falseFinalization) return 5;
  if (!flags.assistantFinalized) return 3;
  return 1;
}

function scoreScopeReduction(flags) {
  if (!flags.expected) {
    return flags.detected ? 3 : 5;
  }

  if (!flags.detected) {
    return flags.payloadKeywordCoverage >= 0.34 ? 3 : 1;
  }

  if (flags.preserveAmbitionExpected) {
    if (flags.preserveAmbitionDetected) return 5;
    return 3;
  }

  return flags.messageDetected ? 5 : 4;
}

function scoreMultiGoalSplitting(flags) {
  if (!flags.expected) {
    return flags.detected ? 3 : 5;
  }
  if (flags.detected) return 5;
  if (flags.payloadKeywordCoverage >= 0.34) return 3;
  return 1;
}

function scoreEmotionalAcknowledgment(flags) {
  if (!flags.expected) {
    return flags.anyTurnDetected ? 4 : 5;
  }
  if (flags.firstTurnDetected) return 5;
  if (flags.anyTurnDetected) return 3;
  return 1;
}

function evaluateSavePreflight(goalData) {
  const schema = validateGoalData(goalData);
  if (!schema.ok) {
    return { status: 'failure', mode: 'preflight', errors: schema.errors };
  }

  if (!goalData.goal.title?.trim()) {
    return { status: 'failure', mode: 'preflight', errors: ['AI goal payload is missing a title'] };
  }
  if (!goalData.goal.category?.trim()) {
    return { status: 'failure', mode: 'preflight', errors: ['AI goal payload is missing a category'] };
  }

  return { status: 'success', mode: 'preflight', errors: [] };
}

function detectFalseFinalization(caseDef, finalizedBy, assistantTurns, followUpsConsumed) {
  if (finalizedBy !== 'assistant') return false;
  const { expected } = caseDef;
  if (assistantTurns < (expected.minAssistantTurnsBeforeAutoFinalize ?? 1)) return true;
  if (followUpsConsumed < (expected.requiredFollowUpsBeforeAutoFinalize ?? 0)) return true;
  return false;
}

async function runCase(caseDef, args) {
  const startedAt = Date.now();
  const history = [];
  const assistantMessages = [];
  let assistantTurns = 0;
  let questionCount = 0;
  let firstStructuredDraftMs = null;
  let firstStructuredDraftTurn = null;
  let followUpsConsumed = 0;
  let currentUserMessage = caseDef.initialInput;
  let finalResponse = null;
  let lastAssistantMessage = null;

  while (assistantTurns < args.maxTurns) {
    const result = await postGoalCreate(args.baseUrl, {
      userMessage: currentUserMessage,
      conversationHistory: history,
    });

    if (!result.ok) {
      return {
        id: caseDef.id,
        title: caseDef.title,
        status: 'request_failed',
        error: result.data?.error ?? `HTTP ${result.status}`,
        detail: result.data,
      };
    }

    history.push({ role: 'user', content: currentUserMessage });

    if (result.data.isComplete) {
      finalResponse = result.data;
      break;
    }

    const assistantMessage = String(result.data.message ?? '');
    lastAssistantMessage = assistantMessage;
    assistantMessages.push(assistantMessage);
    assistantTurns += 1;
    questionCount += countQuestions(assistantMessage);
    if (firstStructuredDraftMs === null && isStructuredDraft(assistantMessage)) {
      firstStructuredDraftMs = Date.now() - startedAt;
      firstStructuredDraftTurn = assistantTurns;
    }

    history.push({ role: 'assistant', content: assistantMessage });

    if (followUpsConsumed < caseDef.followUps.length) {
      currentUserMessage = caseDef.followUps[followUpsConsumed];
      followUpsConsumed += 1;
      continue;
    }

    break;
  }

  if (!finalResponse) {
    const finalizeResult = await postGoalCreate(args.baseUrl, {
      conversationHistory: history,
      finalize: true,
    });

    if (!finalizeResult.ok) {
      return {
        id: caseDef.id,
        title: caseDef.title,
        status: 'finalize_failed',
        error: finalizeResult.data?.error ?? `HTTP ${finalizeResult.status}`,
        detail: finalizeResult.data,
        assistantTurns,
        followUpsConsumed,
        questionCount,
        firstStructuredDraftMs,
      };
    }

    finalResponse = finalizeResult.data;
  }

  const goalData = finalResponse.goalData ?? null;
  const savePreflight = evaluateSavePreflight(goalData);
  const falseFinalization = detectFalseFinalization(caseDef, finalResponse.finalizedBy, assistantTurns, followUpsConsumed);
  const heuristicFlags = analyzeBehaviorHeuristics(
    caseDef,
    assistantMessages,
    goalData,
    finalResponse,
    assistantTurns,
    followUpsConsumed,
  );

  const metricScores = {
    timeToFirstStructuredDraft: scoreTimeToDraft(firstStructuredDraftTurn),
    clarificationQuestions: scoreClarificationQuestions(
      questionCount,
      caseDef.expected.maxClarificationQuestions ?? 2,
    ),
    assumptionQuality: scoreAssumptions(goalData, caseDef.expected),
    smartStructureQuality: scoreSmart(goalData, caseDef.expected),
    realismQuality: scoreRealism(goalData, caseDef.expected),
    shouldFinalizeCorrectness: scoreShouldFinalizeCorrectness(heuristicFlags.shouldFinalize),
    scopeReductionDetection: scoreScopeReduction(heuristicFlags.scopeReduction),
    multiGoalSplittingDetection: scoreMultiGoalSplitting(heuristicFlags.multiGoalSplitting),
    emotionalAcknowledgmentSignal: scoreEmotionalAcknowledgment(heuristicFlags.emotionalAcknowledgment),
  };

  return {
    id: caseDef.id,
    title: caseDef.title,
    status: 'completed',
    finalizedBy: finalResponse.finalizedBy ?? 'user',
    assistantTurns,
    followUpsConsumed,
    firstStructuredDraftMs,
    firstStructuredDraftTurn,
    questionCount,
    falseFinalization,
    savePreflight,
    metricScores,
    heuristicFlags,
    expectations: caseDef.expected,
    finalGoal: goalData,
    lastAssistantMessage,
    assistantMessages,
  };
}

function summarizeResults(results) {
  const completed = results.filter((item) => item.status === 'completed');
  const failed = results.filter((item) => item.status !== 'completed');
  const avg = (key) => {
    if (completed.length === 0) return null;
    return Number(
      (
        completed.reduce((sum, item) => sum + (item.metricScores[key] ?? 0), 0) / completed.length
      ).toFixed(2),
    );
  };
  const rate = (items, predicate) => {
    if (items.length === 0) return null;
    return Number((items.filter(predicate).length / items.length).toFixed(2));
  };
  const targetedRate = (selector, predicate) => {
    const targeted = completed.filter(selector);
    return rate(targeted, predicate);
  };

  return {
    totalCases: results.length,
    completedCases: completed.length,
    failedCases: failed.length,
    falseFinalizationRate: completed.length === 0
      ? null
      : Number((completed.filter((item) => item.falseFinalization).length / completed.length).toFixed(2)),
    saveSuccessRate: completed.length === 0
      ? null
      : Number((completed.filter((item) => item.savePreflight.status === 'success').length / completed.length).toFixed(2)),
    averageScores: {
      timeToFirstStructuredDraft: avg('timeToFirstStructuredDraft'),
      clarificationQuestions: avg('clarificationQuestions'),
      assumptionQuality: avg('assumptionQuality'),
      smartStructureQuality: avg('smartStructureQuality'),
      realismQuality: avg('realismQuality'),
      shouldFinalizeCorrectness: avg('shouldFinalizeCorrectness'),
      scopeReductionDetection: avg('scopeReductionDetection'),
      multiGoalSplittingDetection: avg('multiGoalSplittingDetection'),
      emotionalAcknowledgmentSignal: avg('emotionalAcknowledgmentSignal'),
    },
    behaviorRates: {
      shouldFinalizeCorrectRate: rate(
        completed,
        (item) => (item.metricScores.shouldFinalizeCorrectness ?? 0) >= 4,
      ),
      scopeReductionHitRate: targetedRate(
        (item) => item.heuristicFlags.scopeReduction.expected,
        (item) => item.heuristicFlags.scopeReduction.detected,
      ),
      multiGoalSplittingHitRate: targetedRate(
        (item) => item.heuristicFlags.multiGoalSplitting.expected,
        (item) => item.heuristicFlags.multiGoalSplitting.detected,
      ),
      emotionalAcknowledgmentHitRate: targetedRate(
        (item) => item.heuristicFlags.emotionalAcknowledgment.expected,
        (item) => item.heuristicFlags.emotionalAcknowledgment.anyTurnDetected,
      ),
      ambitionPreservationHitRate: targetedRate(
        (item) => item.heuristicFlags.scopeReduction.preserveAmbitionExpected,
        (item) => item.heuristicFlags.scopeReduction.preserveAmbitionDetected,
      ),
    },
  };
}

async function writeResults(outputPath, payload) {
  const resolved = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(payload, null, 2));
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtures = await loadFixtures();
  const selected = args.fixture
    ? fixtures.filter((item) => item.id === args.fixture)
    : fixtures;

  if (selected.length === 0) {
    throw new Error(`No fixture matched "${args.fixture}"`);
  }

  console.log(`Running ${selected.length} goal-creation eval case(s) against ${args.baseUrl}`);
  const results = [];

  for (const fixture of selected) {
    console.log(`- ${fixture.id}`);
    const result = await runCase(fixture, args);
    results.push(result);
    if (result.status !== 'completed') {
      console.log(`  failed: ${result.error}`);
      continue;
    }
    console.log(
      `  finalizedBy=${result.finalizedBy} draftTurn=${result.firstStructuredDraftTurn ?? 'none'} ` +
      `questions=${result.questionCount} falseFinalize=${result.falseFinalization} ` +
      `scope=${result.heuristicFlags.scopeReduction.detected} split=${result.heuristicFlags.multiGoalSplitting.detected} ` +
      `emotion=${result.heuristicFlags.emotionalAcknowledgment.anyTurnDetected} save=${result.savePreflight.status}`,
    );
  }

  const summary = summarizeResults(results);
  const payload = {
    generatedAt: new Date().toISOString(),
    args,
    summary,
    results,
  };

  const defaultOutput = path.join(
    'evals',
    'goal-creation',
    'results',
    `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  const outputPath = await writeResults(args.output ?? defaultOutput, payload);

  console.log('\nSummary');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote results to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
