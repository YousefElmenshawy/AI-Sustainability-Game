'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { parseCSV } from '@/lib/utils';
import type { BuildingEdge, EnergyAsset, CampusResource, ResourceType, Graph, DistanceMatrix, EnergyPenaltyMap, SustainabilityBonusMap } from '@/lib/types';
import { minimaxOpeningAction } from '@/lib/algorithms/minimax';
import { solveResourceCSP } from '@/lib/algorithms/csp';
import { aStarTaskPlanner } from '@/lib/algorithms/astar';
import { computeIntegratedAIMove, type StrategicMove, calculateBuildingValue } from '@/lib/algorithms/integrated-strategy';

interface Building {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  sustainability_relevance: string;
}

interface GameState {
  turn: number;
  playerPosition: string;
  aiPosition: string;
  playerResources: { [buildingId: string]: ResourceType };
  aiBlocks: { [buildingId: string]: boolean };
  playerScore: number;
  aiScore: number;
  gamePhase: 'loading' | 'playing' | 'trivia' | 'aiTurn' | 'gameOver' | 'results';
  message: string;
  historicalActions: string[];
  gameEnded: boolean;
  winner?: 'player' | 'ai' | 'draw';
  minimaxUses: number;
  cspUses: number;
  astarUses: number;
  algorithmResults: {
    astarPlans: { path: string[]; score: number; taskCount: number }[];
    minimaxDecisions: { bestBuilding: string; score: number; candidateCount: number }[];
    cspValidations: { resource: string; building: string; valid: boolean }[];
  };
  lastAIStrategy?: StrategicMove;
  aiPathPlans?: Array<{ path: string[]; cost: number; reasoning: string }>;
}

interface TriviaQuestion {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: number;
}

