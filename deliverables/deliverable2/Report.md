# Deliverable 2 Report — Monte Carlo Simulation

**Course:** CISC 440 — Artificial Intelligence (Spring 2026)  
**System:** Tommie EcoOps: Campus Grid (Deliverable 1 extension)

---

## Objective

Turn the campus game into a **“what if” decision system**: run **300 simulations** with dataset-grounded randomness and compare route strategies under uncertainty.

**Core question:** *Which route strategy is more reliable — sustainability-aware A* or distance-first targeted routing?*

---

## 1. Simulation Description

Each run = **one uncertain campus planning cycle** (start Frey Hall → visit objectives → end Anderson).

- Paths are planned once per strategy (Deliverable 1 A*)
- Each of 300 runs **re-executes** the same path with new random congestion, energy, and action outcomes

| Deliverable 1 piece | Role in Monte Carlo |
|---|---|
| `ust_building_edges.csv` | Graph distances |
| `ust_energy_assets.csv` | `energy_penalty` per node |
| `ust_campus_resources.csv` | `sustainability_bonus` per node |
| A* planner | Plans Strategy A route |
| Awareness gate | Modifies bonuses/penalties before simulation |

---

## 2. Strategies Compared

### Strategy A: Sustainability-Aware A*

- Visits **OEC + KochCommons**
- Plans with energy penalties and sustainability bonuses
- Path: `FreyHall → Library → OSS → OEC → OSS → KochCommons → Anderson`

### Strategy B: Distance-First Targeted

- Visits **OEC only** (highest-energy required node), minimizes distance
- Ignores sustainability scoring during planning
- Path: `FreyHall → Library → OSS → OEC → OSS → Anderson`

| Dimension | Strategy A | Strategy B |
|---|---|---|
| Objectives | 2 | 1 |
| Uses green/energy data in planning | Yes | No |
| Philosophy | Full mission coverage | Fewer stops, lower travel |

---

## 3. Modeling Uncertainty

Randomness is applied **on top of dataset values** (never arbitrary).

| Type | Formula |
|---|---|
| Travel / congestion | `distance × 1000 × uniform(0.9, 1.8)` |
| Energy variation | `energy_penalty × uniform(0.8, 1.5)` |
| Resource effectiveness | `sustainability_bonus × uniform(0.7, 1.2)` |
| Action success | `random() < clip(0.45 + 0.08×bonus − 0.04×energy, 0.25, 0.9)` |

**Why realistic:** foot traffic delays, variable building load, inconsistent recycling/compost success, and actions that sometimes fail.

---

## 4. Simulation Runs

- **300 runs** (meets 200+ requirement)
- Per run: walk each edge, sample stochastic step cost, sum total route cost

---

## 5. Results and Metrics

From `output/deliverable2_monte_carlo.json`:

| Metric | Sustainability-Aware A* | Distance-First |
|---|---:|---:|
| **Average cost** | 6.730 | 6.413 |
| **Best case** | 4.974 | 4.497 |
| **Worst case** | 8.705 | 8.685 |
| **Std dev** | 0.793 | 0.975 |
| **Win rate (lower cost)** | 40.33% | 59.67% |

- Average cost gap (B − A): **−0.317**
- Deterministic D1 cost for Strategy A path: **4.546** → averages **6.73** under uncertainty

### Visualization

```
Average cost:
  Sustainable A*  ████████████████████████████████  6.73
  Distance-first  ██████████████████████████████    6.41
                  0    2    4    6    8

Range:
  Strategy A:  best=4.97  avg=6.73  worst=8.71
  Strategy B:  best=4.50  avg=6.41  worst=8.69
```

---

## 6. Analysis

| Goal | Better strategy |
|---|---|
| Lowest average / best / worst cost | Distance-first (slightly) |
| Stability (std dev) | Sustainability-aware (0.793 vs 0.975) |
| Mission completeness | Sustainability-aware (2 objectives) |
| Wins head-to-head | Distance-first ~60% of runs |

**Insights:**

- With similar paths, cost gaps are smaller than when strategies skipped different stops — uncertainty dominates.
- A single deterministic “good” route (4.546) can average ~6.7 when replayed under random campus conditions.
- Monte Carlo exposes **variability and worst-case risk**, not just one lucky run.
- Trade-off: full mission coverage vs marginal cost savings and occasional wins on bad days.

---

## 7. Code and Output

| Item | Location |
|---|---|
| Simulation code | `src/main.py` (`# Deliverable 2`) |
| Run | `python3 src/main.py` |
| Full output | `output/example_run.json` |
| Monte Carlo summary | `output/deliverable2_monte_carlo.json` |

---

## 8. Connection to Deliverable 1

Monte Carlo is a **game replay engine**: the same A* routes from Deliverable 1 are stress-tested when congestion spikes, energy demand varies, and green actions fail. Strategies come directly from the game design (full sustainable route vs targeted minimal route).

---

## 9. Checklist

- [x] Dataset-grounded randomness
- [x] Two strategies compared
- [x] 300 simulation runs
- [x] Average, best, worst, variability reported
- [x] Analysis and system connection
- [x] Code + JSON output
