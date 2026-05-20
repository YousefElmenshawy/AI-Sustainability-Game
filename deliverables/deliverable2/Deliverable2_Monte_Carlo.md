# Deliverable 2: Monte Carlo Simulation
## Tommie EcoOps: Campus Grid — Uncertainty, Strategy, and “What If” Decision Making

**Author:** Michael Rosas Ceronio  
**Course:** CISC 440 — Artificial Intelligence (Spring 2026)  
**System:** Tommie EcoOps: Campus Grid (Deliverable 1 extension)

---

## Objective

This deliverable turns our campus sustainability game into a **“what if” decision system**. Instead of assuming fixed travel costs, energy demand, and action outcomes, we run **300 repeated simulations** with dataset-grounded randomness and compare how two route strategies behave when conditions are unpredictable.

**Core question answered:**  
*Which route strategy is more reliable under uncertainty — a sustainability-aware path or a distance-first targeted path?*

---

## 1. Simulation Description

### What the simulation represents

Each simulation run represents **one uncertain campus planning cycle** (one day on campus):

- Start: **Frey Hall**
- Mission: visit required buildings, then end at **Anderson Student Center**
- During execution, each step faces random congestion, energy spikes, and sustainability action success/failure

We do **not** replan the path every run. Each strategy picks a route once (using Deliverable 1 search), then we replay that route 300 times with different random conditions — like asking: *“If we use this plan every day, how does cost vary?”*

### How it connects to Deliverable 1

| Deliverable 1 component | Dataset | Role in Monte Carlo |
|---|---|---|
| Campus graph | `ust_building_edges.csv` | Walking network and base distances |
| Distance matrix | `ust_distance_matrix.csv` | A* heuristics and travel base cost |
| Energy model | `ust_energy_assets.csv` | Per-building `energy_penalty` (LEED, science, microgrid, etc.) |
| Resources | `ust_campus_resources.csv` | Per-building `sustainability_bonus` (recycling, compost, EV, bikes) |
| Game nodes | `ust_selected_game_nodes.csv` | Playable campus subset |
| Awareness / trivia | `ust_sustainability_factors.csv`, vocabulary file | Modifies bonuses/penalties before simulation |
| A* search | `a_star_task_planner()` in `src/main.py` | Plans Strategy 1 route |
| Minimax + CSP | Same `main.py` run | Still part of full game output; Monte Carlo stress-tests **routes** |

Deliverable 2 is a **game replay engine**: *“What happens if we play this route 300 times under different campus conditions?”*

---

## 2. Strategies Compared (Required)

We compare **two different strategies** from our Deliverable 1 design.

### Strategy A: Sustainability-Aware A* (Balanced / Full Mission)

| Property | Detail |
|---|---|
| **What it does** | Plans using dataset-driven energy penalties and sustainability bonuses |
| **Required visits** | All objectives: `OEC`, `KochCommons` |
| **Planning goal** | Minimize sustainability-aware cost (distance + energy − green credit) |
| **Path** | `FreyHall → Library → OSS → OEC → OSS → KochCommons → Anderson` |
| **Philosophy** | Complete full sustainability mission even if route is longer |

### Strategy B: Distance-First Targeted Route (Aggressive / Minimal Stops)

| Property | Detail |
|---|---|
| **What it does** | Visits only the highest-energy required building, then minimizes distance |
| **Required visits** | `KochCommons` only (skips `OEC`) |
| **Planning goal** | Shortest path with fewest stops |
| **Path** | `FreyHall → Library → KochCommons → Anderson` |
| **Philosophy** | Fast, low-travel plan; trades mission coverage for lower cost |

### How they are different

| Dimension | Strategy A (Sustainable) | Strategy B (Distance-first) |
|---|---|---|
| Objectives visited | 2 (`OEC`, `KochCommons`) | 1 (`KochCommons`) |
| Uses energy/resource data in planning | Yes | No (distance only) |
| Path length | Longer (7 nodes) | Shorter (4 nodes) |
| Best when | Full mission coverage matters | Strict cost/time minimization matters |

This matches the assignment example: **sustainable path vs shortest/targeted path**.

---

## 3. Modeling Uncertainty (Required)

Randomness is applied **on top of dataset values** — never arbitrary standalone numbers.

### Base values from datasets (fixed per building)

- **`energy_penalty[node]`** — from `ust_energy_assets.csv` (e.g., science halls, microgrid, LEED adjustments)
- **`sustainability_bonus[node]`** — from `ust_campus_resources.csv` (recycling, compost, EV, bike infrastructure)
- **`distance`** — from `ust_building_edges.csv` edge weights

### Randomness added each step (Deliverable 2 formulas)

