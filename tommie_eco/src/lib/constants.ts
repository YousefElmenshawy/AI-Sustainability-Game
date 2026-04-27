// Graph name mapping (Python to dataset names)
export const GRAPH_TO_DATASET_NAME: Record<string, string> = {
  Anderson: "Anderson Student Center",
  FreyHall: "Frey Residence Hall",
  Schoenecker: "Schoenecker Center",
  Murray: "Murray-Herrick Campus Center",
  OEC: "O'Shaughnessy Educational Center",
  Library: "O'Shaughnessy-Frey Library Center",
  OSS: "O'Shaughnessy Science Hall",
  Ireland: "Archbishop Ireland Memorial Library",
  Brady: "Brady Educational Center",
};

// Energy asset keywords
export const HIGH_ENERGY_KEYWORDS = ["science", "microgrid", "policy"];
export const GREEN_KEYWORDS = ["leed", "ev", "solar"];

// Sustainability bonus keywords
export const RESOURCE_KEYWORDS = {
  compost: 0.7,
  recycling: 0.6,
  green_space: 0.9,
  bike: 0.4,
  ev_charging: 0.5,
};

// Energy penalty adjustments
export const ENERGY_PENALTY_HIGH = 1.3;
export const ENERGY_PENALTY_GREEN = -0.6;

// A* multipliers
export const DISTANCE_MULTIPLIER = 1000;
export const MINIMUM_COST = 0.0001;

// Minimax constants
export const MINIMAX_BASE_SCORE = 4.0;
export const MINIMAX_DEPTH = 3;

// CSP constraints
export const CSP_DOMAIN: string[] = ["NONE", "RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"];
export const CSP_MAX_COMPOST = 2;
export const CSP_MIN_HIGH_ENERGY = 2;

// Awareness modifiers
export const AWARENESS_ANDERSON_BONUS = 0.8;
export const AWARENESS_FREY_BONUS = 0.6;
export const AWARENESS_OSS_PENALTY = 0.8;
export const AWARENESS_PASS_MODIFIER = -0.5;
export const AWARENESS_FAIL_MODIFIER = 1.2;

// Game settings
export const GAME_NAME = "Tommie EcoOps: Campus Grid";
export const START_NODE = "FreyHall";
export const GOAL_NODE = "Anderson";
export const REQUIRED_VISIT_NODES = ["OEC"];
export const MINIMAX_CANDIDATES = [
  "Anderson",
  "FreyHall",
  "OEC",
  "OSS",
  "Schoenecker",
  "Murray",
  "Library",
];
export const CSP_VARIABLES = [
  "Anderson",
  "FreyHall",
  "OEC",
  "OSS",
  "Schoenecker",
  "Murray",
  "Library",
  "Brady",
];
export const CSP_PRIORITY_NODES = ["Anderson", "FreyHall", "OEC"];
export const CSP_HIGH_ENERGY_NODES = ["OSS", "OEC", "Schoenecker"];
export const CSP_MAX_TOTAL_RESOURCES = 5;
