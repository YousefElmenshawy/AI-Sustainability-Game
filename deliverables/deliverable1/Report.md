# Deliverable 1 Report — Tommie EcoOps: Campus Grid

**Course:** CISC 440 — Artificial Intelligence (Spring 2026)

---

## 1. Problem Design

- **Game/System Name:** Tommie EcoOps: Campus Grid
- **State definition(s):**
  - Search: `(current_node, remaining_required_visits)`
  - Minimax: control map over strategic nodes (`+1`, `-1`, `0`)
- **Action definition(s):**
  - Search: move to an adjacent campus node
  - Minimax: claim one neutral node
  - CSP: assign one resource value to each variable node
- **Goal / terminal conditions:**
  - Search goal: visit required sustainability nodes and end at target
  - Minimax terminal: depth limit reached or no neutral nodes remain

## 2. Graph Representation

- **Nodes:** named UST locations/buildings from campus map data
- **Edges:** valid movement paths with distances from `data/ust_building_edges.csv`
- **Connectivity:** distant buildings are reachable only through intermediate nodes (local adjacency)

## 3. Dataset Integration

| Dataset | Role in game |
|---|---|
| `ust_selected_game_nodes.csv` | Playable campus subset |
| `ust_building_edges.csv` | Graph edges and movement costs |
| `ust_distance_matrix.csv` | A* heuristic distances |
| `ust_energy_assets.csv` | Energy pressure penalties per building |
| `ust_campus_resources.csv` | Sustainability bonuses; CSP context |
| `ust_sustainability_factors.csv` | Trivia content and awareness gate values |
| `sustainability_words (2).txt` | Vocabulary gate for advanced actions |

## 4. AI Method Implementation

### A. Search and Minimax

| Component | Implementation |
|---|---|
| **Search** | A* with state `(current_node, remaining_required_visits)` |
| **Heuristic** | Matrix distance to nearest remaining task + distance to goal |
| **Movement cost** | `distance×1000 + energy_penalty − sustainability_bonus` |
| **Minimax** | Sustainability Planner (MAX) vs Demand Pressure Agent (MIN), depth 3 |
| **Evaluation** | Controlled-node sustainability bonuses minus energy penalties |
| **Pruning** | Alpha-beta in both max and min recursion |

**Sample run (deterministic):**

- Path: `FreyHall → Library → OSS → OEC → OSS → KochCommons → Anderson`
- Sustainability-aware cost: **4.546**
- Minimax best opening: **FreyHall** (score 6.5)

### B. CSP Component

| Item | Detail |
|---|---|
| **Variables** | Anderson, FreyHall, OEC, OSS, Schoenecker, Murray, Library, Brady |
| **Domain** | `NONE`, `RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT` |
| **Constraints** | ≤5 non-NONE placements; all priority nodes served; ≥2 high-energy nodes served; ≤2 compost hubs |

## 5. Integrated Sustainability Awareness

- Vocabulary attempt must match a valid sustainability term
- Sustainability factor trivia must be answered correctly
- Both must pass for the resource action to succeed
- **Pass:** extra bonuses on Anderson and FreyHall
- **Fail:** extra energy penalty on OSS
- Awareness directly changes search costs and minimax scoring (not a separate quiz)

## 6. Implementation (`src/main.py`)

| Module | Functions |
|---|---|
| Data / graph | `load_csv`, `build_graph`, `load_distance_matrix` |
| Scoring | `energy_penalty_by_graph_node`, `sustainability_bonus_by_graph_node` |
| Search | `SearchState`, `movement_cost`, `a_star_task_planner` |
| Minimax | `minimax_opening_action` |
| CSP | `solve_resource_csp` |
| Awareness | `awareness_gate` |

**Execution flow in `main()`:**

1. Load datasets from `data/`
2. Build graph and distance lookup
3. Compute energy penalties and sustainability bonuses
4. Run awareness gate and apply modifiers
5. Run A*, minimax, and CSP
6. Write `../deliverable2/output/example_run.json`

## 7. Code and Execution

```bash
python3 src/main.py
```

**Output:** `deliverables/deliverable2/output/example_run.json`

**Frontend (optional):** `cd tommie_eco && npm install && npm run dev`

## 8. Reflection

- **Design decisions:** Single integrated pipeline ties search, adversarial play, and resource placement to the same campus graph and datasets.
- **What worked well:** Dataset-driven penalties/bonuses make routes and minimax scores explainable from real UST assets.
- **Improvements:** Interactive awareness input (currently simulated), more gameplay tuning of heuristic weights, automated constraint validation tests.

## 9. Checklist

- [x] Uses real dataset values
- [x] Includes search (A*) and minimax
- [x] Includes CSP component
- [x] Components interact in one `main()` pipeline
- [x] Sustainability awareness affects gameplay decisions