| Type | Formula | Assignment reference |
|---|---|---|
| **Travel / congestion** | `travel_cost = distance × 1000 × uniform(0.9, 1.8)` | Travel cost variation |
| **Energy variation** | `energy_cost = energy_penalty × uniform(0.8, 1.5)` | Energy variation |
| **Resource effectiveness** | `resource_effect = sustainability_bonus × uniform(0.7, 1.2)` | Resource effectiveness (optional) |
| **Action success** | `success = random() < probability` | Action success/failure |

**Success probability** (derived from building signals, not arbitrary):

```
probability = clip(0.45 + 0.08 × sustainability_bonus − 0.04 × energy_penalty, 0.25, 0.9)
```

- Higher **resource availability** → higher success chance  
- Higher **energy pressure** → lower success chance  
- On failure at a resource node → small penalty (+0.6)

### Why this is realistic

| Random factor | Real-world meaning |
|---|---|
| Travel multiplier | Class changes, crowds, weather delays on campus paths |
| Energy multiplier | Variable demand in high-traffic or lab buildings |
| Resource multiplier | Recycling/compost programs work better some days than others |
| Action failure | Sustainability interventions do not always succeed |

### How randomness affects results

- More path steps → more random events → **higher average cost and wider spread**
- Buildings with high `energy_penalty` (e.g., OSS, OEC) → larger spikes when `uniform(0.8, 1.5)` hits high values
- Buildings with high `sustainability_bonus` → sometimes large credits when actions succeed; zero credit when they fail
- Each of 300 runs produces **slightly different total cost** even on the same path

---

## 4. Simulation Runs (Required)

| Requirement | Our implementation |
|---|---|
| Minimum 200 runs | **300 runs** ✓ |
| Recommended 300–500 | **300 runs** ✓ |

**Procedure per run:**

1. Load datasets and build graph (Deliverable 1)
2. Plan fixed path for each strategy
3. For `run = 1 … 300`:
   - Walk each edge on the path
   - Sample stochastic step cost (travel + energy + resource + success)
   - Sum total route cost
4. Aggregate statistics across all runs

---

## 5. Results and Metrics (Required)

**Latest run output** (`output/deliverable2_monte_carlo.json`):

### Comparison table

| Metric | Strategy A: Sustainability-Aware A* | Strategy B: Distance-First |
|---|---:|---:|
| **Average cost** | 6.719 | 3.445 |
| **Best case (lowest cost)** | 4.822 | 2.096 |
| **Worst case (highest cost)** | 8.503 | 5.169 |
| **Variability (std dev)** | 0.796 | 0.718 |
| **Head-to-head win rate** | 0% | 100% |

### Additional comparison metrics

- **Average cost gap** (B − A): **−3.274** (distance-first is cheaper on average)
- **Worst-case gap** (A worst − B worst): **8.503 − 5.169 = 3.334** (sustainable path has higher worst-case exposure)

### Variability interpretation

- Strategy A: higher average **and** higher worst case → more exposure to bad days when visiting more buildings
- Strategy B: lower average, lower worst case, slightly lower std dev → **more stable under uncertainty for raw cost**
- Strategy A still completes **2 objectives** vs **1** for Strategy B — not directly comparable on mission completion

---

## 6. Visualization (Recommended)

### Bar chart — Average cost by strategy

```
Sustainability-Aware A*  ████████████████████████████████  6.72
Distance-First Targeted  ████████████████                  3.45
                         0    2    4    6    8   10
                              Total Cost (lower is better)
```

### Range chart — Best / average / worst

```
Strategy A (Sustainable):  best=4.82  avg=6.72  worst=8.50
Strategy B (Distance):     best=2.10  avg=3.45  worst=5.17
                           |--------|--------|--------|
                           0        3        6        9
```

### Summary table (submission-ready)

| Strategy | Avg | Best | Worst | Std Dev | Objectives Met |
|---|---:|---:|---:|---:|---|
| Sustainability-Aware A* | 6.719 | 4.822 | 8.503 | 0.796 | OEC + KochCommons |
| Distance-First | 3.445 | 2.096 | 5.169 | 0.718 | KochCommons only |

---

## 7. Analysis (Very Important)

### Which strategy performs better?

| Goal | Better strategy | Evidence |
|---|---|---|
| **Lowest average cost** | Distance-first | 3.445 vs 6.719 |
| **Best-case (lucky day)** | Distance-first | 2.096 vs 4.822 |
| **Worst-case (bad day)** | Distance-first | 5.169 vs 8.503 |
| **Stability (std dev)** | Distance-first (slightly) | 0.718 vs 0.796 |
| **Mission completeness** | Sustainability-aware | Visits all required nodes |
| **Sustainability coverage** | Sustainability-aware | Includes OEC + compost-adjacent routing |

**Answer to assignment goals:**

