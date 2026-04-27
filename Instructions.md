Deliverable 1
Deliverable 1: Sustainability Game Development
(Search, Minimax, CSP and Integrated Awareness)
Objective
In this deliverable, you will design and implement two interactive sustainability-themed games that demonstrate how AI agents make decisions in structured, competitive, and constrained environments. Your system must combine classical AI techniques such as search, minimax, and constraint satisfaction with real-world sustainability modeling based on the University of St. Thomas campus. In addition, sustainability awareness must be embedded directly into gameplay through decision-making, not as a separate quiz or standalone activity.

 

Your work must use datasets, show AI reasoning, and integrate sustainability into gameplay.

You may build:
- Two separate games, OR
- One integrated system that clearly includes search, minimax, and CSP components


Game Structure and Core Expectation
You must build two games. At least one game must strongly emphasize a core classical AI method such as search or minimax. At least one game must include a constraint satisfaction component. Across your two games, sustainability awareness must be integrated into the actual gameplay. This means that sustainability knowledge, represented through embedded trivia or vocabulary prompts, should directly affect what actions are available, whether actions succeed, how much they cost, or how the score changes.

Your game should not feel like “a normal game plus a separate quiz.” Instead, the sustainability knowledge must matter as part of the system itself. A correct answer might unlock an action, reduce a penalty, strengthen a resource, or improve a path. An incorrect answer might increase energy consumption, fail a placement action, reduce a score, or strengthen the opponent’s position.

Search-Based Game Options
If your game is based on search, your system should focus on how an agent explores a state space to reach a goal efficiently. You should clearly define the state, actions, goal test, path cost, and if needed, a heuristic. Your search game should not only find a path, but should find a path that is meaningful in terms of sustainability.

Possible search-based game ideas include:

UST Energy Navigator

In this game, the goal is to help an agent find the most sustainable route between two campus buildings. The agent starts at a given location and must reach a target building while considering both distance and environmental impact. Students should define the state as the current building and allow actions that move the agent to neighboring buildings using the campus graph. The path cost should not be based only on distance; instead, students should incorporate sustainability by adding penalties for high-energy buildings and providing bonuses for energy-efficient or LEED-certified locations. A heuristic such as straight-line distance to the goal can be used for A* search. The key idea is to show that the shortest path is not always the best path when sustainability is considered.

Files needed: ust_selected_game_nodes (game locations), ust_building_edges (graph connections), ust_distance_matrix (distance and heuristic), ust_energy_assets (energy-related penalties/bonuses), ust_sustainability_factors (optional scoring context),

Green Route Rescue

In this game, the player or agent must reach an emergency location on campus while minimizing environmental impact. The agent begins at a random or predefined building and must quickly navigate to a target location such as a student center or health-related facility. Students should model the state as the current building and allow movement through connected nodes. The path cost should include travel distance, but also incorporate sustainability by penalizing routes through energy-heavy or congested areas and rewarding paths that pass through greener or more efficient locations. A heuristic such as distance to the emergency location can guide search. Students are encouraged to compare the fastest route with the most sustainable route and discuss the trade-offs.

Files needed: ust_selected_game_nodes, ust_building_edges, ust_distance_matrix, ust_energy_assets (penalties for energy-heavy areas), ust_campus_resources (optional for emergency/service locations)

Eco Delivery Planner

In this game, the agent must deliver supplies to multiple campus locations while minimizing total travel and environmental cost. The state should include both the current location and the list of remaining delivery points. The agent can move between connected buildings and complete deliveries when reaching the correct location. The path cost should include total distance traveled and incorporate sustainability by rewarding efficient routes and penalizing unnecessary movement. Students should consider how the order of visiting locations affects the total cost and may use heuristics such as the distance to the nearest remaining delivery point. This game highlights the importance of planning and optimization in real-world logistics with sustainability considerations.

Files needed: ust_selected_game_nodes, ust_building_edges, ust_distance_matrix, ust_campus_resources (delivery locations), ust_energy_assets (optional sustainability cost adjustments)

Campus Compost Collector

In this game, the agent must collect compost or recycling materials from priority campus locations in the most efficient way. The state should include the current location and the set of locations that have already been collected. The agent moves through the campus graph and collects items at designated nodes. The path cost should include travel distance and incorporate sustainability by prioritizing high-impact compost or recycling locations, such as dining or residential buildings. Students can design heuristics based on the number of remaining locations or distance to the nearest unvisited site. The focus of this game is on efficient coverage of important locations while avoiding unnecessary travel.

Files needed: ust_selected_game_nodes, ust_building_edges, ust_distance_matrix, ust_campus_resources (compost/recycling locations), ust_sustainability_factors (optional for scoring importance)

