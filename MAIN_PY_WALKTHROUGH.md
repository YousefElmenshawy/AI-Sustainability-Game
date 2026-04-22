# `main.py` Walkthrough (Team Coding Guide)

This file explains exactly what is happening in `src/main.py`, in coding order, so teammates can map each requirement to the implementation.

## 1) Data loading and setup

`main.py` starts by defining:

- `ROOT`, `DATA_DIR`, `OUTPUT_DIR`
- `GAME_NAME`
- `GRAPH_TO_DATASET_NAME` (a name mapper so graph node labels match dataset location names)

Helper loaders:

- `load_csv(...)` -> reads CSV rows as dictionaries
- `load_vocabulary_words(...)` -> reads sustainability words text file
- `normalized(...)` -> lowercases/removes non-alphanumeric characters for fuzzy name matching

## 2) Build graph + lookup structures

Core graph helpers:

- `build_graph(edge_rows)`  
  Builds an undirected adjacency list:
  - key: node name
  - value: list of `(neighbor, distance)`

- `load_distance_matrix(rows)`  
  Builds `Dict[(src, dst), distance]` for A* heuristic lookup.

## 3) Convert datasets into score modifiers

Two functions map real campus data to game scoring:

- `energy_penalty_by_graph_node(...)`
  - starts each node at `0.0`
  - adds penalty for high-energy related features (keywords like `science`, `microgrid`, `policy`)
  - subtracts some penalty for greener features (keywords like `leed`, `ev`, `solar`)

- `sustainability_bonus_by_graph_node(...)`
  - starts each node at `0.0`
  - adds bonus based on resource types (`compost`, `recycling`, `green_space`, `bike`, `ev_charging`)

## 4) A* search implementation

State model:

- `SearchState(current, remaining_tasks)`

Cost:

- `movement_cost(...) = distance*1000 + energy_penalty(next) - sustainability_bonus(next)`
- lower cost is better; function keeps a small minimum (`0.0001`) to avoid zero/negative moves

Planner:

- `a_star_task_planner(...)`
  - initializes frontier priority queue
  - uses best-known cost table (`best_cost`)
  - heuristic combines:
    - distance to nearest required remaining task
    - plus distance to final goal
  - goal condition: all required tasks visited and current node is the goal node

## 5) Minimax with alpha-beta

Function:

- `minimax_opening_action(candidate_nodes, energy_penalty, sustainability_bonus, depth=3)`

Representation:

- `0` neutral node
- `+1` planner-controlled
- `-1` pressure-agent-controlled

Logic:

- `eval_state(...)` scores controlled nodes:
  - planner claims add `4 + sustainability_bonus`
  - pressure claims subtract `4 + energy_penalty`
- `max_value` and `min_value` are recursive and include alpha-beta pruning
- returns best first move and score at depth 3

## 6) CSP backtracking

Function:

- `solve_resource_csp(variables, priority_nodes, high_energy_nodes, max_total_resources)`

Domain:

- `NONE`, `RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT`

Constraints enforced:

- at most `max_total_resources` non-`NONE` placements
- at most 2 `COMPOST_HUB`
- every priority node must get non-`NONE`
- at least 2 high-energy nodes must get non-`NONE`

Returns one valid assignment or raises an error if none exists.

## 7) Awareness gate integration

Function:

- `awareness_gate(sustainability_words, factors)`

Current behavior:

- uses a simulated vocabulary attempt (`"Carbon neutral"`)
- uses a simulated trivia answer (`"2035"`) against `carbon_neutrality_target`
- action succeeds only if both pass

Output includes booleans and modifier values that are fed back into game logic.

## 8) Main pipeline (`main()`)

Execution flow:

1. create output directory
2. load all datasets
3. build graph + distance lookup
4. compute energy penalties and sustainability bonuses
5. run awareness gate
6. apply awareness effect:
   - pass -> extra bonus on `Anderson`, `FreyHall`
   - fail -> extra penalty on `OSS`
7. run A* search with required node visits
8. run minimax opening move selection
9. run CSP resource assignment
10. write `output/example_run.json`
11. print key run summaries to console

## 9) Do we need further work?

Short answer: **mostly complete for Deliverable 1**, but there are still good polish items.

You likely already satisfy the minimum checklist if you submit with run evidence.  
Recommended next improvements:

1. **Make awareness interactive**  
   Right now answers are simulated/hardcoded. Let user input answer/term during run for stronger gameplay realism.

2. **Document one sample output in report text**  
   Include the produced A* path, minimax action, and CSP assignment in your report narrative.

3. **Add one small test script**  
   Even a basic validation test (e.g., CSP constraints check) can make the project look more robust.

4. **Optional gameplay tuning**  
   Revisit heuristic/scoring constants (`*1000`, `+4.0`, keyword weights) if you want more explainable balance.

5. **Show screenshots and map evidence**  
   Ensure you include console output and `example_run.json` screenshot(s) in the final submission.

## 10) Quick teammate coding map

- Search/A* code: `SearchState`, `movement_cost`, `a_star_task_planner`
- Minimax code: `minimax_opening_action`
- CSP code: `solve_resource_csp`
- Awareness integration: `awareness_gate` + adjustment block in `main()`
- Final deliverable output: JSON assembly + write at the end of `main()`