| Question | Answer |
|---|---|
| What happens when conditions change? | Costs spread across a range; same path can cost ~4.8 or ~8.5 depending on congestion/energy/actions |
| Which strategy is more reliable under uncertainty? | **Distance-first** for predictable low cost |
| Which performs best on average? | **Distance-first** |
| Which performs best in worst case? | **Distance-first** (lower worst-case ceiling) |
| Which is more sustainable over time? | **Sustainability-aware** — completes full mission and uses green/energy data in planning |

### Why results differ

1. **Path length:** Strategy A has 6 moves vs 3 for Strategy B → more steps = more random draws
2. **Objectives:** Strategy A must visit `OEC` (higher energy pressure) → more energy variance
3. **Planning:** Strategy A optimizes for sustainability signals; Strategy B ignores them during planning
4. **Trade-off:** Strategy B “wins” cost metrics by skipping `OEC`; Strategy A pays for broader coverage

### Insights learned

- A route that looks good in **one deterministic Deliverable 1 run** (cost 4.546) can average **6.72** under uncertainty
- Monte Carlo reveals hidden risk: worst-case sustainable path (~8.50) is much worse than worst-case short path (~5.17)
- **Objective design matters:** comparing strategies with different mission requirements explains cost gaps — not just randomness
- For campus planners: if the goal is **complete sustainability checkpoints**, pay extra cost; if the goal is **minimum exposure to bad days**, shorter targeted routes win

---

## 8. Code and Output (Required)

### Simulation code

| Location | Contents |
|---|---|
| `src/main.py` | `# Deliverable 2` section: `sample_stochastic_step_cost()`, `monte_carlo_path_cost()`, `run_monte_carlo_comparison()` |
| Run command | `python3 src/main.py` |

### Example output files

| File | Description |
|---|---|
| `output/deliverable2_monte_carlo.json` | Monte Carlo summary (300 runs, both strategies, metrics) |
| `output/example_run.json` | Full Deliverable 1 game + Deliverable 2 results |

### Sample JSON excerpt

```json
{
  "runs": 300,
  "strategies": {
    "sustainability_aware_a_star": {
      "metrics": { "average": 6.719, "best_case": 4.822, "worst_case": 8.503, "std_dev": 0.796 }
    },
    "distance_first_route": {
      "metrics": { "average": 3.445, "best_case": 2.096, "worst_case": 5.169, "std_dev": 0.718 }
    }
  }
}
```

---

## 9. Connection to Your System (Required)

### Deliverable 1 game system

**Tommie EcoOps: Campus Grid** includes:

- **Search (A*):** find sustainable routes across UST buildings
- **Minimax:** planner vs demand-pressure agent on campus nodes
- **CSP:** place recycling/compost/bike resources under constraints
- **Awareness gate:** vocabulary + sustainability trivia affects bonuses

### How strategies come from our design

| Strategy | Origin in our game |
|---|---|
| Sustainability-Aware A* | Default Deliverable 1 route planner using `movement_cost()` with energy + bonus |
| Distance-First Targeted | Alternative player choice: “skip optional stops, get there fast” |

### Game-like framing

> *“Our winning A* path from Deliverable 1 still works — but when we replay it 300 times with congestion spikes and failed green actions, how much does cost vary? Is a shorter route actually safer?”*

This is exactly the **Green Route Stability Test** idea from the assignment.

---

## 10. Minimum Expectation Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Use dataset values (not arbitrary random) | ✓ | `distance`, `energy_penalty`, `sustainability_bonus` from CSVs |
| Compare at least two strategies | ✓ | Sustainability-Aware A* vs Distance-First |
| Meaningful randomness | ✓ | Travel, energy, resource, action success |
| Multiple simulation runs | ✓ | 300 runs |
| Clear explanation and analysis | ✓ | Sections 1–7 above |
| Average / best / worst / variability | ✓ | Table in Section 5 |
| Connection to Deliverable 1 | ✓ | Section 9 |
| Code + example output | ✓ | `src/main.py`, `output/*.json` |

---

## What a Strong Submission Demonstrates

- **Datasets used meaningfully:** energy assets and campus resources drive per-building penalties/bonuses before any random multiplier  
- **Realistic uncertainty:** congestion, demand spikes, variable recycling effectiveness, probabilistic action failure  
- **Clear strategy comparison:** full-mission sustainable path vs minimal-stop distance path  
- **Strong analysis:** cost winner vs mission winner identified; trade-offs explained  
- **Clear system connection:** extension of Tommie EcoOps A* gameplay, not a separate random experiment  

---

## Quick Reference — How to Reproduce

```bash
cd deliverable1_sustainability_game
python3 src/main.py
```

Console prints A* path, minimax action, and Monte Carlo averages.  
Full results: `output/deliverable2_monte_carlo.json`
