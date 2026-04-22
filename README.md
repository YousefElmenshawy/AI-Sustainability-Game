# Deliverable 1 - Tommie EcoOps: Campus Grid

This project now uses one integrated game called **Tommie EcoOps: Campus Grid**.

The single game includes all required AI parts:
- `A*` search for sustainability-aware campus routing
- `Minimax` with alpha-beta pruning for planner vs pressure-agent competition
- `CSP` backtracking for constrained resource placement
- Integrated sustainability awareness using factor-based trivia and vocabulary terms

## What the Game Is (Plain Explanation)

**Tommie EcoOps: Campus Grid** is a campus sustainability strategy game that combines search, adversarial decision-making, and constraint solving in one flow.

- You move through a campus graph of buildings and pathways.
- Your objective is to make progress while balancing route efficiency and sustainability impact.
- The game uses campus datasets (nodes, edges, distance matrix, assets/resources, and sustainability terms/factors) to drive decisions.

The gameplay integrates three AI components:

- **A\*** plans a route from start to goal while considering required sustainability stops and weighted costs.
- **Minimax (alpha-beta)** models competition between two roles:
  - **Planner** (`+1`, maximizing player): tries to claim nodes that improve sustainability outcomes.
  - **Pressure-agent** (`-1`, minimizing player): tries to block or reduce the planner's advantage.
  - Neutral nodes are `0` until claimed.
- **CSP backtracking** assigns limited sustainability resources (for example: `RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT`) to strategic nodes under constraints.

Sustainability awareness is part of game logic, not a separate quiz:

- A player action can require a valid sustainability vocabulary term.
- A sustainability factor check/question can gate whether the action succeeds.
- Successful awareness checks change bonuses/penalties, which then affect search costs and minimax scoring.

This means awareness outcomes directly change strategy and final results.

## Datasets Used

- `data/ust_selected_game_nodes.csv`
- `data/ust_building_edges.csv`
- `data/ust_distance_matrix.csv`
- `data/ust_energy_assets.csv`
- `data/ust_campus_resources.csv`
- `data/ust_sustainability_factors.csv`
- `data/sustainability_words (2).txt`

## Game Design Summary

- **Search state**: `(current_node, remaining_required_visits)`
- **Search actions**: move to any adjacent node in the campus graph
- **Search goal**: visit required sustainability nodes and end at target node
- **Minimax state**: node control assignments (`+1` planner, `-1` pressure, `0` neutral)
- **Minimax terminal condition**: depth limit reached or no actions available
- **CSP variables**: selected strategic campus nodes
- **CSP domain**: `NONE`, `RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT`

## Integrated Awareness in Gameplay

Awareness is part of the transition logic:
- A sustainability vocabulary attempt must match a valid term
- A sustainability factor question must be answered correctly
- Only when both pass does the in-game resource action succeed
- Success modifies the sustainability bonuses used by search and minimax scoring

This means awareness changes action outcomes and scoring directly (not as a separate quiz).

## Run

```bash
python3 src/main.py
```

Need a code-level walkthrough for teammates? See `MAIN_PY_WALKTHROUGH.md`.

The run writes:
- `output/example_run.json` with search/minimax/CSP/awareness results

## What To Show In Submission

- Console output from at least one run
- `output/example_run.json`
- A short explanation of how each dataset changes game behavior
- Reflection on trade-offs (shortest path vs sustainable route, strategic vs immediate gains)
