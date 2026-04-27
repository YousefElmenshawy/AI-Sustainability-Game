import {
  Graph,
  DistanceMatrix,
  EnergyPenaltyMap,
  SustainabilityBonusMap,
  BuildingEdge,
  DistanceRow,
  EnergyAsset,
  CampusResource,
  SustainabilityFactor,
  SelectedNode,
} from "./types";
import {
  GRAPH_TO_DATASET_NAME,
  HIGH_ENERGY_KEYWORDS,
  GREEN_KEYWORDS,
  RESOURCE_KEYWORDS,
  ENERGY_PENALTY_HIGH,
  ENERGY_PENALTY_GREEN,
} from "./constants";
import { normalized, parseCSV, safeParseFloat } from "./utils";

// Build adjacency list graph from edges
export function buildGraph(edgeRows: BuildingEdge[]): Graph {
  const graph = new Map<string, [string, number][]>();

  edgeRows.forEach((row) => {
    const a = row.Source.trim();
    const b = row.Target.trim();
    const d = safeParseFloat(row.Distance);

    if (d === null) return;

    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);

    graph.get(a)!.push([b, d]);
    graph.get(b)!.push([a, d]);
  });

  return graph;
}

// Load distance matrix for A* heuristic
export function loadDistanceMatrix(rows: DistanceRow[]): DistanceMatrix {
  const distances = new Map<string, number>();

  rows.forEach((row) => {
    const entries = Object.entries(row);
    const src = entries[0][1].trim();

    entries.forEach(([dest, value]) => {
      if (dest && value && dest !== "") {
        const dist = safeParseFloat(value);
        if (dist !== null) {
          distances.set(`${src}|${dest}`, dist);
        }
      }
    });
  });

  return distances;
}

// Calculate energy penalties by building
export function energyPenaltyByGraphNode(
  graphNodes: Set<string>,
  energyRows: EnergyAsset[]
): EnergyPenaltyMap {
  const penalties = new Map<string, number>();

  // Initialize all nodes with 0 penalty
  graphNodes.forEach((node) => penalties.set(node, 0));

  graphNodes.forEach((node) => {
    const mapped = GRAPH_TO_DATASET_NAME[node] || node;
    const mappedKey = normalized(mapped);

    energyRows.forEach((row) => {
      const loc = row.location_name.trim();
      const locKey = normalized(loc);

      if (mappedKey.includes(locKey) || locKey.includes(mappedKey)) {
        const featureText = `${row.asset_type} ${row.designation_or_feature}`.toLowerCase();

        // Add penalty for high-energy features
        HIGH_ENERGY_KEYWORDS.forEach((keyword) => {
          if (featureText.includes(keyword)) {
            penalties.set(node, (penalties.get(node) || 0) + ENERGY_PENALTY_HIGH);
          }
        });

        // Subtract penalty for green features
        GREEN_KEYWORDS.forEach((keyword) => {
          if (featureText.includes(keyword)) {
            penalties.set(node, (penalties.get(node) || 0) + ENERGY_PENALTY_GREEN);
          }
        });
      }
    });
  });

  return penalties;
}

// Calculate sustainability bonuses by building
export function sustainabilityBonusByGraphNode(
  graphNodes: Set<string>,
  resourceRows: CampusResource[]
): SustainabilityBonusMap {
  const bonus = new Map<string, number>();

  // Initialize all nodes with 0 bonus
  graphNodes.forEach((node) => bonus.set(node, 0));

  graphNodes.forEach((node) => {
    const mapped = GRAPH_TO_DATASET_NAME[node] || node;
    const mappedKey = normalized(mapped);

    resourceRows.forEach((row) => {
      const loc = row.location_name.trim();
      const locKey = normalized(loc);

      if (mappedKey.includes(locKey) || locKey.includes(mappedKey)) {
        const resourceType = row.resource_type.toLowerCase();

        // Add bonus based on resource type
        Object.entries(RESOURCE_KEYWORDS).forEach(([keyword, bonusValue]) => {
          if (resourceType.includes(keyword)) {
            bonus.set(node, (bonus.get(node) || 0) + bonusValue);
          }
        });
      }
    });
  });

  return bonus;
}

// Fetch CSV file and parse
export async function fetchCSV<T>(filename: string): Promise<T[]> {
  try {
    const response = await fetch(`/data/${filename}`);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    const text = await response.text();
    return parseCSV(text) as T[];
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
}

// Fetch text file and parse as lines
export async function fetchTextFile(filename: string): Promise<string[]> {
  try {
    const response = await fetch(`/data/${filename}`);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    const text = await response.text();
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
}
