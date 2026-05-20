/**
 * Integrated Strategy Engine
 * Combines Minimax, A*, and CSP for sophisticated game AI
 * 
 * Strategy Flow:
 * 1. CSP determines optimal resource placements on campus
 * 2. A* finds paths to high-value buildings + resources
 * 3. Minimax evaluates which building/resource combo is strategically best
 */

import {
  Graph,
  DistanceMatrix,
  EnergyPenaltyMap,
  SustainabilityBonusMap,
  NodeName,
  ResourceType,
} from "../types";
import { minimaxOpeningAction } from "./minimax";
import { aStarTaskPlanner } from "./astar";
import { solveResourceCSP } from "./csp";
import { MINIMAX_DEPTH } from "@/lib/constants";

export interface GameSnapshot {
  turn: number;
  playerPosition: NodeName;
  aiPosition: NodeName;
  playerClaims: Set<NodeName>;
  aiClaims: Set<NodeName>;
  playerResources: Map<NodeName, ResourceType>;
  aiResources: Map<NodeName, ResourceType>;
  availableResources: Map<NodeName, ResourceType>;
}

export interface StrategicMove {
  moveType: "claim" | "resource";
  target: NodeName;
  resource?: ResourceType;
  reasoning: string;
  expectedScore: number;
  pathCost?: number;
  depth?: number;
}

/**
 * Calculate the strategic value of a building based on sustainability potential
 * High sustainability bonus + low energy penalty = high value
 * Used for both player scoring and AI strategy
 */
export function calculateBuildingValue(
  building: NodeName,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap
): number {
  const penalty = energyPenalty.get(building) || 0;
  const bonus = sustainabilityBonus.get(building) || 0;
  
  // Improved formula with better spread:
  // High bonus + low penalty = 22-25 points
  // Medium bonus + medium penalty = 12-15 points
  // Low bonus + high penalty = 5-8 points
  const baseValue = bonus * 4 - penalty * 3 + 12;
  return Math.max(5, Math.min(25, baseValue)); // Clamp to 5-25 range
}

/**
 * Phase 1: Solve CSP to find optimal resource placement
 * Given current game state, where should resources be placed?
 */
export function solveResourcePlacement(
  availableBuildings: NodeName[],
  priorityNodes: Set<NodeName>,
  energyMap: EnergyPenaltyMap
): Map<NodeName, ResourceType> {
  try {
    // Create CSP problem
    const highEnergyNodes = new Set<NodeName>();
    availableBuildings.forEach((building) => {
      if ((energyMap.get(building) || 0) >= 5) {
        highEnergyNodes.add(building);
      }
    });

    const cspProblem = {
      variables: availableBuildings,
      priorityNodes,
      highEnergyNodes,
      maxTotalResources: 5,
    };

    const result = solveResourceCSP(cspProblem);

    const placement = new Map<NodeName, ResourceType>();
    result.forEach((resource, building) => {
      if (resource !== "NONE") {
        placement.set(building, resource);
      }
    });

    return placement;
  } catch (error) {
    console.warn("CSP resource placement failed:", error);
    return new Map();
  }
}

/**
 * Phase 2: Plan optimal path using A* that includes resources
 * Find best path considering both buildings and resource placements
 */
export function planStrategicPath(
  graph: Graph,
  start: NodeName,
  goal: NodeName,
  targetBuildings: Set<NodeName>,
  resourceLocations: Map<NodeName, ResourceType>,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap,
  distanceMatrix: DistanceMatrix
): {
  path: NodeName[];
  cost: number;
  resourcesCollected: ResourceType[];
} {
  try {
    // Combine target buildings with resource locations
    const allTargets = new Set(targetBuildings);
    resourceLocations.forEach((_, building) => allTargets.add(building));

    const result = aStarTaskPlanner(
      graph,
      start,
      goal,
      allTargets,
      energyPenalty,
      sustainabilityBonus,
      distanceMatrix
    );

    // Track which resources are on the path
    const resourcesCollected: ResourceType[] = [];
    result.path.forEach((node) => {
      const resource = resourceLocations.get(node);
      if (resource) {
        resourcesCollected.push(resource);
      }
    });

    return {
      path: result.path,
      cost: result.totalCost,
      resourcesCollected,
    };
  } catch (error) {
    console.warn("Strategic path planning failed:", error);
    return { path: [start], cost: 0, resourcesCollected: [] };
  }
}

