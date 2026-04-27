import { AwarenessResult } from "../types";
import {
  AWARENESS_ANDERSON_BONUS,
  AWARENESS_FREY_BONUS,
  AWARENESS_OSS_PENALTY,
} from "../constants";

export interface AwarenessCheckInput {
  vocabularyAttempt: string;
  triviaAttempt: string;
  validWords: string[];
  carbonNeutralityTarget: string;
}

// Run awareness gate checks
export function checkAwareness(input: AwarenessCheckInput): AwarenessResult {
  // Check vocabulary: is the attempt in the valid words list?
  const vocabOk = input.validWords.some(
    (word) => word.toLowerCase() === input.vocabularyAttempt.toLowerCase()
  );

  // Check trivia: does answer match expected value?
  const triviaOk =
    input.triviaAttempt.trim() === input.carbonNeutralityTarget.trim();

  // Resource action succeeds only if both checks pass
  const actionSuccess = vocabOk && triviaOk;

  // Path energy modifier: positive if pass (makes route easier), higher if fail
  const pathEnergyModifier = actionSuccess ? -0.5 : 1.2;

  return {
    vocabularyPrompt: "Use a valid sustainability term to unlock advanced action.",
    vocabularyAttempt: input.vocabularyAttempt,
    vocabularyPassed: vocabOk,
    triviPrompt: "What is the campus carbon neutrality target year?",
    triviaExpectedAnswer: input.carbonNeutralityTarget,
    triviaAttempt: input.triviaAttempt,
    triviaPassed: triviaOk,
    resourceActionSuccess: actionSuccess,
    pathEnergyModifier: pathEnergyModifier,
  };
}

// Get default test awareness result (hardcoded for initial testing)
export function getTestAwareness(): AwarenessResult {
  return {
    vocabularyPrompt: "Use a valid sustainability term to unlock advanced action.",
    vocabularyAttempt: "Carbon neutral",
    vocabularyPassed: true,
    triviPrompt: "What is the campus carbon neutrality target year?",
    triviaExpectedAnswer: "2035",
    triviaAttempt: "2035",
    triviaPassed: true,
    resourceActionSuccess: true,
    pathEnergyModifier: -0.5,
  };
}

// Apply awareness effects to bonuses/penalties
export function applyAwarenessEffects(
  awareness: AwarenessResult,
  bonuses: Map<string, number>,
  penalties: Map<string, number>
): void {
  if (awareness.resourceActionSuccess) {
    // Boost sustainability for key buildings
    bonuses.set("Anderson", (bonuses.get("Anderson") || 0) + AWARENESS_ANDERSON_BONUS);
    bonuses.set("FreyHall", (bonuses.get("FreyHall") || 0) + AWARENESS_FREY_BONUS);
  } else {
    // Penalize high-energy building
    penalties.set("OSS", (penalties.get("OSS") || 0) + AWARENESS_OSS_PENALTY);
  }
}
