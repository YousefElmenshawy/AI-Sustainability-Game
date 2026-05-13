import {
  Graph,
  DistanceMatrix,
  EnergyPenaltyMap,
  SustainabilityBonusMap,
  AStarResult,
  NodeName,
} from "../types";
import { DISTANCE_MULTIPLIER, MINIMUM_COST } from "@/lib/constants";

interface SearchState {
  current: NodeName;
  remainingTasks: Set<NodeName>;
}

interface HeapNode {
  fCost: number; // f = g + h
  tieBreaker: number;
  gCost: number; // actual cost
  state: SearchState;
  path: NodeName[];
}

// Calculate movement cost from one node to next
function movementCost(
  nextNode: NodeName,
  distance: number,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap
): number {
  const cost =
    distance * DISTANCE_MULTIPLIER +
    (energyPenalty.get(nextNode) || 0) -
    (sustainabilityBonus.get(nextNode) || 0);

  return Math.max(MINIMUM_COST, cost);
}

// Generate state key for tracking visited states
function stateKey(state: SearchState): string {
  const tasks = Array.from(state.remainingTasks).sort().join("|");
  return `${state.current}:${tasks}`;
}

// A* search implementation
export function aStarTaskPlanner(
  graph: Graph,
  start: NodeName,
  goal: NodeName,
  tasks: Set<NodeName>,
  energyPenalty: EnergyPenaltyMap,
  sustainabilityBonus: SustainabilityBonusMap,
  heuristicDistance: DistanceMatrix
): AStarResult {
  const startState: SearchState = {
    current: start,
    remainingTasks: new Set(tasks),
  };

  // Priority queue: sorted by f-cost
  const frontier: HeapNode[] = [
    {
      fCost: 0,
      tieBreaker: 0,
      gCost: 0,
      state: startState,
      path: [start],
    },
  ];

  // Best known cost for each state
  const bestCost = new Map<string, number>();
  bestCost.set(stateKey(startState), 0);

  let tieBreaker = 0;

  // Heuristic: distance to nearest remaining task + distance to goal
  function heuristic(state: SearchState): number {
    const currentNode = heuristicDistance.get(state.current);
    if (!currentNode) return 0;

    if (state.remainingTasks.size === 0) {
      return (currentNode.get(goal) || 0) * DISTANCE_MULTIPLIER;
    }

    let minDist = Infinity;
    state.remainingTasks.forEach((task) => {
      const dist = currentNode.get(task) || 0;
      minDist = Math.min(minDist, dist);
    });

    const goalDist = currentNode.get(goal) || 0;
    return minDist * DISTANCE_MULTIPLIER + goalDist * 250;
  }

  // Min-heap implementation (manual)
  function pushHeap(node: HeapNode) {
    frontier.push(node);
    frontier.sort((a, b) => {
      if (a.fCost !== b.fCost) return a.fCost - b.fCost;
      return a.tieBreaker - b.tieBreaker;
    });
  }

  while (frontier.length > 0) {
    const current = frontier.shift()!;
    const { state, path, gCost } = current;

    // Goal test: all tasks visited and at goal
    if (state.remainingTasks.size === 0 && state.current === goal) {
      return {
        path,
        totalCost: gCost,
      };
    }

    // Explore neighbors
    const neighbors = graph.get(state.current) || [];
    neighbors.forEach(([neighbor, distance]) => {
      // Update remaining tasks if neighbor is in the task list
      const updatedTasks = new Set(state.remainingTasks);
      updatedTasks.delete(neighbor);

      const nextState: SearchState = {
        current: neighbor,
        remainingTasks: updatedTasks,
      };

      const stepCost = movementCost(
        neighbor,
        distance,
        energyPenalty,
        sustainabilityBonus
      );
      const newGCost = gCost + stepCost;

      const stateId = stateKey(nextState);
      const prevCost = bestCost.get(stateId) || Infinity;

      // Only explore if we found a better path
      if (newGCost < prevCost) {
        bestCost.set(stateId, newGCost);
        tieBreaker++;

        const hCost = heuristic(nextState);
        const fCost = newGCost + hCost;

        pushHeap({
          fCost,
          tieBreaker,
          gCost: newGCost,
          state: nextState,
          path: [...path, neighbor],
        });
      }
    });
  }

  throw new Error("A* search failed to find a valid route.");
}
