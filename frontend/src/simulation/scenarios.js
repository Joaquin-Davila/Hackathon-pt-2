/**
 * LuNav Mission Planning Scenarios & Contingency Comparison
 */

import { evaluateScheduleSlippageMatrix, recommendOptimalAlternative } from '../services/recommendationEngine.js';

export function runMissionScenarioAnalysis(site, horizonProfile, durationHours = 336, baseDate) {
  const slippageMatrix = evaluateScheduleSlippageMatrix(site, horizonProfile, durationHours, baseDate);
  const recommendation = recommendOptimalAlternative(site, horizonProfile, 0, durationHours, baseDate);

  return {
    slippageMatrix,
    recommendation,
  };
}
