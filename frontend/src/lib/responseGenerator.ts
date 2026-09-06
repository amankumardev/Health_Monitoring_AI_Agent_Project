import { ToolResult } from './tools';
import { StatsSummary } from './analytics';
import { KnowledgeDocument } from '@/types';

function formatTrend(direction: string): string {
  if (direction === 'increasing') return 'trending upward';
  if (direction === 'decreasing') return 'trending downward';
  return 'relatively stable';
}

function formatList(items: string[]): string {
  if (items.length === 0) return 'No data available.';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function generateHeartRateResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any heart rate data for you yet. Start logging your heart rate readings to get insights.";

  const lines: string[] = [];
  lines.push(`Here's your heart rate summary:`);
  lines.push(`• **Average:** ${stats.average.toFixed(0)} bpm`);
  lines.push(`• **Range:** ${stats.min}-${stats.max} bpm`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);

  if (stats.average > 100) {
    lines.push(`Your average resting heart rate is above the typical range of 60-100 bpm. This could be related to stress, caffeine, or other factors. If this persists, consider discussing it with your healthcare provider.`);
  } else if (stats.average < 60) {
    lines.push(`Your average resting heart rate is below 60 bpm. This can be normal for very fit individuals, but if you're not an athlete and experience dizziness or fatigue, please consult your healthcare provider.`);
  } else {
    lines.push(`Your average heart rate is within the normal resting range of 60-100 bpm, which is a good sign.`);
  }

  if (stats.anomalies.length > 0) {
    lines.push(`I noticed ${stats.anomalies.length} unusual reading(s) that differ significantly from your average. You may want to check if there were specific circumstances around those times.`);
  }

  return lines.join('\n');
}

function generateBloodPressureResponse(result: ToolResult): string {
  const sys = result.data.systolic as StatsSummary;
  const dia = result.data.diastolic as StatsSummary;
  if (sys.count === 0) return "I don't have any blood pressure data for you yet. Start logging your blood pressure readings to get insights.";

  const lines: string[] = [];
  lines.push(`Here's your blood pressure summary:`);
  lines.push(`• **Average:** ${sys.average.toFixed(0)}/${dia.average.toFixed(0)} mmHg`);
  lines.push(`• **Systolic range:** ${sys.min}-${sys.max} mmHg`);
  lines.push(`• **Diastolic range:** ${dia.min}-${dia.max} mmHg`);
  lines.push(`• **Trend:** ${formatTrend(sys.trend.direction)}`);

  if (sys.average >= 130 || dia.average >= 80) {
    lines.push(`Your average blood pressure is in the elevated or hypertensive range. Lifestyle modifications like reducing sodium, regular exercise, and stress management can help. If readings remain consistently high, please consult your healthcare provider.`);
  } else {
    lines.push(`Your average blood pressure is within a healthy range. Keep up the good work with your health habits!`);
  }

  return lines.join('\n');
}

function generateSleepResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any sleep data for you yet. Start logging your sleep to get insights about your rest patterns.";

  const lines: string[] = [];
  lines.push(`Here's your sleep summary:`);
  lines.push(`• **Average duration:** ${stats.average.toFixed(1)} hours`);
  lines.push(`• **Range:** ${stats.min.toFixed(1)}-${stats.max.toFixed(1)} hours`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);
  lines.push(`• **Average wake-ups:** ${result.data.avgWakeUps.toFixed(1)} per night`);

  if (stats.average < 7) {
    lines.push(`Your average sleep is below the recommended 7-9 hours for adults. Consider adjusting your bedtime routine, limiting screen time before bed, and creating a consistent sleep schedule.`);
  } else if (stats.average > 9) {
    lines.push(`Your average sleep is above 9 hours. While individual needs vary, consistently sleeping more than 9 hours can sometimes indicate underlying issues. If you feel unrested despite long sleep, consider discussing this with your healthcare provider.`);
  } else {
    lines.push(`Your average sleep duration is within the recommended 7-9 hour range for adults. That's great!`);
  }

  if (result.data.avgWakeUps > 2) {
    lines.push(`You're waking up an average of ${result.data.avgWakeUps.toFixed(1)} times per night, which is higher than ideal. This could be affecting your sleep quality.`);
  }

  return lines.join('\n');
}

