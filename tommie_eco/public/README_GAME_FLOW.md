# Eco Campus Strategy Game - Complete Game Flow

## 🎮 Game Overview

**Eco Campus Strategy** is an interactive educational game where players compete against an AI opponent to claim sustainable buildings on the University of St. Thomas campus. The game combines strategic gameplay with real campus data and sustainability education through trivia questions.

---

## 🏢 The Campus

- **Real UST Campus Data**: Buildings, distances, and sustainability information from actual campus CSV files
- **20+ Buildings**: Each with unique sustainability value and energy consumption
- **Connectivity Graph**: Buildings are connected by campus paths with realistic distances
- **10 Turns**: Competition spans 10 rounds

---

## 🎯 How to Play

### **Objective**
Maximize your score by strategically claiming high-value sustainable buildings before the AI blocks them.

### **Each Turn**
1. **Move to Adjacent Building** - Navigate the campus graph to a neighboring building
2. **Place Resource** - Choose a sustainability resource (Recycle Bin, Compost Hub, Bike Support)
3. **Answer Trivia** - Correctly answer a sustainability trivia question to confirm your placement
4. **AI Responds** - The AI blocks one building strategically

### **Scoring**

Building values range from **5-25 points** based on sustainability:

| Category | Examples | Points | Indicator |
|----------|----------|--------|-----------|
| 🟢 High Sustainability | Green Lab, LEED, Wellness, Environmental | 23-25 | 🟢 Green |
| 🟢 Moderate Sustainability | Library, Community, Union, Commons | 19-21 | 🟢 Green |
| 🟡 Medium | Chapel, Hall, Center | 14-16 | 🟡 Yellow |
| 🟠 Medium-High Energy | Classrooms, Generic Buildings | 9-11 | 🟠 Orange |
| 🟠 High Energy | Science Labs, Engineering, Brady, Tech | 5 | 🟠 Orange |

**Scoring Formula**:
```
Building Value = (Sustainability Bonus × 4) - (Energy Penalty × 3) + 12
Clamped: 5-25 points
```

**Points Breakdown**:
- **Player Claims Building**: +Building Value (when trivia answered correctly)
- **Player Wrong Answer**: -0, AI gets +5 bonus
- **AI Blocks Building**: +1/3 Building Value (strategic defense)

---

## 🤖 AI Algorithm Architecture

The AI's decision-making process happens in THREE STAGES each turn:

### **Stage 1: CSP (Constraint Satisfaction Problem) - Resource Planning**

**Question**: "Where should sustainability resources be optimally placed on campus?"

**What it does**:
- Analyzes all available buildings
- Solves constraints:
  - Max 5 total resources per game
  - Max 2 compost hubs
  - Resources can't be on blocked buildings
- Determines optimal placement strategy
- Creates a map of buildings → resources

**Output**: Resource placement map used by later stages

```
Example:
Library → RECYCLE_BIN
Green Lab → COMPOST_HUB
Commons → BIKE_SUPPORT
```

---

### **Stage 2: A* (Pathfinding) - Route Planning**

**Question**: "What are the optimal routes to high-value buildings from the AI's current position?"

**What it does**:
- For top 3-5 available buildings, calculates the most efficient paths
- Considers:
  - Distance between buildings
  - Energy penalty of routes (high-energy buildings cost more)
  - Sustainability bonus (green buildings reward you)
  - Resources placed by CSP (collect them along the way)
- Uses **heuristic search** to find optimal routes quickly
- Rank paths by efficiency

**Output**: Multiple path plans with costs and benefits

```
Example:
Path 1: Science Lab → Commons → Green Lab → Library
  Cost: 32 | Collects: RECYCLE_BIN, BIKE_SUPPORT | High-value route

Path 2: Science Lab → Conference Room → Brady Hall
  Cost: 18 | Collects: none | Quick route

Path 3: Science Lab → Library → Green Lab
  Cost: 25 | Collects: COMPOST_HUB | Balanced route
```

---

### **Stage 3: Minimax (Strategic Decision) - Move Selection**

**Question**: "Which building should the AI claim RIGHT NOW to maximize strategic advantage?"

**What it does**:
- Takes the A* path information as context
- **Looks 2 moves ahead** (AI move + player response)
- For each available building, simulates:
  1. AI claims this building
  2. Player plays optimally in response
  3. Evaluates the resulting game state
- Uses **adversarial reasoning** (assumes player plays optimally against AI)
- Uses **alpha-beta pruning** for efficiency
- Selects the move that produces the best game state

**Evaluation Formula**:
```
State Value = (AI-controlled buildings × bonus) - (Player-controlled buildings × penalty)
```

**Output**: Final move decision with strategic reasoning

```
Example Game Tree:
┌─ IF claim Green Lab (23 pts)
│  └─ Player responds with Library (20 pts)
│     └─ State value: +3 (favorable)
│
├─ IF claim Science Lab (5 pts)  
│  └─ Player responds with Green Lab (23 pts)
│     └─ State value: -18 (unfavorable) ❌
│
└─ IF claim Library (20 pts)
   └─ Player responds with Green Lab (23 pts)
      └─ State value: -3 (unfavorable) ❌

DECISION: Claim Green Lab ✓ (best state outcome)
```

---

## 🔄 Complete Turn Flow

```
PLAYER TURN:
1. Choose adjacent building to move to
2. Choose sustainability resource to place
3. Answer trivia question
4. If correct: +Building Value points, resource placed
   If wrong: -0 points, AI +5 bonus points

           ↓ Player action complete

AI TURN (3-Stage Decision Making):
1. CSP analyzes resource placement constraints
2. A* plans optimal routes to top buildings
3. Minimax evaluates which building to claim
4. AI blocks chosen building, receives 1/3 of building value

           ↓ AI action complete, Turn ends

IF turn > 10 → Game Over, show results
ELSE → Next player turn
```