export default function EcoCampusStrategyGame() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [campusGraph, setCampusGraph] = useState<{ [key: string]: string[] }>({});
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>(['RECYCLE_BIN', 'COMPOST_HUB', 'BIKE_SUPPORT']);
  const [energyMap, setEnergyMap] = useState<{ [key: string]: number }>({});
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  
  // Algorithm data structures
  const [algorithmGraph, setAlgorithmGraph] = useState<Graph | null>(null);
  const [energyPenaltyMap, setEnergyPenaltyMap] = useState<EnergyPenaltyMap | null>(null);
  const [sustainabilityBonusMap, setSustainabilityBonusMap] = useState<SustainabilityBonusMap | null>(null);
  const [distanceMatrix, setDistanceMatrix] = useState<Map<string, Map<string, number>> | null>(null);
  const [buildingCoordinates, setBuildingCoordinates] = useState<{ [key: string]: { lat: number; lon: number } }>({});

  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    playerPosition: '',
    aiPosition: '',
    playerResources: {},
    aiBlocks: {},
    playerScore: 0,
    aiScore: 0,
    gamePhase: 'loading',
    message: '⏳ Loading game data from UST campus files...',
    historicalActions: [],
    gameEnded: false,
    minimaxUses: 0,
    cspUses: 0,
    astarUses: 0,
    algorithmResults: {
      astarPlans: [],
      minimaxDecisions: [],
      cspValidations: [],
    },
    lastAIStrategy: undefined,
    aiPathPlans: undefined,
  });

  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'move' | 'resource'; target: string; resource?: ResourceType } | null>(null);

  // Load all CSV data on mount
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const [nodesRes, edgesRes, energyRes, resourceRes, wordsRes, distanceRes, coordinatesRes] = await Promise.all([
          fetch('/ust_selected_game_nodes.csv'),
          fetch('/ust_building_edges.csv'),
          fetch('/ust_energy_assets.csv'),
          fetch('/ust_campus_resources.csv'),
          fetch('/sustainability_words (2).txt'),
          fetch('/ust_distance_matrix.csv'),
          fetch('/ust_building_coordinates.csv'),
        ]);

        const nodesText = await nodesRes.text();
        const edgesText = await edgesRes.text();
        const energyText = await energyRes.text();
        const resourceText = await resourceRes.text();
        const wordsText = await wordsRes.text();
        const distanceText = await distanceRes.text();
        const coordinatesText = await coordinatesRes.text();

        // Parse CSV data
        const nodeRows = parseCSV(nodesText) as any[];
        const edgeRows = parseCSV(edgesText) as unknown as BuildingEdge[];
        const energyRows = parseCSV(energyText) as unknown as EnergyAsset[];
        const resourceRows = parseCSV(resourceText) as unknown as CampusResource[];
        const distanceRows = parseCSV(distanceText) as any[];
        const coordinateRows = parseCSV(coordinatesText) as any[];
        
        // Build distance matrix Map
        const distMatrixMap: Map<string, Map<string, number>> = new Map();
        distanceRows.forEach((row: any) => {
          const from = Object.keys(row)[0]; // First column is building name
          if (!distMatrixMap.has(from)) {
            distMatrixMap.set(from, new Map());
          }
          // Set distances to all other buildings
          const fromMap = distMatrixMap.get(from)!;
          Object.entries(row).forEach(([building, distance]: [string, any]) => {
            if (building !== from && distance) {
              fromMap.set(building, parseFloat(distance));
            }
          });
        });
        setDistanceMatrix(distMatrixMap);

        // Build building coordinates map
        const coordMap: { [key: string]: { lat: number; lon: number } } = {};
        coordinateRows.forEach((row: any) => {
          if (row.Building && row.Latitude && row.Longitude) {
            coordMap[row.Building] = {
              lat: parseFloat(row.Latitude),
              lon: parseFloat(row.Longitude),
            };
          }
        });
        setBuildingCoordinates(coordMap);
        
        // Parse sustainability words
        const sustainabilityWords = wordsText
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0);

        // Comprehensive sustainability definitions dictionary (matches words from file)
        const sustainabilityDefs: { [key: string]: string } = {
          'renewable': 'Energy source that naturally replenishes and can be used indefinitely, such as solar or wind power',
          'sustainable': 'Development that meets present needs without compromising the ability of future generations to meet theirs',
          'eco-friendly': 'Products, practices or behaviors designed to cause minimal harm to the natural environment',
          'green energy': 'Electricity or power generated from renewable sources like solar, wind, hydro and geothermal',
          'solar power': 'Energy from the sun converted into heat or electricity using panels or thermal collectors',
          'wind power': 'Electricity generated by capturing the kinetic energy of wind through turbines',
          'hydropower': 'Clean energy produced by harnessing the power of flowing or falling water',
          'geothermal': 'Energy extracted from the Earth\'s internal heat for heating and electricity generation',
          'biodegradable': 'Capable of being decomposed naturally by biological processes into harmless substances',
          'recyclable': 'Material that can be collected, processed and remanufactured into new products',
          'composting': 'Biological decomposition of organic waste into nutrient-rich soil amendment',
          'zero waste': 'Philosophy and lifestyle aimed at sending nothing to landfills through reduction, reuse and recycling',
          'carbon footprint': 'Total amount of greenhouse gases produced directly and indirectly by human activities',
          'carbon neutral': 'When an entity offsets all greenhouse gas emissions it produces, resulting in zero net climate impact',
          'greenhouse gases': 'Atmospheric gases that trap heat and contribute to global warming, including CO2 and methane',
          'climate change': 'Long-term shift in global temperatures and weather patterns primarily caused by human activities',
          'global warming': 'Increase in Earth\'s average surface temperature caused primarily by greenhouse gas emissions',
          'deforestation': 'Large-scale removal of forests, typically to make way for other land uses like agriculture',
          'reforestation': 'Process of planting trees in areas that were recently deforested or naturally lost to fire',
          'afforestation': 'Establishment of forests in areas that were not recently forested through planting or seeding',
          'sustainable agriculture': 'Farming practices that maintain soil health, conserve water and reduce chemical inputs',
          'organic farming': 'Agricultural production system that avoids synthetic pesticides and fertilizers',
          'permaculture': 'Design system mimicking natural ecosystems to create sustainable and productive landscapes',
          'regenerative farming': 'Agriculture that rebuilds soil health and increases biodiversity while producing food',
          'biodiversity': 'Variety of plant, animal and microorganism species within ecosystems and across the planet',
          'ecosystem': 'Community of organisms and their physical environment functioning as an integrated unit',
          'conservation': 'Protection and sustainable management of natural resources and ecosystems',
          'natural resources': 'Materials from the environment used by humans, including water, minerals, forests and wildlife',
          'circular economy': 'Economic model where resources are reused and recycled to minimize waste and maximize value',
          'waste management': 'System for collecting, treating and disposing of waste materials responsibly',
          'sustainable transportation': 'Transport systems that minimize environmental impact, including public transit and biking',
          'electric vehicles': 'Transportation powered by rechargeable batteries instead of fossil fuels',
          'public transit': 'Shared transportation services like buses and trains serving multiple passengers',
          'carpooling': 'Arrangement where multiple people share a single vehicle to reduce emissions',
          'bicycling': 'Human-powered transportation that produces zero emissions and promotes personal health',
          'eco-tourism': 'Responsible travel to natural areas that conserves the environment and supports local communities',
          'sustainable development': 'Progress that balances economic growth with environmental protection and social equity',
          'sustainable cities': 'Urban areas designed to minimize environmental impact while improving quality of life',
          'green architecture': 'Building design that emphasizes energy efficiency, renewable materials and environmental harmony',
          'passive design': 'Building orientation and design that naturally regulates temperature without mechanical systems',
          'energy efficiency': 'Using less energy to provide the same level of service or output',
          'led lighting': 'Light-emitting diode technology that uses 75% less energy than incandescent bulbs',
          'smart grid': 'Electrical grid that uses digital communication to optimize power distribution and reduce waste',
          'water conservation': 'Practices and technologies that reduce water consumption and preserve this vital resource',
          'rainwater harvesting': 'Collection and storage of rainwater for later use in irrigation and household purposes',
          'greywater recycling': 'Reuse of relatively clean wastewater from sinks, showers and washing machines',
          'desalination': 'Process of removing salt from seawater to produce fresh drinking water',
          'sustainable fishing': 'Fishing practices that maintain fish populations and marine ecosystem health',
          'wildlife protection': 'Conservation efforts to preserve animal species and their habitats from extinction',
          'habitat restoration': 'Rehabilitation of degraded ecosystems to restore their natural structure and function',
        };

        // Generate better definition-based trivia questions
        const filteredWords = sustainabilityWords
          .filter(word => word.toLowerCase() in sustainabilityDefs);
        
        console.log(`Loaded ${sustainabilityWords.length} sustainability words, ${filteredWords.length} have definitions`);

        const questions: TriviaQuestion[] = filteredWords
          .sort(() => Math.random() - 0.5)
          .slice(0, 25)
          .map((word, idx) => {
            const correctDef = sustainabilityDefs[word.toLowerCase()];
            const correctWord = word;

            // Create plausible but wrong answers
            const wrongAnswers: string[] = [];
            
            // Get some random different words for wrong answers
            const otherWords = filteredWords
              .filter(w => w.toLowerCase() !== word.toLowerCase())
              .sort(() => Math.random() - 0.5)
              .slice(0, 3);
            
            wrongAnswers.push(...otherWords);

            // If we don't have enough wrong answers, add generic ones
            while (wrongAnswers.length < 3) {
              wrongAnswers.push(`Unknown term ${wrongAnswers.length + 1}`);
            }

            const allAnswers = [correctWord, ...wrongAnswers].sort(() => Math.random() - 0.5);
            const correctIndex = allAnswers.indexOf(correctWord);

            return {
              id: `q${idx + 1}`,
              question: `Which sustainability concept describes: "${correctDef}"`,
              answers: allAnswers,
              correctAnswer: correctIndex,
            };
          });

        setTriviaQuestions(questions);

        // Extract buildings from edges
        const buildingSet = new Set<string>();
        edgeRows.forEach(edge => {
          buildingSet.add(edge.Source);
          buildingSet.add(edge.Target);
        });

        // Map node data
        const gameNodeMap = new Map<string, any>();
        nodeRows.forEach((row: any) => {
          gameNodeMap.set(row.building_name, row);
        });

        // Create buildings array with REAL coordinates from CSV
        // First, find bounds of coordinates
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        coordinateRows.forEach((row: any) => {
          if (buildingSet.has(row.Building)) {
            const lat = parseFloat(row.Latitude);
            const lon = parseFloat(row.Longitude);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
          }
        });

        // Scale coordinates to SVG space (0-500 width, 0-450 height)
        const svgWidth = 500;
        const svgHeight = 450;
        const padding = 30;
        const mapWidth = svgWidth - padding * 2;
        const mapHeight = svgHeight - padding * 2;

        const latRange = maxLat - minLat || 1;
        const lonRange = maxLon - minLon || 1;

        const buildingsArray: Building[] = [];
        buildingSet.forEach(name => {
          const nodeInfo = gameNodeMap.get(name);
          const coordRow = coordinateRows.find((r: any) => r.Building === name);

          let x = 250, y = 225; // Default center
          
          if (coordRow) {
            const lat = parseFloat(coordRow.Latitude);
            const lon = parseFloat(coordRow.Longitude);
            
            // Scale lat/lon to SVG coordinates (invert Y because SVG Y goes down)
            x = padding + ((lon - minLon) / lonRange) * mapWidth;
            y = padding + ((maxLat - lat) / latRange) * mapHeight;
          }

          buildingsArray.push({
            id: name.toLowerCase().replace(/\s+/g, '_').replace(/'/g, ''),
            name: name,
            code: nodeInfo?.code || name.substring(0, 3).toUpperCase(),
            x,
            y,
            sustainability_relevance: nodeInfo?.sustainability_relevance || 'Campus building',
          });
        });

        setBuildings(buildingsArray);

        // Build campus graph from edges
        const graph: { [key: string]: string[] } = {};
        edgeRows.forEach(edge => {
          const fromId = edge.Source.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
          const toId = edge.Target.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');

          if (!graph[fromId]) graph[fromId] = [];
          if (!graph[toId]) graph[toId] = [];

          if (!graph[fromId].includes(toId)) graph[fromId].push(toId);
          if (!graph[toId].includes(fromId)) graph[toId].push(fromId);
        });

        setCampusGraph(graph);

        // Extract unique resource types from data
        const resourceTypesSet = new Set<string>();
        resourceRows.forEach(row => {
          const type = row.resource_type.toLowerCase();
          if (type.includes('recycling')) resourceTypesSet.add('RECYCLE_BIN');
          else if (type.includes('compost')) resourceTypesSet.add('COMPOST_HUB');
          else if (type.includes('bike') || type.includes('ev_charging')) resourceTypesSet.add('BIKE_SUPPORT');
        });

        const types = Array.from(resourceTypesSet) as ResourceType[];
        if (types.length > 0) setResourceTypes(types.slice(0, 3));

        // Build energy map from energy assets with MORE GRANULAR scoring
        const energyScores: { [key: string]: number } = {};
        const penaltyMap: EnergyPenaltyMap = new Map();
        const bonusMap: SustainabilityBonusMap = new Map();
        
        buildingsArray.forEach(building => {
          const buildingName = building.name.toLowerCase();
          let energyLevel = 3; // Default medium
          let penalty = 0.5;
          let bonus = 0.5;

          // Categorize buildings for varied scoring
          
          // 🟢 HIGH SUSTAINABILITY (LEED, Green, Environment, Wellness)
          if (buildingName.includes('leed') || 
              buildingName.includes('green') || 
              buildingName.includes('wellness') ||
              buildingName.includes('environmental')) {
            energyLevel = 1;
            penalty = 0.2; // Very low energy
            bonus = 4.0;   // Very high sustainability bonus
          }
          // 🟢 MODERATE SUSTAINABILITY (Library, Community, Union, Commons)
          else if (buildingName.includes('library') || 
                   buildingName.includes('community') || 
                   buildingName.includes('union') ||
                   buildingName.includes('commons')) {
            energyLevel = 2;
            penalty = 0.3;
            bonus = 2.5;
          }
          // 🟡 MEDIUM SUSTAINABILITY (Chapel, Hall, Center, Building)
          else if (buildingName.includes('chapel') || 
                   buildingName.includes('hall') || 
                   buildingName.includes('center')) {
            energyLevel = 3;
            penalty = 0.6;
            bonus = 1.2;
          }
          // 🟠 HIGH ENERGY (Lab, Science, Engineering, Tech)
          else if (buildingName.includes('science') || 
                   buildingName.includes('lab') ||
                   buildingName.includes('engineering') ||
                   buildingName.includes('brady') ||
                   buildingName.includes('tech')) {
            energyLevel = 6;
            penalty = 4.0;  // High energy consumption
            bonus = 0.3;    // Low sustainability
          }
          // 🟠 MEDIUM-HIGH ENERGY (Classroom, Building, Room)
          else if (buildingName.includes('classroom') || 
                   buildingName.includes('building') ||
                   buildingName.includes('room')) {
            energyLevel = 4;
            penalty = 1.5;
            bonus = 0.8;
          }

          penaltyMap.set(building.id, penalty);
          bonusMap.set(building.id, bonus);
          energyScores[building.id] = energyLevel;
        });

        setEnergyMap(energyScores);
        setEnergyPenaltyMap(penaltyMap);
        setSustainabilityBonusMap(bonusMap);
        
        // Build Graph for algorithm use
        const algoGraph: Graph = new Map();
        edgeRows.forEach(edge => {
          const fromId = edge.Source.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
          const toId = edge.Target.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
          const distance = parseFloat(edge.Distance) || 1.0;
          
          if (!algoGraph.has(fromId)) algoGraph.set(fromId, []);
          if (!algoGraph.has(toId)) algoGraph.set(toId, []);
          
          algoGraph.get(fromId)!.push([toId, distance]);
          algoGraph.get(toId)!.push([fromId, distance]);
        });
        
        setAlgorithmGraph(algoGraph);

        setEnergyMap(energyScores);

        // Initialize game
        if (buildingsArray.length >= 2) {
          const startBuilding = buildingsArray[0];
          const endBuilding = buildingsArray[Math.floor(buildingsArray.length / 2)];

          setGameState(prev => ({
            ...prev,
            playerPosition: startBuilding.id,
            aiPosition: endBuilding.id,
            gamePhase: 'playing',
            message: `🎮 Game started! You are at ${startBuilding.name}`,
            historicalActions: [`Game started! Real UST campus data loaded.`],
          }));
        }
      } catch (error) {
        console.error('Error loading game data:', error);
        setGameState(prev => ({
          ...prev,
          gamePhase: 'gameOver',
          message: '❌ Error loading game data',
        }));
      }
    };

    loadGameData();
  }, []);

  const getAdjacentBuildings = (buildingId: string): string[] => {
    return campusGraph[buildingId] || [];
  };

  // Use A* to plan optimal path through high-value buildings
  const planOptimalTaskPath = (): string | null => {
    if (!algorithmGraph || !energyPenaltyMap || !sustainabilityBonusMap || !distanceMatrix) {
      return null;
    }

    try {
      // Identify high-value tasks (buildings with good sustainability bonus)
      const taskBuildings = buildings
        .filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id])
        .filter(b => {
          const bonus = sustainabilityBonusMap.get(b.id) || 0;
          const penalty = energyPenaltyMap.get(b.id) || 0;
          return bonus >= penalty; // High-value targets
        })
        .map(b => b.id);

      if (taskBuildings.length === 0) return null;

      // Use A* to find optimal path through top 5 tasks
      const topTasks = taskBuildings.slice(0, Math.min(5, taskBuildings.length));
      const taskSet = new Set(topTasks);

      // Find suitable goal node (any unblocked building)
      const goalNode = buildings.find(
        b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id]
      )?.id;

      if (!goalNode) return null;

      // Run A* task planner
      const astarResult = aStarTaskPlanner(
        algorithmGraph,
        gameState.playerPosition,
        goalNode,
        taskSet,
        energyPenaltyMap,
        sustainabilityBonusMap,
        distanceMatrix
      );

      // Track A* usage and results
      setGameState(prev => ({
        ...prev,
        astarUses: prev.astarUses + 1,
        algorithmResults: {
          ...prev.algorithmResults,
          astarPlans: [
            ...prev.algorithmResults.astarPlans,
            {
              path: astarResult.path,
              score: astarResult.totalCost,
              taskCount: topTasks.length,
            },
          ],
        },
      }));

      // Return the first waypoint in the optimal path (best node to block)
      if (astarResult.path && astarResult.path.length > 1) {
        // Return the next node in the path (after current position)
        return astarResult.path[1];
      }

      return null;
    } catch (error) {
      console.warn('A* path planning failed:', error);
      return null;
    }
  };

  const getAIMove = (): string => {
    if (!energyPenaltyMap || !sustainabilityBonusMap || !algorithmGraph || !distanceMatrix) {
      // Fallback if algorithm data not ready
      const unblocked = buildings
        .filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id])
        .map(b => b.id);
      return unblocked.length > 0 ? unblocked[0] : gameState.playerPosition;
    }

    try {
      // NEW: Integrated strategy combining CSP, A*, and Minimax
      const allBuildingIds = buildings.map(b => b.id) as any[];
      
      const gameSnapshot = {
        turn: gameState.turn,
        playerPosition: gameState.playerPosition as any,
        aiPosition: gameState.aiPosition as any,
        playerClaims: new Set(Object.keys(gameState.playerResources)),
        aiClaims: new Set(Object.keys(gameState.aiBlocks)),
        playerResources: new Map(Object.entries(gameState.playerResources)),
        aiResources: new Map(),
        availableResources: new Map(),
      };

      // Get integrated AI move using all three algorithms
      const { move, pathPlans, resourcePlacement } = computeIntegratedAIMove(
        gameSnapshot,
        algorithmGraph,
        distanceMatrix,
        energyPenaltyMap,
        sustainabilityBonusMap,
        allBuildingIds
      );

      // Track all algorithm usage
      setGameState(prev => ({
        ...prev,
        minimaxUses: prev.minimaxUses + 1,
        astarUses: prev.astarUses + (pathPlans.length > 0 ? 1 : 0),
        cspUses: prev.cspUses + 1,
        lastAIStrategy: move,
        aiPathPlans: pathPlans,
        algorithmResults: {
          ...prev.algorithmResults,
          minimaxDecisions: [
            ...prev.algorithmResults.minimaxDecisions,
            {
              bestBuilding: move.target,
              score: move.expectedScore,
              candidateCount: buildings.filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id]).length,
            },
          ],
          astarPlans: pathPlans.map(plan => ({
            path: plan.path,
            score: plan.cost,
            taskCount: 5,
          })),
        },
        message: `🤖 ${move.reasoning}`,
      }));

      return move.target;
    } catch (error) {
      console.warn('Integrated AI strategy failed:', error);
      // Fallback to greedy approach
      const unblocked = buildings
        .filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id])
        .map(b => b.id);
      return unblocked.sort((a, b) => (energyMap[b] || 3) - (energyMap[a] || 3))[0] || gameState.playerPosition;
    }
  };

  const handleMoveToBuilding = (targetId: string) => {
    if (gameState.gamePhase !== 'playing') return;

    const adjacent = getAdjacentBuildings(gameState.playerPosition);
    if (!adjacent.includes(targetId)) {
      setGameState(prev => ({
        ...prev,
        message: '❌ Not adjacent!',
      }));
      return;
    }

    const targetBuilding = buildings.find(b => b.id === targetId);
    setGameState(prev => ({
      ...prev,
      playerPosition: targetId,
      message: `📍 Moved to ${targetBuilding?.name}`,
      historicalActions: [...prev.historicalActions, `Moved to ${targetBuilding?.name}`],
      gamePhase: 'aiTurn',
    }));

    setTimeout(() => executeAITurn(), 1500);
  };

  const validateResourcePlacementWithCSP = (resource: ResourceType): boolean => {
    // Quick pre-checks before running CSP solver
    if (gameState.gamePhase !== 'playing') return false;

    // Quick hard constraints
    if (gameState.playerResources[gameState.playerPosition]) {
      setGameState(prev => ({ ...prev, message: '❌ Resource already placed here!' }));
      return false;
    }

    if (gameState.aiBlocks[gameState.playerPosition]) {
      setGameState(prev => ({ ...prev, message: '❌ AI has blocked this location!' }));
      return false;
    }

    try {
      // Track CSP usage
      setGameState(prev => ({
        ...prev,
        cspUses: prev.cspUses + 1,
      }));

      // Build the CSP problem
      const priorityNodes = new Set<string>();
      priorityNodes.add(gameState.playerPosition);
      Object.keys(gameState.playerResources).forEach(id => priorityNodes.add(id));

      const highEnergyNodes = new Set<string>();
      buildings.forEach(b => {
        if ((energyMap[b.id] || 3) >= 5) {
          highEnergyNodes.add(b.id);
        }
      });

      const cspProblem = {
        variables: buildings.map(b => b.id),
        priorityNodes,
        highEnergyNodes,
        maxTotalResources: 5,
      };

      // Let CSP solve it
      const assignment = solveResourceCSP(cspProblem);

      // Try to place this resource in the assignment
      const testAssignment = new Map(assignment);
      testAssignment.set(gameState.playerPosition, resource);

      // CSP validates: max 5 resources, max 2 compost, all constraints
      let resourceCount = 0;
      let compostCount = 0;
      testAssignment.forEach((v) => {
        if (v !== "NONE") resourceCount++;
        if (v === 'COMPOST_HUB') compostCount++;
      });

      if (resourceCount > 5) {
        setGameState(prev => ({ 
          ...prev, 
          message: '❌ Resource limit reached (max 5)!',
          algorithmResults: {
            ...prev.algorithmResults,
            cspValidations: [
              ...prev.algorithmResults.cspValidations,
              { resource, building: gameState.playerPosition, valid: false },
            ],
          },
        }));
        return false;
      }

      if (compostCount > 2) {
        setGameState(prev => ({ 
          ...prev, 
          message: '❌ Max 2 compost hubs allowed!',
          algorithmResults: {
            ...prev.algorithmResults,
            cspValidations: [
              ...prev.algorithmResults.cspValidations,
              { resource, building: gameState.playerPosition, valid: false },
            ],
          },
        }));
        return false;
      }

      // Valid placement - track result
      setGameState(prev => ({
        ...prev,
        algorithmResults: {
          ...prev.algorithmResults,
          cspValidations: [
            ...prev.algorithmResults.cspValidations,
            { resource, building: gameState.playerPosition, valid: true },
          ],
        },
      }));

      return true;
    } catch (error) {
      console.warn('CSP validation failed:', error);
      setGameState(prev => ({ 
        ...prev, 
        message: '❌ Placement not allowed by constraints!',
        algorithmResults: {
          ...prev.algorithmResults,
          cspValidations: [
            ...prev.algorithmResults.cspValidations,
            { resource, building: gameState.playerPosition, valid: false },
          ],
        },
      }));
      return false;
    }
  };

  const validateResourcePlacementBasic = (resource: ResourceType): boolean => {
    // CSP Constraint 1: Max 5 resources
    const resourceCount = Object.values(gameState.playerResources).filter(r => r !== undefined).length;
    if (resourceCount >= 5) {
      setGameState(prev => ({ ...prev, message: '❌ Resource limit reached (max 5)!' }));
      return false;
    }

    // CSP Constraint 2: No duplicates per building
    if (gameState.playerResources[gameState.playerPosition]) {
      setGameState(prev => ({ ...prev, message: '❌ Resource already placed here!' }));
      return false;
    }

    // CSP Constraint 3: Cannot place on AI-blocked locations
    if (gameState.aiBlocks[gameState.playerPosition]) {
      setGameState(prev => ({ ...prev, message: '❌ AI has blocked this location!' }));
      return false;
    }

    // CSP Constraint 4: Max 2 compost hubs
    const compostCount = Object.values(gameState.playerResources).filter(r => r === 'COMPOST_HUB').length;
    if (resource === 'COMPOST_HUB' && compostCount >= 2) {
      setGameState(prev => ({ ...prev, message: '❌ Max 2 compost hubs allowed!' }));
      return false;
    }

    return true;
  };

  const handlePlaceResource = (resource: ResourceType) => {
    if (gameState.gamePhase !== 'playing') return;

    // Validate resource placement (does all checks: duplicates, max, blocks, compost limit)
    if (!validateResourcePlacementWithCSP(resource)) {
      return;
    }

    if (triviaQuestions.length === 0) {
      setGameState(prev => ({ ...prev, message: '❌ Trivia not loaded yet!' }));
      return;
    }

    setPendingAction({ type: 'resource', target: gameState.playerPosition, resource });
    setCurrentQuestion(triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)]);
    setGameState(prev => ({
      ...prev,
      gamePhase: 'trivia',
      message: '🧠 Answer correctly to place the resource!',
    }));
  };

  const handleAnswerQuestion = (answerIndex: number) => {
    const correct = answerIndex === currentQuestion?.correctAnswer;
    const targetBuilding = buildings.find(b => b.id === gameState.playerPosition);

    if (correct && pendingAction?.type === 'resource') {
      setGameState(prev => {
        const newResources = { ...prev.playerResources };
        newResources[pendingAction.target] = pendingAction.resource || 'RECYCLE_BIN';

        // Calculate dynamic score based on building value
        const buildingValue = energyPenaltyMap && sustainabilityBonusMap 
          ? calculateBuildingValue(gameState.playerPosition as any, energyPenaltyMap, sustainabilityBonusMap)
          : 10; // Fallback

        return {
          ...prev,
          playerResources: newResources,
          playerScore: prev.playerScore + buildingValue,
          gamePhase: 'aiTurn',
          message: `✅ Correct! +${buildingValue} points for claiming ${targetBuilding?.name}`,
          historicalActions: [...prev.historicalActions, `✅ ${pendingAction.resource} placed at ${targetBuilding?.name} (+${buildingValue} pts)`],
        };
      });
    } else {
      const answer = currentQuestion?.answers[currentQuestion.correctAnswer] || 'Unknown';
      setGameState(prev => ({
        ...prev,
        aiScore: prev.aiScore + 5,
        gamePhase: 'aiTurn',
        message: `❌ Wrong! Answer: ${answer}`,
        historicalActions: [...prev.historicalActions, `❌ Wrong trivia (answer: ${answer})`],
      }));
    }

    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setPendingAction(null);

    setTimeout(() => executeAITurn(), 1500);
  };

  const executeAITurn = () => {
    const blockTarget = getAIMove();

    setGameState(prev => {
      const newBlocks = { ...prev.aiBlocks };
      newBlocks[blockTarget] = true;

      // Calculate dynamic score for AI blocking high-value buildings
      const blockValue = energyPenaltyMap && sustainabilityBonusMap 
        ? calculateBuildingValue(blockTarget as any, energyPenaltyMap, sustainabilityBonusMap) / 3
        : 3; // Fallback - AI gets 1/3 of the building value as blocking score

      const newTurn = prev.turn + 1;
      const gameEnded = newTurn > 10;
      const blockBuilding = buildings.find(b => b.id === blockTarget);

      return {
        ...prev,
        aiBlocks: newBlocks,
        aiScore: prev.aiScore + Math.ceil(blockValue),
        turn: newTurn,
        gamePhase: gameEnded ? 'results' : 'playing',
        message: gameEnded ? '🏁 Game Over!' : `🤖 AI blocked ${blockBuilding?.name} (+${Math.ceil(blockValue)} pts)`,
        historicalActions: [...prev.historicalActions, `🤖 Blocked ${blockBuilding?.name} (+${Math.ceil(blockValue)} pts)`],
        gameEnded,
        winner: gameEnded
          ? prev.playerScore > prev.aiScore ? 'player'
            : prev.playerScore < prev.aiScore ? 'ai'
            : 'draw'
          : undefined,
      };
    });
  };

  const resetGame = () => window.location.reload();

  if (gameState.gamePhase === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 animate-bounce" style={{ animationDuration: '2s' }}>
            <img 
              src="/ust-logo.png" 
              alt="University of St. Thomas" 
              className="h-32 w-auto drop-shadow-2xl hover:drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <p className="text-4xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-green-300">
            Eco Campus Strategy
          </p>
          <p className="text-lg text-slate-300">{gameState.message}</p>
        </div>
      </div>
    );
  }

  if (gameState.gamePhase === 'results') {
    const playerWon = gameState.winner === 'player';
    const maxScore = Math.max(gameState.playerScore, gameState.aiScore, 1);
    const playerRatio = gameState.playerScore / maxScore;
    const aiRatio = gameState.aiScore / maxScore;

    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8 overflow-auto">
      <div className="mb-12 flex items-center justify-center gap-4 pb-8 border-b border-purple-600/30">
          <img 
            src="/ust-logo.png" 
            alt="University of St. Thomas" 
            className="h-20 w-auto flex-shrink-0 drop-shadow-lg hover:drop-shadow-2xl transition-all"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-300">
            Eco Campus Strategy
          </h1>
        </div>

        <style>{`
          @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
            50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.6); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .animate-slide { animation: slideInDown 0.6s ease-out; }
          .animate-scale { animation: scaleIn 0.5s ease-out; }
          .glow-win { animation: pulse-glow 2s infinite; }
          .float-anim { animation: float 3s ease-in-out infinite; }
          .stat-card {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: left 0.5s;
          }
          .stat-card:hover::before {
            left: 100%;
          }
          .stat-card:hover {
            transform: translateY(-5px);
          }
          
          /* Custom Scrollbar Styling */
          ::-webkit-scrollbar {
            width: 12px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.5);
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 10px;
            border: 2px solid rgba(15, 23, 42, 0.8);
          }
          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #818cf8 0%, #a78bfa 100%);
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
          }
          
          /* Firefox Scrollbar */
          * {
            scrollbar-color: #6366f1 rgba(15, 23, 42, 0.5);
            scrollbar-width: thin;
          }
        `}

        </style>

        <div className="max-w-7xl mx-auto">
          {/* 🏆 Winner Header */}
          <div className="text-center mb-12 animate-slide">
            <div className={`text-7xl mb-4 ${playerWon ? 'float-anim' : ''}`}>
              {gameState.winner === 'player' ? '🏆' : gameState.winner === 'ai' ? '🤖' : '🤝'}
            </div>
            <h1 className={`text-6xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r ${
              playerWon ? 'from-green-400 to-emerald-300' : 
              gameState.winner === 'ai' ? 'from-red-400 to-orange-300' : 
              'from-blue-400 to-cyan-300'
            }`}>
              {gameState.winner === 'player' ? '🎉 VICTORY!' : gameState.winner === 'ai' ? 'AI WINS!' : 'STALEMATE!'}
            </h1>
            <p className="text-2xl text-slate-300 mb-2">Final Score</p>
            <div className="flex justify-center items-center gap-8 text-5xl font-bold">
              <span className={`${playerWon ? 'glow-win' : ''} rounded-lg px-6 py-2 bg-green-900/30 border border-green-500`}>
                {gameState.playerScore}
              </span>
              <span className="text-slate-500">—</span>
              <span className={`${gameState.winner === 'ai' ? 'glow-win' : ''} rounded-lg px-6 py-2 bg-red-900/30 border border-red-500`}>
                {gameState.aiScore}
              </span>
            </div>
          </div>

          {/* 📊 Score Comparison Bar */}
          <div className="mb-12 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur">
            <p className="text-sm text-slate-400 uppercase tracking-widest mb-4 font-semibold">Performance Comparison</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-green-300 font-semibold">You</span>
                  <span className="text-slate-400">{gameState.playerScore} pts</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${playerRatio * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-red-300 font-semibold">AI</span>
                  <span className="text-slate-400">{gameState.aiScore} pts</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${aiRatio * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 📈 Algorithm Statistics - Modern Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: '⚔️', label: 'Minimax', value: gameState.minimaxUses, color: 'from-purple-600 to-purple-500', desc: 'Strategic decisions' },
              { icon: '🔗', label: 'CSP', value: gameState.cspUses, color: 'from-blue-600 to-blue-500', desc: 'Validations' },
              { icon: '🗺️', label: 'A*', value: gameState.astarUses, color: 'from-orange-600 to-orange-500', desc: 'Path plans' },
              { icon: '⏱️', label: 'Turns', value: gameState.turn - 1, color: 'from-cyan-600 to-cyan-500', desc: 'Game rounds' },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className={`stat-card bg-gradient-to-br ${stat.color} rounded-xl p-6 border border-white/10 backdrop-blur-sm`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <p className="text-white/90 font-semibold">{stat.label}</p>
                <p className="text-white/60 text-xs mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>

          {/* 🎯 ALGORITHM RESULTS SUMMARY - Prominent Explanation */}
          <div className="mb-12 bg-indigo-950 rounded-2xl p-8 border-2 border-indigo-400 shadow-2xl shadow-indigo-500/30">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-black text-indigo-200">
                📊 How the AI Used 3 Algorithms to Compete
              </h2>
              <div className="text-sm text-indigo-300 bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-500">
                ↓ Scroll to explore
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* CSP Explanation */}
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-blue-500 hover:border-blue-400 transition-all hover:shadow-lg hover:shadow-blue-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">🔗</span>
                  <div>
                    <h3 className="text-xl font-bold text-blue-300">CSP</h3>
                    <h4 className="text-sm text-blue-200">Resource Planning</h4>
                    <p className="text-xs text-blue-100/60 mt-1">Constraint Satisfaction</p>
                  </div>
                </div>
                <div className="bg-slate-900/70 rounded p-4 mb-3 border-l-3 border-blue-500">
                  <p className="text-lg font-bold text-blue-200">{gameState.cspUses}</p>
                  <p className="text-xs text-slate-300">validation checks</p>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>✓ Ensured max 5 resources</p>
                  <p>✓ Enforced max 2 compost hubs</p>
                  <p>✓ Avoided blocked buildings</p>
                </div>
              </div>

              {/* A* Explanation */}
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-orange-500 hover:border-orange-400 transition-all hover:shadow-lg hover:shadow-orange-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">🗺️</span>
                  <div>
                    <h3 className="text-xl font-bold text-orange-300">A*</h3>
                    <h4 className="text-sm text-orange-200">Pathfinding</h4>
                    <p className="text-xs text-orange-100/60 mt-1">Intelligent Navigation</p>
                  </div>
                </div>
                <div className="bg-slate-900/70 rounded p-4 mb-3 border-l-3 border-orange-500">
                  <p className="text-lg font-bold text-orange-200">{gameState.astarUses}</p>
                  <p className="text-xs text-slate-300">path plans</p>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>✓ Calculated distances</p>
                  <p>✓ Factored energy costs</p>
                  <p>✓ Optimized sustainability</p>
                </div>
              </div>

              {/* Minimax Explanation */}
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-purple-500 hover:border-purple-400 transition-all hover:shadow-lg hover:shadow-purple-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">⚔️</span>
                  <div>
                    <h3 className="text-xl font-bold text-purple-300">Minimax</h3>
                    <h4 className="text-sm text-purple-200">Strategy</h4>
                    <p className="text-xs text-purple-100/60 mt-1">2-Move Game Tree</p>
                  </div>
                </div>
                <div className="bg-slate-900/70 rounded p-4 mb-3 border-l-3 border-purple-500">
                  <p className="text-lg font-bold text-purple-200">{gameState.minimaxUses}</p>
                  <p className="text-xs text-slate-300">strategic decisions</p>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>✓ Simulated 2 moves</p>
                  <p>✓ Assumed your best response</p>
                  <p>✓ Picked strongest move</p>
                </div>
              </div>
            </div>

            {/* How They Worked Together */}
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-lg p-6 border border-indigo-500/50 mb-4">
              <h3 className="text-xl font-bold text-indigo-300 mb-4 flex items-center gap-2">
                🔄 The AI's Decision Pipeline (Every Turn):
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-950/50 rounded-lg p-4 border-l-4 border-blue-500 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-black mb-3 text-lg">1</div>
                  <p className="text-sm font-bold text-blue-300 mb-1">CSP Validates</p>
                  <p className="text-xs text-slate-400">where to place resources safely</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl text-indigo-400 font-bold hidden md:block">→</div>
                </div>
                <div className="bg-orange-950/50 rounded-lg p-4 border-l-4 border-orange-500 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-600 text-white font-black mb-3 text-lg">2</div>
                  <p className="text-sm font-bold text-orange-300 mb-1">A* Plans</p>
                  <p className="text-xs text-slate-400">best path to target buildings</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl text-indigo-400 font-bold hidden md:block">→</div>
                </div>
                <div className="bg-purple-950/50 rounded-lg p-4 border-l-4 border-purple-500 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 text-white font-black mb-3 text-lg">3</div>
                  <p className="text-sm font-bold text-purple-300 mb-1">Minimax Decides</p>
                  <p className="text-xs text-slate-400">which building to claim</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30 text-center">
              <p className="text-sm text-indigo-200">
                <span className="font-bold">Result:</span> AI used <span className="font-bold text-indigo-300">{gameState.cspUses}</span> resource validations, <span className="font-bold text-orange-300">{gameState.astarUses}</span> path plans, and <span className="font-bold text-purple-300">{gameState.minimaxUses}</span> strategic evaluations over {gameState.turn - 1} turns
              </p>
            </div>
          </div>

          {/* 👤 VS 🤖 Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Player Stats */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl p-8 border border-green-500/30 backdrop-blur">
              <h2 className="text-2xl font-bold text-green-300 mb-6 flex items-center gap-2">
                <span className="text-4xl">👤</span> Your Performance
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Total Score', value: gameState.playerScore, unit: 'pts' },
                  { label: 'Resources Placed', value: Object.keys(gameState.playerResources).length, unit: '/5' },
                  { label: 'Trivia Answers', value: Math.floor(gameState.playerScore / 10), unit: 'correct' },
                  { label: 'Average Score/Turn', value: (gameState.playerScore / (gameState.turn - 1)).toFixed(1), unit: 'pts/turn' },
                ].map((stat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="text-green-300 font-bold text-lg">{stat.value} <span className="text-sm text-slate-400">{stat.unit}</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Stats */}
            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-xl p-8 border border-red-500/30 backdrop-blur">
              <h2 className="text-2xl font-bold text-red-300 mb-6 flex items-center gap-2">
                <span className="text-4xl">🤖</span> AI Strategy
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Total Score', value: gameState.aiScore, unit: 'pts' },
                  { label: 'Buildings Blocked', value: Object.keys(gameState.aiBlocks).filter(k => gameState.aiBlocks[k]).length, unit: 'buildings' },
                  { label: 'Algorithm Combos', value: gameState.minimaxUses, unit: 'decisions' },
                  { label: 'Average Score/Turn', value: (gameState.aiScore / (gameState.turn - 1)).toFixed(1), unit: 'pts/turn' },
                ].map((stat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="text-red-300 font-bold text-lg">{stat.value} <span className="text-sm text-slate-400">{stat.unit}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🧠 Algorithms Deep Dive - Tabbed/Accordion Style */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              🧬 Algorithm Execution Details
            </h2>

            {/* Minimax Tab */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-purple-900/30 to-slate-900/30 border border-purple-500/30 overflow-hidden backdrop-blur">
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">⚔️</span> Minimax Algorithm
                  <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">{gameState.minimaxUses} decisions</span>
                </h3>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-sm mb-4">Game tree search evaluated candidate positions 2 moves ahead</p>
                {gameState.algorithmResults.minimaxDecisions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gameState.algorithmResults.minimaxDecisions.map((decision, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition flex items-center justify-between">
                        <span className="text-purple-300 font-semibold">Turn {idx + 1}</span>
                        <span className="text-slate-400">Evaluated {decision.candidateCount} candidates</span>
                        <span className="text-green-400 font-bold">→ {decision.bestBuilding}</span>
                        <span className="text-purple-200 text-sm">(score: {decision.score.toFixed(1)})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No decisions recorded</p>
                )}
              </div>
            </div>

            {/* CSP Tab */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-900/30 to-slate-900/30 border border-blue-500/30 overflow-hidden backdrop-blur">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🔗</span> Constraint Satisfaction Problem
                  <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">{gameState.cspUses} checks</span>
                </h3>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-sm mb-4">Constraint satisfaction validated resource placements (max 5 resources, max 2 compost)</p>
                {gameState.algorithmResults.cspValidations.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gameState.algorithmResults.cspValidations.map((validation, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition flex items-center justify-between">
                        <span className="text-blue-300 font-semibold">Check {idx + 1}</span>
                        <span className="text-slate-400">{validation.resource} at</span>
                        <span className="text-slate-300">{validation.building}</span>
                        <span className={`font-bold ml-auto ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                          {validation.valid ? '✓ VALID' : '✗ REJECTED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No validations recorded</p>
                )}
              </div>
            </div>

            {/* A* Tab */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-orange-900/30 to-slate-900/30 border border-orange-500/30 overflow-hidden backdrop-blur">
              <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🗺️</span> A* Pathfinding
                  <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">{gameState.astarUses} plans</span>
                </h3>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-sm mb-4">Heuristic search found optimal task routes through campus</p>
                {gameState.algorithmResults.astarPlans.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {gameState.algorithmResults.astarPlans.map((plan, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-orange-300 font-semibold">Plan {idx + 1}</span>
                          <span className="text-slate-400">Cost: {plan.score.toFixed(1)}</span>
                          <span className="text-slate-400">{plan.path.length} nodes, {plan.taskCount} targets</span>
                        </div>
                        <div className="text-xs text-slate-400 overflow-x-auto">
                          {plan.path.join(' → ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No plans recorded</p>
                )}
              </div>
            </div>

            {/* Integrated Strategy - Algorithm Breakdown */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-900/30 to-slate-900/30 border border-indigo-500/30 overflow-hidden backdrop-blur">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">⚙️</span> How the AI Algorithms Worked Together
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {/* How Algorithms Worked Together */}
                <div className="bg-slate-900/60 rounded-lg p-4 border border-indigo-500/20">
                  <p className="text-sm text-indigo-200 mb-3 font-semibold">🔄 Algorithm Pipeline Used Throughout Game:</p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold flex-shrink-0">1. CSP</span>
                      <div>
                        <p className="font-semibold text-indigo-300">Constraint Satisfaction</p>
                        <p>Ran <span className="font-bold text-indigo-200">{gameState.cspUses} times</span> to validate resource placement decisions, ensuring all constraints were satisfied (max 5 resources, max 2 compost hubs, no placements on blocked buildings)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 font-bold flex-shrink-0">2. A*</span>
                      <div>
                        <p className="font-semibold text-orange-300">Pathfinding</p>
                        <p>Ran <span className="font-bold text-orange-200">{gameState.astarUses} times</span> to plan efficient routes through campus, calculating which buildings to visit based on distance, energy costs, and sustainability value</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 font-bold flex-shrink-0">3. Minimax</span>
                      <div>
                        <p className="font-semibold text-purple-300">Strategic Planning</p>
                        <p>Ran <span className="font-bold text-purple-200">{gameState.minimaxUses} times</span> to evaluate candidate buildings using 2-move lookahead, assuming you'd respond optimally and selecting the move that leaves AI in strongest position</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Algorithm Interaction Explanation */}
                <div className="bg-slate-800/40 rounded-lg p-4 border border-indigo-500/20">
                  <p className="text-sm text-indigo-200 font-semibold mb-3">🔗 How They Worked Together Each Turn:</p>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
                    <li><span className="text-indigo-300 font-semibold">CSP Phase:</span> Determined optimal placement of resources respecting all constraints</li>
                    <li><span className="text-orange-300 font-semibold">A* Phase:</span> Planned efficient paths to reach the best target buildings</li>
                    <li><span className="text-purple-300 font-semibold">Minimax Phase:</span> Simulated game tree (2 moves ahead) to pick final building target that maximizes AI advantage</li>
                  </ol>
                </div>

                {/* Final Result Summary */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-indigo-200 font-semibold mb-2">📊 AI Decision Summary:</p>
                  <p className="text-xs text-slate-300">
                    Over <span className="font-bold">{gameState.turn - 1}</span> turns, the AI used this integrated algorithm pipeline to make strategic decisions. The combination ensured that resource placement was valid (CSP), paths were efficient (A*), and final move choices maximized competitive advantage (Minimax).
                  </p>
                  {gameState.lastAIStrategy && (
                    <p className="text-xs text-slate-300 mt-3">
                      <span className="text-indigo-300 font-semibold">Last Decision:</span> {gameState.lastAIStrategy.reasoning}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 📝 Action Timeline */}
          <div className="mb-12 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 overflow-hidden backdrop-blur">
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📋</span> Game Timeline
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameState.historicalActions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded transition">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-slate-300">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🎮 Action Button */}
          <div className="flex gap-4 justify-center pb-8">
            <button
              onClick={resetGame}
              className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl font-bold text-white text-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-green-500/50 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-2xl">🔄</span> Play Again
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-700 to-emerald-600 opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>

          {/* UST Footer */}
          <div className="flex items-center justify-center gap-3 mt-8 pt-8 border-t border-purple-600/30">
            <img 
              src="/ust-logo.png" 
              alt="University of St. Thomas" 
              className="h-10 w-auto drop-shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="text-sm">
              <p className="text-slate-400">Eco Campus Strategy Game</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const playerBuilding = buildings.find(b => b.id === gameState.playerPosition);
  const aiBuilding = buildings.find(b => b.id === gameState.aiPosition);
  const resourceCount = Object.values(gameState.playerResources).length;
  const blockedCount = Object.values(gameState.aiBlocks).filter(b => b).length;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* UST Branded Header */}
      <div className="mb-6 bg-gradient-to-r from-purple-900/40 to-violet-900/40 rounded-xl border border-purple-600/50 p-4 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/ust-logo.png" 
            alt="University of St. Thomas" 
            className="h-16 w-auto flex-shrink-0 drop-shadow-lg hover:drop-shadow-xl transition-all"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-green-300">
            Eco Campus Strategy
          </h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400 mb-2">Turn {gameState.turn}</div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{gameState.playerScore}</div>
              <div className="text-xs text-slate-400">Your Score</div>
            </div>
            <div className="text-slate-600">|</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{gameState.aiScore}</div>
              <div className="text-xs text-slate-400">AI Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Map - Enhanced */}
        <div className="col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-600/50 p-4 overflow-auto shadow-2xl backdrop-blur">
          <svg className="w-full h-full" viewBox="0 0 500 450" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#0f5c4e', stopOpacity: 0.4 }} />
                <stop offset="50%" style={{ stopColor: '#164e63', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.5 }} />
              </linearGradient>
              <radialGradient id="buildingGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0 }} />
              </radialGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
              </filter>
            </defs>

            <rect width="500" height="450" fill="#0f172a" />
            <rect width="500" height="450" fill="url(#bgGradient)" />

            {Object.entries(campusGraph).map(([from, neighbors]) =>
              neighbors.map(to => {
                const fromBuilding = buildings.find(b => b.id === from);
                const toBuilding = buildings.find(b => b.id === to);
                if (!fromBuilding || !toBuilding || from > to) return null;

                return (
                  <line
                    key={`${from}-${to}`}
                    x1={fromBuilding.x}
                    y1={fromBuilding.y}
                    x2={toBuilding.x}
                    y2={toBuilding.y}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                );
              })
            )}

            {buildings.map(building => {
              const isPlayer = building.id === gameState.playerPosition;
              const isAI = building.id === gameState.aiPosition;
              const hasResource = gameState.playerResources[building.id];
              const isBlocked = gameState.aiBlocks[building.id];

              const fillColor = isPlayer ? '#22c55e' : isAI ? '#ef4444' : isBlocked ? '#fbbf24' : hasResource ? '#06b6d4' : '#3b82f6';

              return (
                <g key={building.id} filter="url(#shadow)">
                  {/* Background circle for glow effect */}
                  <circle
                    cx={building.x}
                    cy={building.y}
                    r="20"
                    fill={fillColor}
                    opacity="0.1"
                  />
                  
                  {/* Main building circle */}
                  <circle
                    cx={building.x}
                    cy={building.y}
                    r="10"
                    fill={fillColor}
                    opacity={isBlocked ? 0.5 : 1}
                    className="cursor-pointer transition-all"
                    onClick={() => handleMoveToBuilding(building.id)}
                    style={{ transition: 'r 0.2s' }}
                  />
                  
                  {/* Glow for player/AI */}
                  {isPlayer && <circle cx={building.x} cy={building.y} r="16" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.8" />}
                  {isAI && <circle cx={building.x} cy={building.y} r="16" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" opacity="0.8" />}

                  <text x={building.x} y={building.y + 24} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold" className="pointer-events-none">
                    {building.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Control Panel - Enhanced */}
        <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-600/50 p-5 flex flex-col overflow-auto space-y-4 shadow-2xl backdrop-blur">
          {/* Status Bars */}
          <div className="space-y-3">
            <div className="rounded-lg bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-green-300 font-bold">YOUR SCORE</p>
                <span className="text-lg font-bold text-green-400">{gameState.playerScore}</span>
              </div>
              <div className="w-full bg-green-950 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(gameState.playerScore, 100)}%` }} />
              </div>
            </div>
            
            <div className="rounded-lg bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-red-300 font-bold">AI SCORE</p>
                <span className="text-lg font-bold text-red-400">{gameState.aiScore}</span>
              </div>
              <div className="w-full bg-red-950 rounded-full h-2">
                <div className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full transition-all" style={{ width: `${Math.min(gameState.aiScore, 100)}%` }} />
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-slate-700/40 to-slate-600/40 border border-slate-500/30 p-3 text-center">
              <p className="text-xs text-slate-300 uppercase tracking-wider font-bold">TURN {gameState.turn}/10</p>
              <p className="text-sm text-slate-400 mt-1">{10 - gameState.turn} rounds remaining</p>
            </div>
          </div>

          {/* Game Status */}
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
            <p className="text-sm text-white font-semibold mb-3">{gameState.message}</p>
            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2"><span className="text-green-400">📍</span> <span>You:</span> <span className="text-green-300 font-bold">{playerBuilding?.code}</span></div>
              <div className="flex items-center gap-2"><span className="text-red-400">🤖</span> <span>AI:</span> <span className="text-red-300 font-bold">{aiBuilding?.code}</span></div>
              <div className="flex items-center gap-2"><span className="text-cyan-400">♻️</span> <span>Resources:</span> <span className="text-cyan-300 font-bold">{resourceCount}/5</span></div>
              <div className="flex items-center gap-2"><span className="text-amber-400">🚫</span> <span>Blocked:</span> <span className="text-amber-300 font-bold">{blockedCount}</span></div>
            </div>
          </div>

          {gameState.gamePhase === 'trivia' && currentQuestion && (
            <div className="rounded-lg bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-500/50 p-4 space-y-3 animate-pulse">
              <p className="text-cyan-300 text-xs font-bold uppercase tracking-wider">💡 Question Time!</p>
              <p className="text-white text-sm font-semibold">{currentQuestion.question}</p>
              <div className="space-y-2">
                {currentQuestion.answers.map((answer, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnswer(idx);
                      handleAnswerQuestion(idx);
                    }}
                    disabled={selectedAnswer !== null}
                    className={`w-full p-3 rounded-lg text-xs font-bold transition-all transform hover:scale-105 ${
                      selectedAnswer !== null
                        ? idx === currentQuestion.correctAnswer
                          ? 'bg-gradient-to-r from-green-600 to-emerald-500 border border-green-400 text-white scale-100'
                          : idx === selectedAnswer ? 'bg-gradient-to-r from-red-600 to-orange-500 border border-red-400 text-white scale-100' : 'bg-slate-700 text-slate-400'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 border border-cyan-400 text-white'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}) {answer}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.gamePhase === 'playing' && (
            <>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Navigate Campus</p>
                <div className="grid grid-cols-2 gap-2">
                  {getAdjacentBuildings(gameState.playerPosition).map(adjId => {
                    const adj = buildings.find(b => b.id === adjId);
                    const buildingValue = energyPenaltyMap && sustainabilityBonusMap 
                      ? calculateBuildingValue(adjId as any, energyPenaltyMap, sustainabilityBonusMap)
                      : 10;
                    const valueColor = buildingValue >= 20 ? 'text-green-300' : buildingValue >= 15 ? 'text-yellow-300' : 'text-orange-300';
                    return (
                      <button
                        key={adjId}
                        onClick={() => handleMoveToBuilding(adjId)}
                        className="bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-3 py-2 rounded-lg text-xs font-bold border border-blue-400/50 transition-all transform hover:scale-105 shadow-lg relative"
                      >
                        ➜ {adj?.code}
                        <span className={`absolute top-0 right-0 text-xs font-black ${valueColor} bg-blue-900/80 rounded-tl-lg rounded-br-lg px-1.5 py-0.5`}>
                          {buildingValue}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Place Resources</p>
                <div className="space-y-2">
                  {resourceTypes.map(resource => (
                    <button
                      key={resource}
                      onClick={() => handlePlaceResource(resource)}
                      className="w-full bg-gradient-to-br from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-3 py-3 rounded-lg text-xs font-bold border border-cyan-400/50 transition-all transform hover:scale-105 shadow-lg"
                    >
                      ♻️ {resource.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {gameState.gameEnded && (
            <div className={`p-4 rounded-lg border-2 text-center font-bold transition-all ${ 
              gameState.winner === 'player' ? 'bg-gradient-to-br from-green-900 to-emerald-900 border-green-500 shadow-lg shadow-green-500/50'
                : gameState.winner === 'ai' ? 'bg-gradient-to-br from-red-900 to-orange-900 border-red-500 shadow-lg shadow-red-500/50'
                : 'bg-gradient-to-br from-yellow-900 to-amber-900 border-yellow-500 shadow-lg shadow-yellow-500/50'
            }`}>
              <p className="text-2xl mb-2">
                {gameState.winner === 'player' ? '🏆 YOU WIN!' : gameState.winner === 'ai' ? '🤖 AI WINS!' : '🤝 TIE!'}
              </p>
              <p className="text-sm mb-4">{gameState.playerScore} - {gameState.aiScore}</p>
              <button 
                onClick={resetGame}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-2 rounded-lg text-sm transition-all transform hover:scale-105"
              >
                🔄 Play Again
              </button>
            </div>
          )}

          <div className="text-xs">
            <p className="text-slate-400 font-bold mb-1">HISTORY</p>
            <div className="bg-slate-700 p-2 rounded text-slate-300 max-h-20 overflow-y-auto space-y-1">
              {gameState.historicalActions.slice(-5).map((action, idx) => (
                <p key={idx} className="truncate text-xs">{action}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