function generateActivityResponse(result: ToolResult): string {
  const stepStats = result.data.stepStats as StatsSummary;
  if (stepStats.count === 0) return "I don't have any activity data for you yet. Start logging your daily activity to track your progress.";

  const lines: string[] = [];
  lines.push(`Here's your activity summary:`);
  lines.push(`• **Average steps:** ${stepStats.average.toFixed(0)} per day`);
  lines.push(`• **Step range:** ${stepStats.min}-${stepStats.max}`);
  lines.push(`• **Average calories burned:** ${result.data.calStats.average.toFixed(0)} per day`);
  lines.push(`• **Trend:** ${formatTrend(stepStats.trend.direction)}`);

  if (stepStats.average < 5000) {
    lines.push(`Your daily steps are below 5,000. Try adding a short walk to your routine — even 10 minutes can make a difference. The general recommendation is to aim for around 10,000 steps per day.`);
  } else if (stepStats.average >= 10000) {
    lines.push(`You're exceeding the commonly recommended 10,000 steps per day. Excellent work staying active!`);
  } else {
    lines.push(`You're getting a good amount of daily activity. Keep it up — aiming for 10,000 steps is a great target.`);
  }

  return lines.join('\n');
}

function generateHydrationResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any hydration data for you yet. Start tracking your water intake to stay on top of your hydration.";

  const lines: string[] = [];
  lines.push(`Here's your hydration summary:`);
  lines.push(`• **Average intake:** ${stats.average.toFixed(0)} ml per day`);
  lines.push(`• **Daily goal:** ${result.data.goal} ml`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);

  const goalPercent = (stats.average / result.data.goal) * 100;
  if (goalPercent < 80) {
    lines.push(`You're reaching about ${goalPercent.toFixed(0)}% of your daily hydration goal. Try carrying a water bottle with you and drinking water with each meal.`);
  } else if (goalPercent >= 100) {
    lines.push(`You're meeting or exceeding your daily hydration goal. Great job staying hydrated!`);
  } else {
    lines.push(`You're close to your hydration goal at ${goalPercent.toFixed(0)}%. A little more water each day will get you there.`);
  }

  return lines.join('\n');
}

function generateNutritionResponse(result: ToolResult): string {
  const calStats = result.data.calStats as StatsSummary;
  if (calStats.count === 0) return "I don't have any nutrition data for you yet. Start logging your meals to track your nutritional intake.";

  const lines: string[] = [];
  lines.push(`Here's your nutrition summary:`);
  lines.push(`• **Average calories:** ${calStats.average.toFixed(0)} per day`);
  lines.push(`• **Average protein:** ${result.data.proteinStats.average.toFixed(0)}g per day`);
  lines.push(`• **Calorie range:** ${calStats.min}-${calStats.max}`);

  return lines.join('\n');
}

function generateWeightResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any weight data for you yet. Start logging your weight to track changes over time.";

  const lines: string[] = [];
  lines.push(`Here's your weight summary:`);
  lines.push(`• **Average:** ${stats.average.toFixed(1)} kg`);
  lines.push(`• **Range:** ${stats.min.toFixed(1)}-${stats.max.toFixed(1)} kg`);
  lines.push(`• **Trend:** ${formatTrend(result.data.trend.direction)}`);

  return lines.join('\n');
}

function generateMedicationResponse(result: ToolResult): string {
  const meds = result.data;
  if (!meds || meds.length === 0) return "You don't have any active medications in your records. You can add medications in the Medications page to help track your schedule.";

  const lines: string[] = [];
  lines.push(`Here are your active medications:`);
  meds.forEach((m: any) => {
    lines.push(`• **${m.name}** — ${m.dosage}, ${m.schedule}${m.instructions ? `. ${m.instructions}` : ''}`);
  });
  lines.push(`Remember: I can help you track your medication schedule, but I cannot prescribe, adjust dosages, or recommend stopping any medication. Always follow your healthcare provider's instructions.`);

  return lines.join('\n');
}

