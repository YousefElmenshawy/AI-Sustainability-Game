import {
  EnergyPenaltyMap,
  SustainabilityBonusMap,
  MinimaxResult,
  NodeName,
} from "../types";
import { MINIMAX_BASE_SCORE, MINIMAX_DEPTH } from "@/lib/constants";

type MinimaxState = Map<NodeName, number>; // 0=neutral, +1=planner, -1=pressure

// Evaluate a state: planner nodes add score, pressure nodes subtract
function evalState(
  state: MinimaxState,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap
): number {
  let score = 0;

  state.forEach((marker, node) => {
    if (marker === 1) {
      // Planner-controlled node
      score += MINIMAX_BASE_SCORE + (sustainabilityBonus.get(node) || 0);
    } else if (marker === -1) {
      // Pressure-controlled node
      score -= MINIMAX_BASE_SCORE + (energyPenalty.get(node) || 0);
    }
  });

  return score;
}

// Get available actions (unclaimed nodes)
function actions(state: MinimaxState): NodeName[] {
  return Array.from(state.entries())
    .filter(([_, mark]) => mark === 0)
    .map(([node]) => node);
}

// Check if state is terminal
function isTerminal(state: MinimaxState, remainingDepth: number): boolean {
  return remainingDepth === 0 || actions(state).length === 0;
}

// Max player (Sustainability Planner)
function maxValue(
  state: MinimaxState,
  remainingDepth: number,
  alpha: number,
  beta: number,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap
): number {
  if (isTerminal(state, remainingDepth)) {
    return evalState(state, energyPenalty, sustainabilityBonus);
  }

  let value = -Infinity;

  for (const action of actions(state)) {
    const child = new Map(state);
    child.set(action, 1); // Planner claims this node

    const result = minValue(
      child,
      remainingDepth - 1,
      alpha,
      beta,
      energyPenalty,
      sustainabilityBonus
    );

    value = Math.max(value, result);

    if (value >= beta) {
      return value; // Beta cutoff
    }

    alpha = Math.max(alpha, value);
  }

  return value;
}

// Min player (Pressure Agent)
function minValue(
  state: MinimaxState,
  remainingDepth: number,
  alpha: number,
  beta: number,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap
): number {
  if (isTerminal(state, remainingDepth)) {
    return evalState(state, energyPenalty, sustainabilityBonus);
  }

  let value = Infinity;

  for (const action of actions(state)) {
    const child = new Map(state);
    child.set(action, -1); // Pressure claims this node

    const result = maxValue(
      child,
      remainingDepth - 1,
      alpha,
      beta,
      energyPenalty,
      sustainabilityBonus
    );

    value = Math.min(value, result);

    if (value <= alpha) {
      return value; // Alpha cutoff
    }

    beta = Math.min(beta, value);
  }

  return value;
}

// Find best opening action for planner
export function minimaxOpeningAction(
  candidateNodes: NodeName[],
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap,
  depth: number = MINIMAX_DEPTH
): MinimaxResult {
  const initialState = new Map<NodeName, number>();
  candidateNodes.forEach((node) => initialState.set(node, 0));

  let bestAction = candidateNodes[0];
  let bestScore = -Infinity;

  for (const action of actions(initialState)) {
    const child = new Map(initialState);
    child.set(action, 1); // Planner tries this action

    const score = minValue(
      child,
      depth - 1,
      -Infinity,
      Infinity,
      energyPenalty,
      sustainabilityBonus
    );

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return {
    bestAction,
    evaluationScore: bestScore,
  };
}
