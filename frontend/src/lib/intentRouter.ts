export interface Intent {
  tools: string[];
  urgency: 'normal' | 'attention' | 'urgent';
  toolArgs: Record<string, any>;
}

interface Keyword {
  words: string[];
  tools: string[];
  urgency?: 'attention' | 'urgent';
  args?: Record<string, any>;
}

const keywordMap: Keyword[] = [
  { words: ['sleep', 'rest', 'nap', 'tired', 'insomnia', 'drowsy'], tools: ['getSleepHistory'] },
  { words: ['heart rate', 'heart', 'pulse', 'bpm', 'heartbeat', 'cardiac'], tools: ['getHeartRateHistory'] },
  { words: ['blood pressure', 'bp', 'hypertension', 'hypotension', 'systolic', 'diastolic'], tools: ['getBloodPressureHistory'] },
  { words: ['spo2', 'oxygen', 'saturation', 'blood oxygen'], tools: ['getSpO2History'] },
  { words: ['temperature', 'fever', 'celsius'], tools: ['getTemperatureHistory'] },
  { words: ['glucose', 'blood sugar', 'diabetes', 'sugar level'], tools: ['getBloodGlucoseHistory'] },
  { words: ['weight', 'bmi', 'pounds', 'kilograms', 'obesity', 'overweight'], tools: ['getWeightHistory'] },
  { words: ['step', 'walk', 'walking', 'running', 'distance', 'activity', 'exercise', 'workout', 'calories burned'], tools: ['getActivityHistory'] },
  { words: ['hydrat', 'water', 'dehydrat', 'fluid', 'drink'], tools: ['getHydrationHistory'] },
  { words: ['nutrition', 'food', 'meal', 'calories', 'protein', 'carbs', 'fat', 'diet', 'eating'], tools: ['getNutritionHistory'] },
  { words: ['medication', 'medicine', 'pill', 'dose', 'prescription', 'drug'], tools: ['getMedicationSchedule'] },
  { words: ['goal', 'target', 'objective'], tools: ['getGoals'] },
  { words: ['profile', 'about me', 'my info', 'my information', 'my details'], tools: ['getUserProfile'] },
  {
    words: ['summary', 'overview', 'how am i', 'health today', 'overall health', 'how is my health', 'general health'],
    tools: ['createHealthSummary'],
  },
  {
    words: ['explain', 'what is', 'what are', 'tell me about', 'educational', 'information about', 'knowledge', 'learn about'],
    tools: ['searchHealthKnowledge'],
    args: {},
  },
  {
    words: ['chest pain', 'severe pain', 'cant breathe', 'cannot breathe', 'shortness of breath', 'emergency', 'fainting', 'unconscious', 'severe bleeding', 'stroke', 'heart attack'],
    tools: [],
    urgency: 'urgent',
  },
  {
    words: ['dont feel well', 'not feeling well', 'feeling sick', 'dizzy', 'nausea', 'weak', 'concerned', 'worried about', 'scared', 'anxious', 'depressed', 'sad'],
    tools: ['getRecentHealthData'],
    urgency: 'attention',
  },
];

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  const matchedTools = new Set<string>();
  let urgency: 'normal' | 'attention' | 'urgent' = 'normal';
  const toolArgs: Record<string, any> = {};

  for (const entry of keywordMap) {
    const matched = entry.words.some(w => lower.includes(w));
    if (matched) {
      if (entry.urgency === 'urgent') urgency = 'urgent';
      else if (entry.urgency === 'attention' && urgency !== 'urgent') urgency = 'attention';

      entry.tools.forEach(t => matchedTools.add(t));

      if (entry.tools.includes('searchHealthKnowledge') && matched) {
        toolArgs.query = message;
      }
    }
  }

  const dayMatch = lower.match(/(\d+)\s*day/);
  if (dayMatch) {
    toolArgs.days = parseInt(dayMatch[1]);
  }

  if (lower.includes('this week')) toolArgs.days = 7;
  if (lower.includes('this month')) toolArgs.days = 30;
  if (lower.includes('last week')) toolArgs.days = 14;

  if (lower.includes('compare') && lower.includes('last')) {
    matchedTools.add('getRecentHealthData');
  }

  if (urgency === 'urgent') {
    return { tools: [], urgency, toolArgs };
  }

  if (matchedTools.size === 0 && (lower.includes('health') || lower.includes('how') || lower.includes('what') || lower.includes('my'))) {
    matchedTools.add('getRecentHealthData');
  }

  if (matchedTools.size === 0) {
    matchedTools.add('searchHealthKnowledge');
    toolArgs.query = message;
  }

  return { tools: Array.from(matchedTools), urgency, toolArgs };
}
