# Tommie EcoOps: Campus Grid

UST campus sustainability game for **CISC 440 — Artificial Intelligence**. The project combines classical AI (search, minimax, CSP) with real campus data and a Monte Carlo “what if” simulation under uncertainty.

## Project Overview

| Deliverable | Description | Location |
|---|---|---|
| **Deliverable 1** | Interactive sustainability game (A*, minimax, CSP, awareness) | `src/main.py`, `tommie_eco/` |
| **Deliverable 2** | Monte Carlo simulation comparing route strategies under uncertainty | `src/main.py`, [`deliverables/deliverable2/`](deliverables/deliverable2/) |

Reports, instructions, and JSON outputs are organized under [`deliverables/`](deliverables/).

## Repository Structure

```
├── data/                          # UST campus datasets (CSV + vocabulary)
├── src/
│   ├── main.py                    # Python backend: D1 game + D2 Monte Carlo
│   └── ust_campus_map_plot.py     # Optional campus map visualization
├── tommie_eco/                    # Next.js frontend game UI
├── deliverables/
│   ├── deliverable1/              # D1 instructions, report template, walkthrough
│   └── deliverable2/              # D2 Monte Carlo report + output JSON
└── README.md
```

## What the Game Does

**Tommie EcoOps: Campus Grid** is a campus sustainability strategy game on the UST building graph.

- Move between buildings on a real campus network.
- Balance route efficiency with sustainability impact using dataset-driven costs.
- Compete and plan resources through three AI components plus awareness gates.

### AI Components (Deliverable 1)

| Component | Role |
|---|---|
| **A\*** | Plans routes from start → goal while visiting required sustainability stops |
| **Minimax (α–β)** | Planner (MAX) vs demand-pressure agent (MIN) over campus nodes |
| **CSP** | Assigns limited resources (`RECYCLE_BIN`, `COMPOST_HUB`, `BIKE_SUPPORT`) under constraints |
| **Awareness** | Vocabulary + sustainability trivia gate actions and modify bonuses/penalties |

### Monte Carlo (Deliverable 2)

Replays planned routes **300 times** with dataset-grounded randomness:

- Travel congestion (`distance × uniform(0.9, 1.8)`)
- Energy demand spikes (`energy_penalty × uniform(0.8, 1.5)`)
- Variable resource effectiveness (`bonus × uniform(0.7, 1.2)`)
- Probabilistic action success/failure per building

**Strategies compared:**

1. **Sustainability-aware A\*** — full mission, plans with energy + green bonuses  
2. **Distance-first targeted route** — fewer stops, minimizes travel distance  

See [`deliverables/deliverable2/Deliverable2_Monte_Carlo.md`](deliverables/deliverable2/Deliverable2_Monte_Carlo.md) for full analysis.

## Datasets

All behavior is driven by UST data in `data/` (and mirrored in `tommie_eco/public/` for the web app):

- `ust_selected_game_nodes.csv`
- `ust_building_edges.csv`
- `ust_distance_matrix.csv`
- `ust_energy_assets.csv`
- `ust_campus_resources.csv`
- `ust_sustainability_factors.csv`
- `sustainability_words (2).txt`

## Run

### Python backend (game + Monte Carlo)

```bash
python3 src/main.py
```

**Output:**

- `deliverables/deliverable2/output/example_run.json` — full game + Monte Carlo results  
- `deliverables/deliverable2/output/deliverable2_monte_carlo.json` — Monte Carlo summary only  

Code walkthrough: [`deliverables/deliverable1/MAIN_PY_WALKTHROUGH.md`](deliverables/deliverable1/MAIN_PY_WALKTHROUGH.md)

### Web frontend

```bash
cd tommie_eco
npm install    # first time only
npm run dev
```

Open **http://localhost:3000**

## Deliverables Folder

| Path | Contents |
|---|---|
| [`deliverables/deliverable1/`](deliverables/deliverable1/) | Canvas instructions, report template, `main.py` walkthrough |
| [`deliverables/deliverable2/`](deliverables/deliverable2/) | Monte Carlo report, short summary, JSON outputs |

## Submission Checklist

**Deliverable 1**

- [ ] Console output from `python3 src/main.py`
- [ ] `deliverables/deliverable2/output/example_run.json`
- [ ] Explanation of how datasets affect behavior
- [ ] Trade-off reflection (shortest vs sustainable route, planner vs pressure)

**Deliverable 2**

- [ ] [`Deliverable2_Monte_Carlo.md`](deliverables/deliverable2/Deliverable2_Monte_Carlo.md) (or [`Deliverable2_Report.md`](deliverables/deliverable2/Deliverable2_Report.md) summary)
- [ ] `deliverables/deliverable2/output/deliverable2_monte_carlo.json`
- [ ] Two strategies compared, 300+ runs, uncertainty explained

## Team

University of St. Thomas — CISC 440 Sustainability Game Project
