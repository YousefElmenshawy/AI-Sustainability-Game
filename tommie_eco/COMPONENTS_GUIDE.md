# Visual Components Guide

## Components Created

### 1. **GameBoard.tsx** (Main Hub)
- Controls game execution
- Tabs for navigating between different views
- Shows "Start Game" button
- Manages game state and results
- **Location:** `src/components/GameBoard.tsx`

### 2. **CampusMap.tsx** (3D Map Visualization)
- Isometric 3D-style campus map
- Shows all buildings with 3D rendering
- Displays A* path with green dashed lines
- Color-coded buildings (green for in-path, other colors for energy/resources)
- Legend showing path, start node, and cost
- **Features:**
  - SVG isometric projection
  - Interactive node positioning
  - Path highlighting
  - Building icons and labels

### 3. **PathVisualizer.tsx** (A* Results)
- Shows the calculated path step-by-step
- Displays algorithm details and state representation
- Shows start node, goal node, required visits
- Lists total cost and path length
- Explains cost function formula
- **Color coding:** Yellow (start), Blue (goal), Orange (required)

### 4. **MinimaxDisplay.tsx** (Strategy Results)
- Shows minimax game state
- Displays both players (MAX and MIN)
- Shows depth limit and alpha-beta pruning
- Displays best opening action and score
- Explains the evaluation function
- Game theory visualization

### 5. **ResourceDisplay.tsx** (CSP Results)
- Shows resource placement grid
- Lists all buildings and their assigned resources
- Shows resource counts (recycling, compost, bikes, etc.)
- Displays all constraints as checkmarks
- Explains CSP formulation
- Resource legend with icons

### 6. **AwarenessChallenge.tsx** (Integrated Learning)
- Shows vocabulary challenge results
- Shows trivia challenge results
- Displays game impact (bonuses/penalties)
- Explains how awareness affects gameplay
- Shows path energy modifier

## UI Components (Shadcn-based)

- **Card** – Container for content sections
- **Button** – Interaction controls
- **Tabs** – Navigation between game phases
- **Badge** – Status indicators

## Color Scheme

- **Green (#22c55e)** – Sustainability, success
- **Blue (#3b82f6)** – Goal nodes, water
- **Orange (#f97316)** – High-energy, warnings
- **Red (#ef4444)** – Danger, high penalties
- **Purple (#8b5cf6)** – Strategy/minimax
- **Cyan (#06b6d4)** – Awareness/learning
- **Yellow (#fbbf24)** – Start node, important
- **Dark slate backgrounds** – Professional gaming aesthetic

## Layout Structure

```
GameBoard (Main Container)
├── Header (Game title)
├── Control Panel (Run Game button)
└── Tabs Container
    ├── Campus Map Tab
    │   └── CampusMap.tsx
    ├── A* Path Tab
    │   └── PathVisualizer.tsx
    ├── Minimax Tab
    │   └── MinimaxDisplay.tsx
    ├── Resources Tab
    │   └── ResourceDisplay.tsx
    └── Awareness Tab
        └── AwarenessChallenge.tsx
```

## Running the Game

```bash
cd /Users/joe/Documents/AI-Sustainability-Game/tommie_eco
npm run dev
```

Then visit `http://localhost:3000` and click "Start Game" to see all visualizations.

## Next Steps

1. **Connect to Real Data**
   - Update GameBoard.tsx to load CSV files
   - Call `runGame()` from the game orchestrator
   - Replace mock data with real results

2. **Add Interactivity**
   - Make awareness challenges interactive (user input)
   - Allow clicking buildings to see details
   - Add play/pause controls

3. **Enhance Visualizations**
   - Add animations for path drawing
   - Add particle effects for placement
   - Add sound effects for actions

4. **Mobile Responsive**
   - Adjust component sizes for mobile
   - Make tabs swipeable
   - Responsive grid layouts
