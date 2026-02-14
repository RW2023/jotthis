export type AnalysisType =
  | 'summary'
  | 'actionItems'
  | 'research'
  | 'contentIdeas'
  | 'questions'
  | 'roadblocks'
  | 'socialMedia'
  | 'all';

export interface NormalizedAnalysisResponse {
  summary?: string;
  actionItems?: string[];
  research?: string[];
  contentIdeas?: string[];
  questions?: string[];
  roadblocks?: string[];
  socialMedia?: string[];
  tags?: string[];
}

const ANALYSIS_TYPES: AnalysisType[] = [
  'summary',
  'actionItems',
  'research',
  'contentIdeas',
  'questions',
  'roadblocks',
  'socialMedia',
  'all',
];

export const isAnalysisType = (value: unknown): value is AnalysisType =>
  typeof value === 'string' && ANALYSIS_TYPES.includes(value as AnalysisType);

const ARRAY_FIELD_ALIASES: Record<Exclude<AnalysisType, 'summary' | 'all'>, string[]> = {
  actionItems: ['actionItems', 'actions', 'tasks', 'items'],
  research: ['research', 'researchPointers', 'insights', 'items'],
  contentIdeas: ['contentIdeas', 'ideas', 'insights', 'items'],
  questions: ['questions', 'questionsToAnswer', 'openQuestions', 'items'],
  roadblocks: ['roadblocks', 'risks', 'potentialRoadblocks', 'blockers', 'items'],
  socialMedia: ['socialMedia', 'socialHooks', 'hooks', 'insights', 'items'],
};

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const pickArrayByAliases = (payload: Record<string, unknown>, aliases: string[]): string[] => {
  for (const key of aliases) {
    const values = coerceStringArray(payload[key]);
    if (values.length > 0) {
      return values;
    }
  }

  return [];
};

export const normalizeAnalysisResponse = (
  type: AnalysisType,
  payload: Record<string, unknown>
): NormalizedAnalysisResponse => {
  if (type === 'summary') {
    return {
      summary: typeof payload.summary === 'string' ? payload.summary.trim() : '',
    };
  }

  if (type === 'all') {
    return {
      summary: typeof payload.summary === 'string' ? payload.summary.trim() : '',
      actionItems: pickArrayByAliases(payload, ARRAY_FIELD_ALIASES.actionItems),
      tags: coerceStringArray(payload.tags),
    };
  }

  const values = pickArrayByAliases(payload, ARRAY_FIELD_ALIASES[type]);
  return { [type]: values };
};