Pollinator Path Explorer

In this game, the agent explores environmentally important locations across campus, such as green spaces or pollinator-supporting areas, while maintaining efficient travel. The state should include the current location and the set of visited important locations. The goal is to visit all required environmentally significant nodes. Students should define movement using the campus graph and design a path cost that balances distance with sustainability benefits, such as rewarding visits to green spaces or environmentally supportive areas. A heuristic can guide the agent toward the nearest unvisited important location. This game emphasizes environmental awareness while maintaining efficient navigation.

Files needed: ust_selected_game_nodes, ust_building_edges, ust_distance_matrix, ust_campus_resources (green spaces, pollinator areas), ust_sustainability_factors (for environmental importance and scoring)

UST Sustainable Campus Explorer (Example)
 In this game, I design an AI agent that moves across the UST campus to complete sustainability tasks efficiently. For example, I may start my agent at Frey Hall, and assign it tasks such as collecting compost from Binz Refectory, delivering supplies to Anderson Student Center, and visiting a green space like Chapel Lawn, then returning to a final location. I also make my system general, so I can input any starting building and any goal building, not just fixed ones. My goal is not just to find the shortest path, but to find a path that is more sustainable.

I define my state as the current building and remaining tasks. For example, I may start with:
(Frey Hall, {Binz, Anderson, Chapel}).
When the agent reaches Binz and collects compost, the state updates to:
(Binz, {Anderson, Chapel}).
The agent can move to any neighboring building using the campus graph built from the selected nodes, edges, and distance files.

For the cost function, I use distance but also include sustainability. For example, if the agent goes through a high-energy building, I increase the cost. If it visits Binz (compost) or Chapel (green space), I reduce the cost. Because of this, the agent may choose a slightly longer route if it is more environmentally friendly.

I solve this using A* search with a heuristic such as distance to the next task. When I compare this with a shortest-path approach, I can clearly show that the best solution is not always the shortest path, but the one that balances movement and sustainability.

 

Minimax and Alpha-Beta Game Options
If your game is based on minimax, then your system should model competition between two agents with opposing goals. One agent might try to improve sustainability while the other increases energy use, waste, or inefficiency. You must define the game state, available actions, turn structure, terminal conditions, and most importantly, the evaluation function. If you use alpha-beta pruning, you should explain how pruning helps reduce unnecessary exploration.

Possible minimax game ideas include:

Recycling Wars: UST Edition
In this game, two agents compete over sustainability on campus. One player tries to expand sustainability infrastructure such as recycling bins, compost stations, and green resources, while the other player tries to increase consumption and inefficiency. The game state can include the current condition of buildings (sustainable vs high-consumption) and available resources. Each turn, players choose actions such as adding sustainability resources or increasing demand in certain buildings. The game ends after a fixed number of turns or when all buildings are assigned a state. The evaluation function should measure sustainability coverage minus energy or waste impact. Students should use minimax to model the competition and can apply alpha-beta pruning to reduce unnecessary exploration. The key idea is to show long-term strategic thinking rather than short-term gains.

Files needed: ust_selected_game_nodes (game locations), ust_campus_resources (recycling, compost, resource placement), ust_energy_assets (important/high-impact buildings), ust_sustainability_factors (scoring function design)

Sustainability Showdown
In this game, two players compete to control campus sustainability metrics such as energy use, waste management, and resource allocation. The game state includes building conditions, available resources, and current scores. Each turn, one player improves sustainability (e.g., adds green resources or reduces energy use), while the other player increases waste or demand. The game progresses turn by turn, and the evaluation function should combine multiple factors such as energy efficiency, waste reduction, and resource coverage. Students should use minimax to determine optimal strategies and explain how alpha-beta pruning improves efficiency. The focus should be on balancing multiple sustainability factors over time.

Files needed: ust_selected_game_nodes, ust_campus_resources (resource and waste locations), ust_energy_assets (energy-related importance), ust_sustainability_factors (multi-factor scoring system)

In this game, one agent tries to reduce the campus carbon footprint while the opposing agent tries to maximize convenience and short-term gains. The game state can include building energy levels, resource usage, and environmental impact scores. Players take turns modifying building conditions or routing resources. The evaluation function should reflect carbon footprint, where one player tries to minimize it and the other tries to increase it. Students should clearly define terminal conditions and show how minimax selects optimal actions. Alpha-beta pruning should be used to improve performance. The key idea is to demonstrate the conflict between sustainability and convenience.

Files needed: ust_selected_game_nodes, ust_energy_assets (energy-heavy vs efficient buildings), ust_sustainability_factors (carbon and sustainability scoring), ust_campus_resources (optional for resource effects)

