import {
  GameState,
  GameResult,
  EnergyPenaltyMap,
  SustainabilityBonusMap,
  AwarenessResult,
} from "./types";
import {
  GAME_NAME,
  START_NODE,
  GOAL_NODE,
  REQUIRED_VISIT_NODES,
  MINIMAX_CANDIDATES,
  CSP_VARIABLES,
  CSP_PRIORITY_NODES,
  CSP_HIGH_ENERGY_NODES,
  CSP_MAX_TOTAL_RESOURCES,
} from "./constants";
import { aStarTaskPlanner } from "./algorithms/astar";
import { minimaxOpeningAction } from "./algorithms/minimax";
import { solveResourceCSP } from "./algorithms/csp";
import { getTestAwareness, applyAwarenessEffects } from "./algorithms/awareness";

export async function runGame(
  gameState: GameState
): Promise<GameResult> {
  const {
    graph,
    distanceMatrix,
    energyPenalty: initialEnergyPenalty,
    sustainabilityBonus: initialSustainabilityBonus,
  } = gameState;

  // Copy penalty and bonus maps (we'll modify them based on awareness)
  const energyPenalty = new Map(initialEnergyPenalty);
  const sustainabilityBonus = new Map(initialSustainabilityBonus);

  // For now, use test awareness
  const awareness = getTestAwareness();

  // Apply awareness effects
  applyAwarenessEffects(awareness, sustainabilityBonus, energyPenalty);

  // Determine graph nodes
  const graphNodes = Array.from(graph.keys());
  const requiredTasks = new Set(
    REQUIRED_VISIT_NODES.filter((node) => graphNodes.includes(node))
  );

  // Run A* search
  let astarResult;
  try {
    astarResult = aStarTaskPlanner(
      graph,
      START_NODE,
      GOAL_NODE,
      requiredTasks,
      energyPenalty,
      sustainabilityBonus,
      distanceMatrix
    );
  } catch (error) {
    console.error("A* search failed:", error);
    throw error;
  }

  // Run Minimax
  const minimaxCandidates = MINIMAX_CANDIDATES.filter((node) =>
    graphNodes.includes(node)
  );
  const minimaxResult = minimaxOpeningAction(
    minimaxCandidates,
    energyPenalty,
    sustainabilityBonus
  );

  // Run CSP
  const cspVariables = CSP_VARIABLES.filter((node) => graphNodes.includes(node));
  const cspPriorityNodes = new Set(
    CSP_PRIORITY_NODES.filter((node) => graphNodes.includes(node))
  );
  const cspHighEnergyNodes = new Set(
    CSP_HIGH_ENERGY_NODES.filter((node) => graphNodes.includes(node))
  );

  let cspSolution;
  try {
    cspSolution = solveResourceCSP({
      variables: cspVariables,
      priorityNodes: cspPriorityNodes,
      highEnergyNodes: cspHighEnergyNodes,
      maxTotalResources: CSP_MAX_TOTAL_RESOURCES,
    });
  } catch (error) {
    console.error("CSP solver failed:", error);
    throw error;
  }

  // Build result object
  const result: GameResult = {
    gameName: GAME_NAME,
    datasetsUsed: [
      "ust_selected_game_nodes.csv",
      "ust_building_edges.csv",
      "ust_distance_matrix.csv",
      "ust_energy_assets.csv",
      "ust_campus_resources.csv",
      "ust_sustainability_factors.csv",
      "sustainability_words (2).txt",
    ],
    graphRepresentation: {
      nodesCount: graphNodes.length,
      edgeCount: Array.from(graph.values()).reduce((sum, edges) => sum + edges.length, 0) / 2,
      selectedBuildingsCount: graphNodes.length,
    },
    searchComponent: {
      algorithm: "A*",
      state: "(current_node, remaining_required_visits)",
      actions: "move to adjacent node",
      goal: `visit required nodes then end at ${GOAL_NODE}`,
      startNode: START_NODE,
      requiredNodes: Array.from(requiredTasks),
      path: astarResult.path,
      sustainabilityAwareCost: Math.round(astarResult.totalCost * 1000) / 1000,
    },
    minimaxComponent: {
      players: [
        "Sustainability Planner (MAX)",
        "Demand Pressure Agent (MIN)",
      ],
      evaluation: "sustainability_bonus - energy_penalty over controlled nodes",
      depthLimit: 3,
      bestOpeningAction: minimaxResult.bestAction,
      evaluationScore: Math.round(minimaxResult.evaluationScore * 1000) / 1000,
    },
    cspComponent: {
      variables: cspVariables,
      domain: ["NONE", "RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"],
      constraints: [
        "max 5 non-NONE placements",
        "all priority nodes must receive a resource",
        "at least 2 high-energy nodes must receive a resource",
        "at most 2 COMPOST_HUB placements",
      ],
      validAssignment: Object.fromEntries(cspSolution),
    },
    integratedAwareness: awareness,
  };

  return result;
}
