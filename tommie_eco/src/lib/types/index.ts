// Core game types

export type NodeName = string;
export type Distance = number;
export type Cost = number;

// Graph structure: node -> [(neighbor, distance)]
export type Graph = Map<NodeName, [NodeName, Distance][]>;

// Distance matrix for heuristics: (src, dst) -> distance
export type DistanceMatrix = Map<string, Distance>;

// Scoring dictionaries
export type EnergyPenaltyMap = Map<NodeName, number>;
export type SustainabilityBonusMap = Map<NodeName, number>;

// A* Search types
export interface SearchState {
  current: NodeName;
  remainingTasks: Set<NodeName>;
}

export interface AStarResult {
  path: NodeName[];
  totalCost: Cost;
}

// Minimax types
export type NodeMarker = 0 | 1 | -1; // 0=neutral, +1=planner, -1=pressure
export type MinimaxState = Map<NodeName, NodeMarker>;

export interface MinimaxResult {
  bestAction: NodeName;
  evaluationScore: number;
}

// CSP types
export type ResourceType = "NONE" | "RECYCLE_BIN" | "COMPOST_HUB" | "BIKE_SUPPORT";
export type CSPAssignment = Map<NodeName, ResourceType>;

export interface CSPProblem {
  variables: NodeName[];
  priorityNodes: Set<NodeName>;
  highEnergyNodes: Set<NodeName>;
  maxTotalResources: number;
}

// Awareness types
export interface AwarenessResult {
  vocabularyPrompt: string;
  vocabularyAttempt: string;
  vocabularyPassed: boolean;
  triviPrompt: string;
  triviaExpectedAnswer: string;
  triviaAttempt: string;
  triviaPassed: boolean;
  resourceActionSuccess: boolean;
  pathEnergyModifier: number;
}

// CSV Data types
export interface SelectedNode {
  node_name: string;
  x_coordinate: string;
  y_coordinate: string;
  node_type?: string;
}

export interface BuildingEdge {
  Source: string;
  Target: string;
  Distance: string;
}

export interface DistanceRow {
  [key: string]: string;
}

export interface EnergyAsset {
  location_name: string;
  asset_type: string;
  designation_or_feature: string;
}

export interface CampusResource {
  location_name: string;
  resource_type: string;
}

export interface SustainabilityFactor {
  factor_name: string;
  value: string;
}

// Game state
export interface GameState {
  graph: Graph;
  distanceMatrix: DistanceMatrix;
  energyPenalty: EnergyPenaltyMap;
  sustainabilityBonus: SustainabilityBonusMap;
  awareness: AwarenessResult;
  sustainabilityWords: string[];
}

export interface GameResult {
  gameName: string;
  datasetsUsed: string[];
  graphRepresentation: {
    nodesCount: number;
    edgeCount: number;
    selectedBuildingsCount: number;
  };
  searchComponent: {
    algorithm: string;
    state: string;
    actions: string;
    goal: string;
    startNode: NodeName;
    requiredNodes: NodeName[];
    path: NodeName[];
    sustainabilityAwareCost: number;
  };
  minimaxComponent: {
    players: string[];
    evaluation: string;
    depthLimit: number;
    bestOpeningAction: NodeName;
    evaluationScore: number;
  };
  cspComponent: {
    variables: NodeName[];
    domain: ResourceType[];
    constraints: string[];
    validAssignment: Record<NodeName, ResourceType>;
  };
  integratedAwareness: AwarenessResult;
}