In this game, one player defends energy-efficient hubs on campus while the other player tries to overload them by increasing demand. The game state includes which buildings are protected, overloaded, or neutral. Each turn, the defender can strengthen sustainable buildings, while the attacker increases pressure on key nodes. The evaluation function should reward maintaining efficient hubs and penalize overloads. Students should use minimax to simulate the interaction and apply alpha-beta pruning to improve efficiency. The focus is on protecting critical infrastructure over multiple turns.

Files needed: ust_selected_game_nodes, ust_energy_assets (identify critical energy hubs), ust_sustainability_factors (evaluation scoring), ust_campus_resources (optional for defense mechanisms)

Eco Campus Strategy Game, 

In this game, two players take turns modifying campus conditions such as energy usage, resource availability, and sustainability coverage. The game state includes building status, resource allocation, and environmental metrics. Each turn changes the system, and the evaluation function must consider long-term sustainability rather than immediate benefits. Students should design a clear turn structure, define actions, and use minimax to determine optimal strategies. Alpha-beta pruning should be explained and used to reduce computation. This game emphasizes strategic planning over multiple steps.

Files needed: ust_selected_game_nodes, ust_campus_resources, ust_energy_assets, ust_sustainability_factors

CSP Game Options
At least one part of your system must include a constraint satisfaction component. This does not need to be a completely separate game, but it must be clearly represented. In this component, you should define variables, domains, and constraints, then show how a valid solution is found.

Possible CSP-inspired game ideas include:

UST Resource Planner

In this CSP-based game, I assign sustainability resources such as recycling bins, compost stations, or refill stations to campus buildings while satisfying coverage constraints. The variables represent buildings, and the domain represents whether a resource is placed or not. The constraints ensure that all important buildings are covered, budget limits are not exceeded, and resources are not placed too close to each other. A valid solution is one where all constraints are satisfied. Students should clearly define variables, domains, and constraints, and demonstrate how a solution is found using a CSP approach.

Files needed: ust_selected_game_nodes, ust_campus_resources (types of resources), ust_sustainability_factors (coverage importance)

Solar Placement Challenge 

In this game, I assign solar support or energy improvements to selected buildings. The variables represent buildings, and the domain represents whether solar support is assigned. Constraints may include budget limits, number of installations, and prioritization of high-energy buildings. The goal is to maximize impact while satisfying constraints. Students should clearly define the CSP formulation and show how a valid assignment is reached.

Files needed: ust_selected_game_nodes, ust_energy_assets (high-energy buildings), ust_sustainability_factors (energy goals and priorities)

Zero-Waste Campus Planner

In this game, I place waste and recycling stations across campus so that all important buildings are supported. Variables represent locations, and domains represent placement decisions. Constraints ensure coverage (each building must be served), spacing (no overcrowding), and limited resources. A valid solution satisfies all constraints while maximizing coverage. This game highlights constraint-based planning in sustainability.

Files needed: ust_selected_game_nodes, ust_campus_resources (waste and recycling info), ust_sustainability_factors (waste reduction goals)

Smart Hub Allocation
In this game, I assign limited sustainability resources (such as EV stations, compost hubs, or green spaces) to the most impactful campus locations. Variables represent locations, domains represent resource assignment, and constraints include limited supply and coverage requirements. The goal is to allocate resources efficiently without violating constraints. Students should clearly demonstrate constraint satisfaction and reasoning.

Files needed: ust_selected_game_nodes, ust_campus_resources, ust_energy_assets, ust_sustainability_factors

Green Coverage Builder

In this game, I ensure that all required campus locations are covered by sustainability services while respecting constraints such as budget and spacing. Variables represent buildings, domains represent service assignment, and constraints ensure full coverage without overlap or overuse of resources. The goal is to find a valid assignment that satisfies all constraints. This game emphasizes feasibility rather than optimization.

Files needed: ust_selected_game_nodes, ust_campus_resources, ust_sustainability_factors

 

Integrated Trivia and Vocabulary Requirement
Sustainability awareness must be embedded into gameplay. This means that your game should use sustainability knowledge as part of the action system, not as an isolated activity. You already have two useful content files for this purpose: the sustainability trivia document and the sustainability word list .

The trivia content should be used during gameplay at meaningful moments. For example, when a player tries to place a recycling bin, unlock a building, reduce a building’s energy cost, or strengthen a sustainability hub, the system may ask a campus sustainability question. A correct answer may let the action succeed or give a bonus. An incorrect answer may fail the action, increase cost, or strengthen the opponent. In this way, the player’s sustainability knowledge becomes part of the state transition.

