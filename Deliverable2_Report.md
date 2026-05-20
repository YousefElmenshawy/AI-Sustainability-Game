# Deliverable 2 Report (Submission Summary)

Full detailed write-up: **[Deliverable2_Monte_Carlo.md](./Deliverable2_Monte_Carlo.md)**

This file is a short checklist-aligned summary for Canvas submission.

---

## 1. Simulation Description

- **Represents:** One uncertain campus day / planning cycle on UST  
- **Connection:** Same graph, datasets, and A* planner as Deliverable 1 (Tommie EcoOps: Campus Grid)

## 2. Strategies Compared

| Strategy | Behavior |
|---|---|
| **Sustainability-Aware A*** | Visits OEC + KochCommons; plans with energy/resource data |
| **Distance-First Targeted** | Visits KochCommons only; minimizes travel distance |

## 3. Uncertainty Model

- Travel: `distance × uniform(0.9, 1.8)`
- Energy: `energy_penalty × uniform(0.8, 1.5)`
- Resources: `sustainability_bonus × uniform(0.7, 1.2)`
- Success: `random() < clip(0.45 + 0.08×bonus − 0.04×energy, 0.25, 0.9)`

All base values from `ust_building_edges.csv`, `ust_energy_assets.csv`, `ust_campus_resources.csv`.

## 4. Runs

**300** Monte Carlo simulations (≥ 200 required).

## 5. Results

| Metric | Sustainable A* | Distance-First |
|---|---:|---:|
| Average | 6.719 | 3.445 |
| Best | 4.822 | 2.096 |
| Worst | 8.503 | 5.169 |
| Std dev | 0.796 | 0.718 |

## 6. Visualization

See ASCII charts and tables in `Deliverable2_Monte_Carlo.md` Section 6.

## 7. Analysis

- **Distance-first** wins on average, best, worst, and stability (lower cost).  
- **Sustainability-aware** wins on mission completeness (all objectives).  
- Trade-off: coverage vs cost under uncertainty.

## 8. Code & Output

- Code: `src/main.py` (`# Deliverable 2`)  
- Output: `output/deliverable2_monte_carlo.json`, `output/example_run.json`

## 9. System Connection

Monte Carlo replays Deliverable 1 A* routes with stochastic campus conditions — a game replay / decision-testing engine.

## 10. Checklist

✓ Dataset-grounded randomness  
✓ Two strategies  
✓ 300 runs  
✓ Metrics + analysis  
✓ Code + output  