function generateGoalsResponse(result: ToolResult): string {
  const goals = result.data;
  if (!goals || goals.length === 0) return "You don't have any goals set yet. You can create health goals in the Goals page to track your progress.";

  const lines: string[] = [];
  lines.push(`Here are your current goals:`);
  goals.forEach((g: any) => {
    const progress = g.target_value > 0 ? ((g.current_value / g.target_value) * 100).toFixed(0) : '0';
    const status = g.completed ? ' ✓ Completed' : ` (${progress}% progress)`;
    lines.push(`• **${g.title}** — ${g.current_value}/${g.target_value} ${g.unit}${status}`);
  });

  return lines.join('\n');
}

function generateProfileResponse(result: ToolResult): string {
  const p = result.data;
  if (!p) return "I couldn't find your profile information. You can update your profile in the Profile page.";

  const lines: string[] = [];
  lines.push(`Here's your profile information:`);
  if (p.full_name) lines.push(`• **Name:** ${p.full_name}`);
  if (p.height_cm) lines.push(`• **Height:** ${p.height_cm} cm`);
  if (p.weight_kg) lines.push(`• **Weight:** ${p.weight_kg} kg`);
  if (p.date_of_birth) {
    const age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    lines.push(`• **Age:** ${age} years`);
  }
  lines.push(`• **Activity level:** ${p.activity_level}`);

  return lines.join('\n');
}

function generateKnowledgeResponse(result: ToolResult, query: string): string {
  const docs = result.data as KnowledgeDocument[];
  if (!docs || docs.length === 0) {
    return `I searched our health knowledge base for information about "${query}" but didn't find a specific match. Try rephrasing your question, or ask about topics like sleep, heart rate, blood pressure, hydration, nutrition, exercise, stress, or general wellness.`;
  }

  const lines: string[] = [];
  lines.push(`Here's what I found from trusted health sources about your question:`);
  lines.push('');

  docs.forEach((doc, i) => {
    lines.push(`**${doc.title}**`);
    lines.push(doc.content);
    lines.push('');
    lines.push(`*Source: ${doc.source}${doc.source_url ? ` (${doc.source_url})` : ''}*`);
    if (i < docs.length - 1) lines.push('');
  });

  return lines.join('\n');
}

function generateSummaryResponse(result: ToolResult): string {
  const data = result.data;
  const lines: string[] = [];
  lines.push(`Here's your overall health summary for the past 7 days:`);
  lines.push('');

  if (data.heartRate?.stats?.count > 0) {
    lines.push(`**Heart Rate:** Average ${data.heartRate.stats.average.toFixed(0)} bpm (${formatTrend(data.heartRate.stats.trend.direction)})`);
  }
  if (data.bloodPressure?.systolic?.count > 0) {
    lines.push(`**Blood Pressure:** Average ${data.bloodPressure.systolic.average.toFixed(0)}/${data.bloodPressure.diastolic.average.toFixed(0)} mmHg`);
  }
  if (data.sleep?.stats?.count > 0) {
    lines.push(`**Sleep:** Average ${data.sleep.stats.average.toFixed(1)} hours (${formatTrend(data.sleep.stats.trend.direction)})`);
  }
  if (data.activity?.stepStats?.count > 0) {
    lines.push(`**Activity:** Average ${data.activity.stepStats.average.toFixed(0)} steps/day (${formatTrend(data.activity.stepStats.trend.direction)})`);
  }
  if (data.hydration?.stats?.count > 0) {
    lines.push(`**Hydration:** Average ${data.hydration.stats.average.toFixed(0)} ml/day`);
  }

  lines.push('');
  lines.push(`This is a snapshot of your recent trends. For any concerns about specific metrics, feel free to ask me about them in detail.`);

  return lines.join('\n');
}