The word list can also be integrated into gameplay rather than shown as a separate vocabulary test. For example, certain advanced actions could require forming or recognizing sustainability terms, unlocking efficient infrastructure with the right concept, or matching ideas such as carbon footprint, composting, or green energy to the correct gameplay effect. This makes the awareness component feel natural inside the system.

Detailed Integrated Example: Eco Campus Strategy Game
One strong example is a game called Eco Campus Strategy Game. In this game, the campus is modeled as a graph using the selected game nodes CSV. Each node represents a building or area, and edges represent possible movement paths. The player acts as a sustainability planner trying to improve campus conditions, while the AI opponent acts as a resource pressure agent trying to increase energy consumption or weaken sustainability coverage.

The player may move across campus using a search-based system such as A*. The cost of movement is determined by distance and adjusted by the energy assets CSV, so traveling through high-energy buildings may be more expensive than using a greener route. The player’s goal might be to reach certain buildings and place sustainability resources such as recycling bins or support hubs.

When the player attempts to place a recycling bin or activate a sustainability improvement, the action is not automatically granted. Instead, the game presents a sustainability question drawn from the trivia file . For example, if the player wants to improve recycling coverage near a student building, the system may ask which item is accepted in the blue recycling bins. If the player answers correctly, the bin is placed and coverage improves. If the player answers incorrectly, the placement fails and the player loses a turn or receives an energy penalty.

At the same time, the AI opponent uses minimax to decide how to counter the player. The opponent may increase energy burden in a strategic building, block access to a hub, or create higher demand in an already expensive area. The evaluation function can use the sustainability factors CSV and the energy assets CSV to compute a score such as total recycling coverage plus sustainability bonuses minus total energy pressure. Alpha-beta pruning should be used to improve the efficiency of the AI’s decision-making.

The game can also include a CSP-based planning phase where the player must assign a limited number of resources across campus. Here, the player must satisfy constraints such as covering all key nodes, prioritizing high-energy buildings, or not exceeding the resource limit. In this single game, search determines movement, minimax determines competition, CSP determines valid placement, and trivia affects whether actions succeed. This is exactly the kind of integrated system expected in a strong project.

Required Components (Deliverable 1)
Your submission must include the following components:

1. Problem Design
Clearly describe your game or system.

You must define:

States (what represents a situation in your game)
Actions (what the player or agent can do)
Goal condition (for search) OR terminal state (for minimax)
2. Graph Representation (Required)
Your system must use a graph based on the campus.

You must include:

Nodes = campus locations (buildings)
Edges = valid movement paths
You must explain:

What nodes represent
What edges represent
Why some nodes are not directly connected
3. Dataset Integration (Required)
You must use the provided datasets in a meaningful way.

You must:

Use at least 2–3 datasets
Avoid arbitrary values
You must explain:

Which datasets you used
How they affect your system
Examples:

Energy dataset → affects cost
Resources dataset → affects available actions
Sustainability factors → affects scoring or penalties
4. AI Method Implementation (Required)
Your project must include:

A. Search OR Minimax (at least one required)
Option 1: Search-Based System
Define state, actions, goal test
Define path cost
Use an algorithm (BFS, UCS, A*, etc.)
Include heuristic (if using A*)
Option 2: Minimax-Based System
Define players (max vs min)
Define game state and actions
Define terminal condition
Define evaluation function
Optional: Alpha-beta pruning
B. CSP Component (Required)
You must include a constraint satisfaction component.

You must define:

Variables
Domains
Constraints
You must:

Show at least one valid solution
Explain what the CSP represents in your system
5. Integrated Sustainability Awareness (Required)
Sustainability must be part of gameplay.

You must:

Use trivia or vocabulary during gameplay
Make it affect:
Actions
Costs
Success/failure
Scores
Not allowed: A separate quiz with no effect on the system

6. Code and Execution (Required)
You must submit:

Working code
Clear structure and readability
You must include:

Example run(s)
Output or screenshots
7. Explanation and Reflection
You must briefly explain:

Your design decisions
How AI methods are used
How datasets are used
How sustainability is integrated
8. Minimum Expectation Checklist
Your project must:

Use real dataset values (not random-only values)
Include at least one AI method (search or minimax)
Include a CSP component
Show interaction between all components
Be explainable and understandable
 

What a Strong Submission Looks Like
A strong submission will show clear problem formulation, correct use of AI techniques, meaningful use of the provided datasets, and thoughtful integration of sustainability awareness into gameplay. The best projects will feel like complete systems where movement, strategy, resource allocation, and sustainability knowledge all influence each other. The game should not depend on random decisions or disconnected quiz screens. Instead, it should demonstrate intelligent behavior, good design choices, and a clear connection between AI reasoning and campus sustainability.