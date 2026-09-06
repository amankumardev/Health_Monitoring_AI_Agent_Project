export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function calculateMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

export function calculateMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const variance = values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateMovingAverage(values: number[], window: number = 3): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(calculateAverage(slice));
  }
  return result;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export function detectTrend(values: number[]): { direction: TrendDirection; slope: number } {
  if (values.length < 2) return { direction: 'stable', slope: 0 };

  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { direction: 'stable', slope: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;

  const avg = calculateAverage(values);
  const relativeSlope = avg !== 0 ? Math.abs(slope / avg) : 0;

  if (relativeSlope < 0.02) return { direction: 'stable', slope };
  return { direction: slope > 0 ? 'increasing' : 'decreasing', slope };
}

export function detectAnomalies(values: number[], threshold: number = 2): { index: number; value: number; zScore: number }[] {
  if (values.length < 3) return [];
  const avg = calculateAverage(values);
  const stdDev = calculateStandardDeviation(values);
  if (stdDev === 0) return [];

  const anomalies: { index: number; value: number; zScore: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    const zScore = Math.abs((values[i] - avg) / stdDev);
    if (zScore > threshold) {
      anomalies.push({ index: i, value: values[i], zScore });
    }
  }
  return anomalies;
}

export interface PeriodComparison {
  currentAvg: number;
  previousAvg: number;
  percentChange: number;
  currentMin: number;
  currentMax: number;
  previousMin: number;
  previousMax: number;
}

export function comparePeriods(current: number[], previous: number[]): PeriodComparison {
  return {
    currentAvg: calculateAverage(current),
    previousAvg: calculateAverage(previous),
    percentChange: calculatePercentageChange(calculateAverage(current), calculateAverage(previous)),
    currentMin: calculateMin(current),
    currentMax: calculateMax(current),
    previousMin: calculateMin(previous),
    previousMax: calculateMax(previous),
  };
}

export interface StatsSummary {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  trend: { direction: TrendDirection; slope: number };
  anomalies: { index: number; value: number; zScore: number }[];
}

export function calculateStatistics(values: number[]): StatsSummary {
  return {
    count: values.length,
    average: calculateAverage(values),
    median: calculateMedian(values),
    min: calculateMin(values),
    max: calculateMax(values),
    stdDev: calculateStandardDeviation(values),
    trend: detectTrend(values),
    anomalies: detectAnomalies(values),
  };
}