function generateSpO2Response(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any SpO2 (blood oxygen) data for you yet. Start logging your readings to track your blood oxygen levels.";

  const lines: string[] = [];
  lines.push(`Here's your blood oxygen (SpO2) summary:`);
  lines.push(`• **Average:** ${stats.average.toFixed(1)}%`);
  lines.push(`• **Range:** ${stats.min}-${stats.max}%`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);

  if (stats.average < 95) {
    lines.push(`Your average SpO2 is below the typical range of 95-100%. If you consistently see readings below 92%, especially with shortness of breath, please consult your healthcare provider.`);
  } else {
    lines.push(`Your SpO2 levels are within the normal range of 95-100%.`);
  }

  return lines.join('\n');
}

function generateTemperatureResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any temperature data for you yet. Start logging your temperature readings to track changes.";

  const lines: string[] = [];
  lines.push(`Here's your body temperature summary:`);
  lines.push(`• **Average:** ${stats.average.toFixed(1)}°C`);
  lines.push(`• **Range:** ${stats.min}-${stats.max}°C`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);

  if (stats.average >= 38) {
    lines.push(`Your average temperature is at or above 38°C, which may indicate a fever. If this persists or you feel unwell, please consult your healthcare provider.`);
  } else if (stats.average < 36) {
    lines.push(`Your average temperature is below 36°C. If you feel cold or unwell, consider discussing this with your healthcare provider.`);
  } else {
    lines.push(`Your temperature is within the normal range of 36-38°C.`);
  }

  return lines.join('\n');
}

function generateGlucoseResponse(result: ToolResult): string {
  const stats = result.data.stats as StatsSummary;
  if (stats.count === 0) return "I don't have any blood glucose data for you yet. Start logging your readings to track your blood sugar levels.";

  const lines: string[] = [];
  lines.push(`Here's your blood glucose summary:`);
  lines.push(`• **Average:** ${stats.average.toFixed(0)} mg/dL`);
  lines.push(`• **Range:** ${stats.min}-${stats.max} mg/dL`);
  lines.push(`• **Trend:** ${formatTrend(stats.trend.direction)}`);

  if (stats.average >= 126) {
    lines.push(`Your average fasting glucose is in the diabetic range (126+ mg/dL). Please consult your healthcare provider for proper evaluation and management.`);
  } else if (stats.average >= 100) {
    lines.push(`Your average fasting glucose is in the prediabetic range (100-125 mg/dL). Lifestyle modifications like diet and exercise can help. Please discuss this with your healthcare provider.`);
  } else {
    lines.push(`Your average blood glucose is within the normal fasting range (70-99 mg/dL).`);
  }

  return lines.join('\n');
}

const generators: Record<string, (result: ToolResult, ...args: any[]) => string> = {
  getUserProfile: generateProfileResponse,
  getRecentHealthData: (_r) => "I've pulled up your recent health data. Here's what I can see from your records over the past week. What specific aspect would you like to know more about — sleep, heart rate, activity, or something else?",
  getHeartRateHistory: generateHeartRateResponse,
  getBloodPressureHistory: generateBloodPressureResponse,
  getSleepHistory: generateSleepResponse,
  getActivityHistory: generateActivityResponse,
  getHydrationHistory: generateHydrationResponse,
  getNutritionHistory: generateNutritionResponse,
  getWeightHistory: generateWeightResponse,
  getMedicationSchedule: generateMedicationResponse,
  getGoals: generateGoalsResponse,
  searchHealthKnowledge: generateKnowledgeResponse,
  createHealthSummary: generateSummaryResponse,
  getSpO2History: generateSpO2Response,
  getTemperatureHistory: generateTemperatureResponse,
  getBloodGlucoseHistory: generateGlucoseResponse,
};

export function generateToolResponse(toolName: string, result: ToolResult, ...args: any[]): string {
  const gen = generators[toolName];
  if (!gen) return result.summary;
  return gen(result, ...args);
}