---

## 📊 Game Results Screen

**Displays**:
- **Victory/Defeat Banner** - Who won and final score
- **Score Comparison** - Visual progress bars
- **Algorithm Statistics**:
  - ⚔️ Minimax: Strategic decisions made
  - 🔗 CSP: Constraint validation checks
  - 🗺️ A*: Path plans computed
  - ⏱️ Total Turns: Game length
- **Performance Metrics**:
  - Player score, resources placed, trivia answers
  - AI score, buildings blocked, algorithm usage
- **Algorithm Deep Dive**:
  - Minimax decisions with evaluation scores
  - CSP validations with pass/fail status
  - A* path plans with costs and reasoning
  - Game timeline with all actions

---

## 🧬 Algorithm Integration Summary

| Algorithm | Role | Input | Output | When Used |
|-----------|------|-------|--------|-----------|
| **CSP** | Resource Optimization | Available buildings, constraints | Resource placement map | Every AI turn |
| **A\*** | Route Planning | Campus graph, current position | Path plans with costs | Every AI turn |
| **Minimax** | Strategic Decision | Path plans, available buildings | Final move choice | Every AI turn |

**Flow**: CSP → A* → Minimax (NOT parallel, sequential decision pipeline)

---

## 🏆 Strategic Tips

### For Players
1. **Rush high-value buildings** (23-25 pts) in early turns
2. **Block AI's likely paths** by claiming connecting buildings
3. **Answer trivia correctly** - wrong answers give AI +5 bonus
4. **Consider resource types** - they affect building value

### Understanding AI Strategy
1. **CSP ensures efficiency** - Resources placed where they matter most
2. **A* finds best paths** - AI evaluates all high-value route options
3. **Minimax is defensive** - AI blocks buildings YOU might want
4. **Scoring formula drives decisions** - High-sustainability buildings always priority

---

## 🌱 Building Categories Explained

### 🟢 High Sustainability (23-25 pts)
- **Examples**: Green Lab, LEED Certified, Wellness Center, Environmental
- **Why**: Low energy consumption + high sustainability features
- **Strategic Value**: Always contested

### 🟢 Moderate Sustainability (19-21 pts)
- **Examples**: Library, Community Center, Union, Commons
- **Why**: Balanced energy use with social/educational benefits
- **Strategic Value**: Good safe choices

### 🟡 Medium (14-16 pts)
- **Examples**: Chapel, Hall, Center
- **Why**: Standard buildings, neutral sustainability
- **Strategic Value**: Mid-tier targets

### 🟠 Medium-High Energy (9-11 pts)
- **Examples**: Classrooms, Generic Buildings
- **Why**: Higher energy use, less specialized
- **Strategic Value**: Lower priority

### 🟠 High Energy (5 pts)
- **Examples**: Science Labs, Engineering, Brady Hall, Tech
- **Why**: Intensive energy for research/computing
- **Strategic Value**: Last resort

---

## 📈 Building Value Formula

```typescript
Value = (Sustainability Bonus × 4) - (Energy Penalty × 3) + 12

Examples:
- Green Lab: (4.0 × 4) - (0.2 × 3) + 12 = 24.2 → 24 pts
- Library: (2.5 × 4) - (0.3 × 3) + 12 = 18.9 → 19 pts
- Science Lab: (0.3 × 4) - (4.0 × 3) + 12 = 1.2 → 5 pts (clamped to minimum)
```

---

## 🎓 Educational Components

### Trivia Questions
- **40+ unique questions** on sustainability topics
- Generated from real sustainability vocabulary
- Topics include: renewable energy, carbon footprint, circular economy, conservation, etc.
- **Answer correctly** to place resources
- **Answer wrong** and lose your turn

### Campus Integration
- **Real UST buildings** with actual coordinates
- **Actual building connections** from campus network
- **Real sustainability data** from campus sustainability reports

---

## 🔧 Technical Architecture

- **Frontend**: Next.js + React + TypeScript
- **Styling**: Tailwind CSS
- **Algorithms**: Custom implementations of CSP, A*, and Minimax
- **Data**: Real UST campus data from CSV files
- **Game State**: React hooks for state management

---

## 🎯 Key Takeaways

1. **CSP** ensures resources are placed strategically
2. **A\*** plans efficient routes through high-value buildings
3. **Minimax** makes the final decision considering your response
4. **Dynamic scoring** reflects building sustainability value
5. **Strategic depth** emerges from algorithm interaction

**Result**: An AI opponent that plays intelligently, not just greedily! 🏆

---

## 📝 Game Statistics Tracked

Each game captures:
- ✅ Total player and AI scores
- ✅ Resources placed and buildings blocked
- ✅ Algorithm usage counts (Minimax, CSP, A* calls)
- ✅ All game actions in chronological order
- ✅ Average points per turn for both sides
- ✅ Strategic reasoning for AI decisions

---

## 🚀 How to Play

1. **Start the game** - Wait for campus data to load
2. **Read the board** - See campus map, adjacent buildings, available resources
3. **Choose strategically** - Pick buildings based on value and positioning
4. **Answer trivia** - Sustainability questions validate your placement
5. **Watch AI respond** - See algorithm details in results screen
6. **Compete** - Play multiple rounds to improve strategy!

---

**University of St. Thomas - Eco Campus Strategy Game**  
*Teaching sustainability through strategic AI gameplay*
