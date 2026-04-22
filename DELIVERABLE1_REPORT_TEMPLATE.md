# Deliverable 1 Report Template

## 1. Problem Design
- **Game/System Name**: `Tommie EcoOps: Campus Grid`
- **State definition(s)**:
  - Search: `(current_node, remaining_required_visits)`
  - Minimax: control map over strategic nodes (`+1`, `-1`, `0`)
- **Action definition(s)**:
  - Search: move to an adjacent campus node
  - Minimax: claim one neutral node
  - CSP phase: assign one resource value to each variable node
- **Goal condition (search) / Terminal condition (minimax)**:
  - Search goal: visit required sustainability nodes and end at target
  - Minimax terminal: depth limit reached or no neutral nodes remain

## 2. Graph Representation
- **Nodes represent**: named UST locations/buildings from campus map data
- **Edges represent**: valid movement paths with distances
- **Why some nodes are not directly connected**: paths represent local adjacency, so distant buildings are reachable only through intermediate nodes

## 3. Dataset Integration
- **Datasets used**:
  - `ust_selected_game_nodes.csv`
  - `ust_building_edges.csv`
  - `ust_distance_matrix.csv`
  - `ust_energy_assets.csv`
  - `ust_sustainability_factors.csv`
  - `ust_campus_resources.csv`
  - `sustainability_words (2).txt`
- **How each dataset affects the game**:
  - `ust_building_edges` and `ust_distance_matrix`: graph moves and A* heuristic
  - `ust_energy_assets`: energy pressure penalties
  - `ust_campus_resources`: sustainability bonuses and CSP context
  - `ust_sustainability_factors`: trivia content and awareness gate values
  - `sustainability_words (2).txt`: vocabulary gate for advanced action unlock

## 4. AI Method Implementation
### A. Search and/or Minimax
- **Search algorithm used**: A*
- **Heuristic (if A*)**: matrix distance to nearest remaining task and final goal
- **Minimax setup (if used)**: Sustainability Planner (MAX) vs Demand Pressure Agent (MIN), depth 3
- **Evaluation function**: controlled-node sustainability bonuses minus energy penalties
- **Alpha-beta pruning usage**: used in both max and min recursion to prune branches

### B. CSP Component
- **Variables**: strategic buildings (`Anderson`, `FreyHall`, `OEC`, `OSS`, `Schoenecker`, `Murray`, `Library`, `Brady`)
- **Domains**: `NONE`, `RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT`
- **Constraints**:
  - max 5 placements with non-`NONE`
  - all priority buildings must receive a resource
  - at least 2 high-energy buildings must receive a resource
  - at most 2 `COMPOST_HUB` placements
- **One valid solution found**: see `output/example_run.json`

## 5. Integrated Sustainability Awareness
- **Trivia integration in gameplay transitions**: a sustainability-factor question gates whether resource action succeeds
- **Vocabulary integration in gameplay transitions**: a valid sustainability term unlocks advanced action capability
- **How awareness changes cost/success/score**: passing both gates applies positive modifiers to bonuses; failing can increase pressure penalties

## 6. Code and Execution
- **How to run**: `python3 src/main.py`
- **Example output file**: `output/example_run.json`
- **Screenshot(s) inserted here**:

## 7. Explanation and Reflection
- **Design decisions**:
- **What worked well**:
- **What you would improve next**:

## 8. Minimum Expectation Checklist
- [ ] Uses real dataset values
- [ ] Includes at least one core AI method (search or minimax)
- [ ] Includes a CSP component
- [ ] Shows interaction between components
- [ ] Sustainability awareness affects gameplay decisions
