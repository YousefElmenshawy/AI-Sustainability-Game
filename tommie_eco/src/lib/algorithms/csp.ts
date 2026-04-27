import { NodeName, ResourceType, CSPAssignment } from "../types";
import { CSP_DOMAIN, CSP_MAX_COMPOST, CSP_MIN_HIGH_ENERGY } from "../constants";

export interface CSPProblem {
  variables: NodeName[];
  priorityNodes: Set<NodeName>;
  highEnergyNodes: Set<NodeName>;
  maxTotalResources: number;
}

// Check if current partial assignment violates constraints
function localConstraintsHold(
  partial: Map<NodeName, ResourceType>,
  maxTotalResources: number
): boolean {
  let used = 0;
  let compostCount = 0;

  partial.forEach((value) => {
    if (value !== "NONE") {
      used++;
    }
    if (value === "COMPOST_HUB") {
      compostCount++;
    }
  });

  // Check max resources constraint
  if (used > maxTotalResources) {
    return false;
  }

  // Check max compost constraint
  if (compostCount > CSP_MAX_COMPOST) {
    return false;
  }

  return true;
}

// Check if final assignment satisfies all constraints
function allConstraintsSatisfied(
  assignment: Map<NodeName, ResourceType>,
  priorityNodes: Set<NodeName>,
  highEnergyNodes: Set<NodeName>
): boolean {
  // All priority nodes must have non-NONE assignment
  for (const node of priorityNodes) {
    if (assignment.get(node) === "NONE") {
      return false;
    }
  }

  // At least 2 high-energy nodes must have non-NONE assignment
  let highEnergyCount = 0;
  for (const node of highEnergyNodes) {
    if (assignment.get(node) !== "NONE") {
      highEnergyCount++;
    }
  }

  return highEnergyCount >= CSP_MIN_HIGH_ENERGY;
}

// Backtracking search with constraint checking
function backtrack(
  variables: NodeName[],
  index: number,
  assignment: Map<NodeName, ResourceType>,
  priorityNodes: Set<NodeName>,
  highEnergyNodes: Set<NodeName>,
  maxTotalResources: number
): boolean {
  // Base case: all variables assigned
  if (index === variables.length) {
    return allConstraintsSatisfied(assignment, priorityNodes, highEnergyNodes);
  }

  const node = variables[index];

  // Choose domain for this variable
  let domain: ResourceType[];
  if (priorityNodes.has(node)) {
    // Priority nodes cannot be NONE
    domain = ["RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"];
  } else {
    domain = CSP_DOMAIN as ResourceType[];
  }

  // Try each value in the domain
  for (const value of domain) {
    assignment.set(node, value);

    // Check if local constraints still hold
    if (localConstraintsHold(assignment, maxTotalResources)) {
      // Recursively try to assign remaining variables
      if (backtrack(variables, index + 1, assignment, priorityNodes, highEnergyNodes, maxTotalResources)) {
        return true;
      }
    }

    assignment.delete(node);
  }

  return false;
}

// Solve CSP using backtracking
export function solveResourceCSP(problem: CSPProblem): CSPAssignment {

  const assignment = new Map<NodeName, ResourceType>();

  // Order variables: priority nodes first, then high-energy nodes
  const ordered = [...problem.variables].sort((a, b) => {
    const aIsPriority = problem.priorityNodes.has(a) ? 0 : 1;
    const bIsPriority = problem.priorityNodes.has(b) ? 0 : 1;

    const aIsHighEnergy = problem.highEnergyNodes.has(a) ? 0 : 1;
    const bIsHighEnergy = problem.highEnergyNodes.has(b) ? 0 : 1;

    if (aIsPriority !== bIsPriority) return aIsPriority - bIsPriority;
    return aIsHighEnergy - bIsHighEnergy;
  });

  const success = backtrack(
    ordered,
    0,
    assignment,
    problem.priorityNodes,
    problem.highEnergyNodes,
    problem.maxTotalResources
  );

  if (!success) {
    throw new Error(
      "CSP failed: no valid assignment found with current constraints."
    );
  }

  return assignment;
}
