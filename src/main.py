from __future__ import annotations

import csv
import heapq
import json
import random
import re
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "output"
GAME_NAME = "Tommie EcoOps: Campus Grid"

# Map graph-node labels to dataset location names where available.
GRAPH_TO_DATASET_NAME = {
    "Anderson": "Anderson Student Center",
    "FreyHall": "Frey Residence Hall",
    "Schoenecker": "Schoenecker Center",
    "Murray": "Murray-Herrick Campus Center",
    "OEC": "O'Shaughnessy Educational Center",
    "Library": "O'Shaughnessy-Frey Library Center",
    "OSS": "O'Shaughnessy Science Hall",
    "Ireland": "Archbishop Ireland Memorial Library",
    "Brady": "Brady Educational Center",
}


def load_csv(filename: str) -> List[Dict[str, str]]:
    with (DATA_DIR / filename).open("r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_vocabulary_words(filename: str) -> List[str]:
    path = DATA_DIR / filename
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def normalized(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def build_graph(edge_rows: List[Dict[str, str]]) -> Dict[str, List[Tuple[str, float]]]:
    graph: Dict[str, List[Tuple[str, float]]] = {}
    for row in edge_rows:
        a = row["Source"].strip()
        b = row["Target"].strip()
        d = float(row["Distance"])
        graph.setdefault(a, []).append((b, d))
        graph.setdefault(b, []).append((a, d))
    return graph


def load_distance_matrix(rows: List[Dict[str, str]]) -> Dict[Tuple[str, str], float]:
    distances: Dict[Tuple[str, str], float] = {}
    for row in rows:
        src = next(iter(row.values())).strip()
        for dest, value in row.items():
            if dest and value and dest != "":
                try:
                    distances[(src, dest)] = float(value)
                except ValueError:
                    continue
    return distances


def energy_penalty_by_graph_node(graph_nodes: Set[str], energy_rows: List[Dict[str, str]]) -> Dict[str, float]:
    penalties = {node: 0.0 for node in graph_nodes}
    high_energy_keywords = ("science", "microgrid", "policy")
    green_keywords = ("leed", "ev", "solar")

    for node in graph_nodes:
        mapped = GRAPH_TO_DATASET_NAME.get(node, node)
        mapped_key = normalized(mapped)
        for row in energy_rows:
            loc = row["location_name"].strip()
            loc_key = normalized(loc)
            if mapped_key in loc_key or loc_key in mapped_key:
                feature_text = f"{row['asset_type']} {row['designation_or_feature']}".lower()
                if any(k in feature_text for k in high_energy_keywords):
                    penalties[node] += 1.3
                if any(k in feature_text for k in green_keywords):
                    penalties[node] -= 0.6
    return penalties


def sustainability_bonus_by_graph_node(graph_nodes: Set[str], resource_rows: List[Dict[str, str]]) -> Dict[str, float]:
    bonus = {node: 0.0 for node in graph_nodes}
    for node in graph_nodes:
        mapped = GRAPH_TO_DATASET_NAME.get(node, node)
        mapped_key = normalized(mapped)
        for row in resource_rows:
            loc = row["location_name"].strip()
            loc_key = normalized(loc)
            if mapped_key in loc_key or loc_key in mapped_key:
                resource_type = row["resource_type"].lower()
                if "compost" in resource_type:
                    bonus[node] += 0.7
                elif "recycling" in resource_type:
                    bonus[node] += 0.6
                elif "green_space" in resource_type:
                    bonus[node] += 0.9
                elif "bike" in resource_type:
                    bonus[node] += 0.4
                elif "ev_charging" in resource_type:
                    bonus[node] += 0.5
    return bonus


@dataclass(frozen=True)
class SearchState:
    current: str
    remaining_tasks: Tuple[str, ...]


def movement_cost(next_node: str, distance: float, energy_penalty: Dict[str, float], sustainability_bonus: Dict[str, float]) -> float:
    return max(0.0001, distance * 1000 + energy_penalty.get(next_node, 0.0) - sustainability_bonus.get(next_node, 0.0))


def a_star_task_planner(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    tasks: Set[str],
    energy_penalty: Dict[str, float],
    sustainability_bonus: Dict[str, float],
    heuristic_distance: Dict[Tuple[str, str], float],
) -> Tuple[List[str], float]:
    start_state = SearchState(start, tuple(sorted(tasks)))
    frontier = [(0.0, 0, 0.0, start_state, [start])]
    best_cost = {start_state: 0.0}
    tie = 0

    def heuristic(state: SearchState) -> float:
        if not state.remaining_tasks:
            return heuristic_distance.get((state.current, goal), 0.0) * 1000
        nearest = min(heuristic_distance.get((state.current, t), 0.0) for t in state.remaining_tasks)
        return nearest * 1000 + heuristic_distance.get((state.current, goal), 0.0) * 250

    while frontier:
        _, _, g_cost, state, path = heapq.heappop(frontier)
        if not state.remaining_tasks and state.current == goal:
            return path, g_cost

        for neighbor, dist in graph.get(state.current, []):
            updated_tasks = tuple(t for t in state.remaining_tasks if t != neighbor)
            next_state = SearchState(neighbor, updated_tasks)
            step_cost = movement_cost(neighbor, dist, energy_penalty, sustainability_bonus)
            new_cost = g_cost + step_cost
            if new_cost < best_cost.get(next_state, float("inf")):
                best_cost[next_state] = new_cost
                tie += 1
                heapq.heappush(frontier, (new_cost + heuristic(next_state), tie, new_cost, next_state, path + [neighbor]))

    raise RuntimeError("Search failed to find a valid route.")


def minimax_opening_action(
    candidate_nodes: List[str],
    energy_penalty: Dict[str, float],
    sustainability_bonus: Dict[str, float],
    depth: int = 3,
) -> Tuple[str, float]:
    initial_state = {node: 0 for node in candidate_nodes}  # 0=neutral, +1=planner, -1=pressure agent

    def eval_state(state: Dict[str, int]) -> float:
        score = 0.0
        for node, marker in state.items():
            if marker == 1:
                score += 4.0 + sustainability_bonus.get(node, 0.0)
            elif marker == -1:
                score -= 4.0 + energy_penalty.get(node, 0.0)
        return score

    def actions(state: Dict[str, int]) -> List[str]:
        return [node for node, mark in state.items() if mark == 0]

    def terminal(state: Dict[str, int], remaining_depth: int) -> bool:
        return remaining_depth == 0 or not actions(state)

    def max_value(state: Dict[str, int], remaining_depth: int, alpha: float, beta: float) -> float:
        if terminal(state, remaining_depth):
            return eval_state(state)
        value = float("-inf")
        for action in actions(state):
            child = dict(state)
            child[action] = 1
            value = max(value, min_value(child, remaining_depth - 1, alpha, beta))
            if value >= beta:
                return value
            alpha = max(alpha, value)
        return value

    def min_value(state: Dict[str, int], remaining_depth: int, alpha: float, beta: float) -> float:
        if terminal(state, remaining_depth):
            return eval_state(state)
        value = float("inf")
        for action in actions(state):
            child = dict(state)
            child[action] = -1
            value = min(value, max_value(child, remaining_depth - 1, alpha, beta))
            if value <= alpha:
                return value
            beta = min(beta, value)
        return value

    best_action = candidate_nodes[0]
    best_score = float("-inf")
    for action in actions(initial_state):
        child = dict(initial_state)
        child[action] = 1
        score = min_value(child, depth - 1, float("-inf"), float("inf"))
        if score > best_score:
            best_score = score
            best_action = action
    return best_action, best_score


def solve_resource_csp(
    variables: List[str],
    priority_nodes: Set[str],
    high_energy_nodes: Set[str],
    max_total_resources: int,
) -> Dict[str, str]:
    domain = ["NONE", "RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"]
    assignment: Dict[str, str] = {}

    def local_constraints_hold(partial: Dict[str, str]) -> bool:
        used = sum(1 for value in partial.values() if value != "NONE")
        if used > max_total_resources:
            return False
        compost_count = sum(1 for value in partial.values() if value == "COMPOST_HUB")
        if compost_count > 2:
            return False
        return True

    ordered = sorted(variables, key=lambda node: (node not in priority_nodes, node not in high_energy_nodes))

    def backtrack(i: int) -> bool:
        if i == len(ordered):
            covered_priority = all(assignment.get(node) != "NONE" for node in priority_nodes)
            covered_high = sum(1 for node in high_energy_nodes if assignment.get(node) != "NONE") >= 2
            return covered_priority and covered_high

        node = ordered[i]
        node_domain = domain if node not in priority_nodes else ["RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"]
        for value in node_domain:
            assignment[node] = value
            if local_constraints_hold(assignment) and backtrack(i + 1):
                return True
        assignment.pop(node, None)
        return False

    if not backtrack(0):
        raise RuntimeError("CSP failed: no valid assignment found with current constraints.")
    return assignment


def awareness_gate(sustainability_words: List[str], factors: List[Dict[str, str]]) -> Dict[str, object]:
    # Embedded awareness: an action succeeds only if both checks pass.
    vocab_attempt = "Carbon neutral"
    vocab_ok = vocab_attempt.lower() in {word.lower() for word in sustainability_words}

    factor_question = "What is the campus carbon neutrality target year?"
    expected = next((row["value"] for row in factors if row["factor_name"] == "carbon_neutrality_target"), "")
    simulated_answer = "2035"
    factor_ok = simulated_answer.strip() == expected.strip()

    return {
        "vocabulary_prompt": "Use a valid sustainability term to unlock advanced action.",
        "vocabulary_attempt": vocab_attempt,
        "vocabulary_passed": vocab_ok,
        "trivia_prompt": factor_question,
        "trivia_expected_answer": expected,
        "trivia_attempt": simulated_answer,
        "trivia_passed": factor_ok,
        "resource_action_success": vocab_ok and factor_ok,
        "path_energy_modifier": -0.5 if vocab_ok and factor_ok else 1.2,
    }


# Deliverable 2: Monte Carlo simulation under uncertainty.
def shortest_path_with_tasks(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    tasks: Set[str],
) -> Tuple[List[str], float]:
    zero = {node: 0.0 for node in graph}
    return a_star_task_planner(
        graph=graph,
        start=start,
        goal=goal,
        tasks=tasks,
        energy_penalty=zero,
        sustainability_bonus=zero,
        heuristic_distance={},
    )


def sample_stochastic_step_cost(
    next_node: str,
    distance: float,
    energy_penalty: Dict[str, float],
    sustainability_bonus: Dict[str, float],
) -> float:
    base_travel = distance * 1000
    travel_cost = base_travel * random.uniform(0.9, 1.8)

    energy_base = max(0.0, energy_penalty.get(next_node, 0.0))
    energy_cost = energy_base * random.uniform(0.8, 1.5)

    resource_base = max(0.0, sustainability_bonus.get(next_node, 0.0))
    resource_effect = resource_base * random.uniform(0.7, 1.2)

    success_probability = min(
        0.9,
        max(0.25, 0.45 + (resource_base * 0.08) - (energy_base * 0.04)),
    )
    action_success = random.random() < success_probability
    sustainability_credit = resource_effect if action_success else 0.0
    failure_penalty = 0.6 if not action_success and resource_base > 0 else 0.0

    return max(0.0001, travel_cost + energy_cost - sustainability_credit + failure_penalty)


def monte_carlo_path_cost(
    path: List[str],
    graph: Dict[str, List[Tuple[str, float]]],
    energy_penalty: Dict[str, float],
    sustainability_bonus: Dict[str, float],
) -> float:
    adjacency = {(src, dst): dist for src, edges in graph.items() for dst, dist in edges}
    total = 0.0
    for i in range(1, len(path)):
        src = path[i - 1]
        dst = path[i]
        dist = adjacency[(src, dst)]
        total += sample_stochastic_step_cost(dst, dist, energy_penalty, sustainability_bonus)
    return total


def summarize_runs(values: List[float]) -> Dict[str, float]:
    return {
        "average": round(statistics.mean(values), 3),
        "best_case": round(min(values), 3),
        "worst_case": round(max(values), 3),
        "std_dev": round(statistics.pstdev(values), 3),
    }


def run_monte_carlo_comparison(
    graph: Dict[str, List[Tuple[str, float]]],
    start_node: str,
    goal_node: str,
    required_visit_nodes: Set[str],
    energy_penalty: Dict[str, float],
    sustainability_bonus: Dict[str, float],
    distance_lookup: Dict[Tuple[str, str], float],
    runs: int = 300,
) -> Dict[str, object]:
    sustainability_tasks = set(required_visit_nodes)
    targeted_task = max(required_visit_nodes, key=lambda node: energy_penalty.get(node, 0.0))
    distance_strategy_tasks = {targeted_task}

    sustainable_path, _ = a_star_task_planner(
        graph=graph,
        start=start_node,
        goal=goal_node,
        tasks=sustainability_tasks,
        energy_penalty=energy_penalty,
        sustainability_bonus=sustainability_bonus,
        heuristic_distance=distance_lookup,
    )
    shortest_path, _ = shortest_path_with_tasks(
        graph=graph,
        start=start_node,
        goal=goal_node,
        tasks=distance_strategy_tasks,
    )

    sustainable_runs = [
        monte_carlo_path_cost(sustainable_path, graph, energy_penalty, sustainability_bonus)
        for _ in range(runs)
    ]
    shortest_runs = [
        monte_carlo_path_cost(shortest_path, graph, energy_penalty, sustainability_bonus)
        for _ in range(runs)
    ]

    sustainable_summary = summarize_runs(sustainable_runs)
    shortest_summary = summarize_runs(shortest_runs)

    wins_for_sustainable = sum(1 for a, b in zip(sustainable_runs, shortest_runs) if a < b)

    return {
        "question": "Which route strategy is more sustainable and stable under uncertainty?",
        "simulation_unit": "One campus planning cycle with uncertain congestion, energy demand, and resource-action outcomes.",
        "runs": runs,
        "strategies": {
            "sustainability_aware_a_star": {
                "description": "Visits all required objectives while planning with dataset-driven energy penalties and bonuses.",
                "path": sustainable_path,
                "required_nodes": sorted(sustainability_tasks),
                "metrics": sustainable_summary,
            },
            "distance_first_route": {
                "description": "Targets only the highest-energy required building, then minimizes total travel distance.",
                "path": shortest_path,
                "required_nodes": sorted(distance_strategy_tasks),
                "metrics": shortest_summary,
            },
        },
        "uncertainty_model": {
            "travel_cost": "distance * uniform(0.9, 1.8)",
            "energy_variation": "energy_penalty * uniform(0.8, 1.5)",
            "resource_effectiveness": "sustainability_bonus * uniform(0.7, 1.2)",
            "action_success": "random() < clip(0.45 + 0.08*bonus - 0.04*energy, 0.25, 0.9)",
        },
        "comparison": {
            "sustainability_strategy_win_rate_percent": round((wins_for_sustainable / runs) * 100, 2),
            "average_cost_gap_distance_minus_sustainable": round(
                shortest_summary["average"] - sustainable_summary["average"], 3
            ),
        },
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    selected_nodes = load_csv("ust_selected_game_nodes.csv")
    edge_rows = load_csv("ust_building_edges.csv")
    distance_rows = load_csv("ust_distance_matrix.csv")
    energy_rows = load_csv("ust_energy_assets.csv")
    resource_rows = load_csv("ust_campus_resources.csv")
    factors = load_csv("ust_sustainability_factors.csv")
    sustainability_words = load_vocabulary_words("sustainability_words (2).txt")

    graph = build_graph(edge_rows)
    distance_lookup = load_distance_matrix(distance_rows)
    graph_nodes = set(graph.keys())

    energy_penalty = energy_penalty_by_graph_node(graph_nodes, energy_rows)
    sustainability_bonus = sustainability_bonus_by_graph_node(graph_nodes, resource_rows)
    awareness = awareness_gate(sustainability_words, factors)

    if awareness["resource_action_success"]:
        sustainability_bonus["Anderson"] = sustainability_bonus.get("Anderson", 0.0) + 0.8
        sustainability_bonus["FreyHall"] = sustainability_bonus.get("FreyHall", 0.0) + 0.6
    else:
        energy_penalty["OSS"] = energy_penalty.get("OSS", 0.0) + 0.8

    start_node = "FreyHall"
    goal_node = "Anderson"
    required_visit_nodes = {"OEC", "Binz" if "Binz" in graph else "KochCommons"}

    path, sustainability_cost = a_star_task_planner(
        graph=graph,
        start=start_node,
        goal=goal_node,
        tasks=required_visit_nodes,
        energy_penalty=energy_penalty,
        sustainability_bonus=sustainability_bonus,
        heuristic_distance=distance_lookup,
    )
    monte_carlo = run_monte_carlo_comparison(
        graph=graph,
        start_node=start_node,
        goal_node=goal_node,
        required_visit_nodes=required_visit_nodes,
        energy_penalty=energy_penalty,
        sustainability_bonus=sustainability_bonus,
        distance_lookup=distance_lookup,
        runs=300,
    )

    minimax_candidates = ["Anderson", "FreyHall", "OEC", "OSS", "Schoenecker", "Murray", "Library"]
    minimax_action, minimax_score = minimax_opening_action(
        candidate_nodes=[node for node in minimax_candidates if node in graph_nodes],
        energy_penalty=energy_penalty,
        sustainability_bonus=sustainability_bonus,
        depth=3,
    )

    csp_variables = ["Anderson", "FreyHall", "OEC", "OSS", "Schoenecker", "Murray", "Library", "Brady"]
    csp_variables = [node for node in csp_variables if node in graph_nodes]
    priority_nodes = {"Anderson", "FreyHall", "OEC"}
    high_energy_nodes = {"OSS", "OEC", "Schoenecker"}
    csp_solution = solve_resource_csp(
        variables=csp_variables,
        priority_nodes={node for node in priority_nodes if node in csp_variables},
        high_energy_nodes={node for node in high_energy_nodes if node in csp_variables},
        max_total_resources=5,
    )

    result = {
        "game_name": GAME_NAME,
        "datasets_used": [
            "ust_selected_game_nodes.csv",
            "ust_building_edges.csv",
            "ust_distance_matrix.csv",
            "ust_energy_assets.csv",
            "ust_campus_resources.csv",
            "ust_sustainability_factors.csv",
            "sustainability_words (2).txt",
        ],
        "graph_representation": {
            "nodes_count": len(graph_nodes),
            "edge_count": len(edge_rows),
            "selected_buildings_count": len(selected_nodes),
        },
        "search_component": {
            "algorithm": "A*",
            "state": "(current_node, remaining_required_visits)",
            "actions": "move to adjacent node",
            "goal": f"visit required nodes then end at {goal_node}",
            "start_node": start_node,
            "required_nodes": sorted(required_visit_nodes),
            "path": path,
            "sustainability_aware_cost": round(sustainability_cost, 3),
        },
        "minimax_component": {
            "players": ["Sustainability Planner (MAX)", "Demand Pressure Agent (MIN)"],
            "evaluation": "sustainability_bonus - energy_penalty over controlled nodes",
            "depth_limit": 3,
            "best_opening_action": minimax_action,
            "evaluation_score": round(minimax_score, 3),
        },
        "csp_component": {
            "variables": csp_variables,
            "domain": ["NONE", "RECYCLE_BIN", "COMPOST_HUB", "BIKE_SUPPORT"],
            "constraints": [
                "max 5 non-NONE placements",
                "all priority nodes must receive a resource",
                "at least 2 high-energy nodes must receive a resource",
                "at most 2 COMPOST_HUB placements",
            ],
            "valid_assignment": csp_solution,
        },
        "integrated_awareness": awareness,
        "deliverable_2_monte_carlo": monte_carlo,
    }

    output_path = OUTPUT_DIR / "example_run.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    monte_carlo_output_path = OUTPUT_DIR / "deliverable2_monte_carlo.json"
    monte_carlo_output_path.write_text(json.dumps(monte_carlo, indent=2), encoding="utf-8")

    print(f"{GAME_NAME} executed.")
    print(f"Output written to: {output_path}")
    print(f"A* path: {' -> '.join(path)}")
    print(f"A* sustainability-aware cost: {round(sustainability_cost, 3)}")
    print(f"Minimax best opening action: {minimax_action} (score {round(minimax_score, 3)})")
    print(f"Monte Carlo runs: {monte_carlo['runs']}")
    print(
        "Sustainable strategy average cost:",
        monte_carlo["strategies"]["sustainability_aware_a_star"]["metrics"]["average"],
    )
    print(
        "Distance-first strategy average cost:",
        monte_carlo["strategies"]["distance_first_route"]["metrics"]["average"],
    )
    print(f"Monte Carlo output written to: {monte_carlo_output_path}")


if __name__ == "__main__":
    main()
