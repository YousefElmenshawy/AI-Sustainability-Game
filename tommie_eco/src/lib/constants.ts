/**
 * Game Constants
 * Configuration values for CSP, Minimax, and game mechanics
 */

// CSP (Constraint Satisfaction Problem) Constants
export const CSP_DOMAIN = ["RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT", "NONE"];
export const CSP_MAX_COMPOST = 2; // Max 2 compost hubs per game
export const CSP_MIN_HIGH_ENERGY = 2; // At least 2 high-energy buildings should be covered

// Minimax Constants
export const MINIMAX_DEPTH = 2; // Search depth for minimax algorithm
export const MINIMAX_BASE_SCORE = 10; // Base score for minimax evaluation
export const MINIMAX_MAX_TURNS = 10; // Max turns in a game

// Game Mechanics
export const MAX_RESOURCES = 5; // Total resources player can place
export const TRIVIA_TIME_LIMIT = 15000; // ms for trivia questions
export const TURN_TIME_LIMIT = 30000; // ms per turn

// Building Classification Thresholds
export const HIGH_ENERGY_THRESHOLD = 5; // Buildings with energy >= 5 are high-energy
export const LEED_CERTIFICATION_SCORE = 2.0; // Bonus multiplier for LEED buildings