/**
 * Phase 3: Use Minimax to evaluate strategic moves
 * Consider both claiming buildings AND resources
 */
export function evaluateStrategicMoves(
  gameSnapshot: GameSnapshot,
  availableMoves: NodeName[],
  resourcePlacements: Map<NodeName, ResourceType>,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap,
  depth: number = MINIMAX_DEPTH
): StrategicMove {
  try {
    // Score each candidate considering:
    // 1. Minimax game tree evaluation
    // 2. Resource value at location
    // 3. Distance impact

    const minimaxResult = minimaxOpeningAction(
      availableMoves,
      energyPenalty,
      sustainabilityBonus,
      depth
    );

    const targetBuilding = minimaxResult.bestAction;
    const resourceAtTarget = resourcePlacements.get(targetBuilding);

    let reasoning = `📍 Claimed ${targetBuilding}`;
    if (resourceAtTarget) {
      reasoning += ` with ${resourceAtTarget}`;
    }
    reasoning += ` (strategic evaluation: ${minimaxResult.evaluationScore})`;

    return {
      moveType: resourceAtTarget ? "resource" : "claim",
      target: targetBuilding,
      resource: resourceAtTarget,
      reasoning,
      expectedScore: minimaxResult.evaluationScore,
      depth,
    };
  } catch (error) {
    console.warn("Minimax move evaluation failed:", error);
    return {
      moveType: "claim",
      target: availableMoves[0] || ("arc" as NodeName),
      reasoning: "⚠️ Fallback move (evaluation system offline)",
      expectedScore: 0,
    };
  }
}

/**
 * Full integrated strategy: CSP → A* → Minimax
 */
export function computeIntegratedAIMove(
  gameSnapshot: GameSnapshot,
  graph: Graph,
  distanceMatrix: DistanceMatrix,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap,
  allBuildings: NodeName[]
): {
  move: StrategicMove;
  pathPlans: Array<{ path: NodeName[]; cost: number; reasoning: string }>;
  resourcePlacement: Map<NodeName, ResourceType>;
} {
  // Step 1: CSP determines resource placement
  const availableForClaim = allBuildings.filter(
    (b) => !gameSnapshot.playerClaims.has(b) && !gameSnapshot.aiClaims.has(b)
  );

  const priorityNodes = new Set(
    allBuildings.filter((b) => sustainabilityBonus.get(b as NodeName)! > 0)
  );

  const resourcePlacement = solveResourcePlacement(
    availableForClaim as NodeName[],
    priorityNodes as Set<NodeName>,
    energyPenalty
  );

  // Step 2: A* plans potential paths to high-value targets
  const highValueTargets = new Set(
    availableForClaim
      .filter((b) => sustainabilityBonus.get(b as NodeName)! > 2)
      .slice(0, 5) as NodeName[]
  );

  const pathPlans = availableForClaim
    .slice(0, 3)
    .map((target) => {
      try {
        const plan = planStrategicPath(
          graph,
          gameSnapshot.aiPosition,
          target as NodeName,
          highValueTargets,
          resourcePlacement,
          energyPenalty,
          sustainabilityBonus,
          distanceMatrix
        );

        return {
          path: plan.path,
          cost: plan.cost,
          reasoning: `Path to ${target} collecting ${plan.resourcesCollected.join(", ") || "no resources"}`,
        };
      } catch {
        return {
          path: [gameSnapshot.aiPosition],
          cost: 0,
          reasoning: "Plan failed",
        };
      }
    });

  // Step 3: Minimax evaluates best strategic move
  const move = evaluateStrategicMoves(
    gameSnapshot,
    availableForClaim as NodeName[],
    resourcePlacement,
    energyPenalty,
    sustainabilityBonus,
    MINIMAX_DEPTH
  );

  return {
    move,
    pathPlans,
    resourcePlacement,
  };
}
