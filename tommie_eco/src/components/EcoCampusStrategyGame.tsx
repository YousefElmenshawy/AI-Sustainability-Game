'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { parseCSV } from '@/lib/utils';
import type { BuildingEdge, EnergyAsset, CampusResource, ResourceType, Graph, DistanceMatrix, EnergyPenaltyMap, SustainabilityBonusMap } from '@/lib/types';
import { minimaxOpeningAction } from '@/lib/algorithms/minimax';
import { solveResourceCSP } from '@/lib/algorithms/csp';
import { aStarTaskPlanner } from '@/lib/algorithms/astar';

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

        // Build energy map from energy assets
        const energyScores: { [key: string]: number } = {};
        const penaltyMap: EnergyPenaltyMap = new Map();
        const bonusMap: SustainabilityBonusMap = new Map();
        
        buildingsArray.forEach(building => {
          let energyLevel = 3; // Default medium

          // LEED buildings are efficient (low energy)
          if (energyRows.some(row =>
            row.asset_type === 'leed_building' &&
            row.location_name.toLowerCase().includes(building.name.toLowerCase())
          )) {
            energyLevel = 2;
            bonusMap.set(building.id, 2.0); // Bonus for sustainable buildings
          }

          // Science/Lab buildings consume more energy
          if (building.name.toLowerCase().includes('science') || 
              building.name.toLowerCase().includes('brady')) {
            energyLevel = 6;
            penaltyMap.set(building.id, 3.0); // Penalty for high-energy buildings
          } else {
            penaltyMap.set(building.id, 0.5); // Base penalty
            bonusMap.set(building.id, 0.5); // Base bonus
          }

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
    if (!energyPenaltyMap || !sustainabilityBonusMap) {
      // Fallback if algorithm data not ready
      const unblocked = buildings
        .filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id])
        .map(b => b.id);
      return unblocked.length > 0 ? unblocked[0] : gameState.playerPosition;
    }

    try {
      // Get candidate buildings to block
      const candidates = buildings
        .filter(b => !gameState.playerResources[b.id] && !gameState.aiBlocks[b.id])
        .map(b => b.id);

      if (candidates.length === 0) return gameState.playerPosition;

      // FIRST: Try A* to find optimal path through high-value buildings
      const astarNode = planOptimalTaskPath();
      if (astarNode && candidates.includes(astarNode)) {
        setGameState(prev => ({
          ...prev,
          message: `🤖 AI blocked ${astarNode} (strategic path interruption)`
        }));
        return astarNode;
      }

      // FALLBACK: Use minimax algorithm to find best building to block
      setGameState(prev => ({
        ...prev,
        minimaxUses: prev.minimaxUses + 1,
      }));

      const minimaxResult = minimaxOpeningAction(
        candidates,
        energyPenaltyMap,
        sustainabilityBonusMap,
        2 // depth for minimax search
      );

      // Enhance decision with distance matrix: prefer buildings closer to player
      let selectedBuilding = minimaxResult.bestAction;
      if (distanceMatrix && buildingCoordinates) {
        const playerCoords = buildingCoordinates[gameState.playerPosition];
        if (playerCoords) {
          // Score candidates by minimax value + proximity to player
          let bestScore = -Infinity;
          candidates.forEach(building => {
            const coords = buildingCoordinates[building];
            if (coords) {
              const distance = Math.sqrt(
                Math.pow(coords.lat - playerCoords.lat, 2) +
                Math.pow(coords.lon - playerCoords.lon, 2)
              );
              // Prefer closer buildings (negative distance = lower = better)
              const proximityScore = -distance * 100;
              const energyScore = (energyPenaltyMap.get(building) || 3) * 50;
              const totalScore = proximityScore + energyScore;
              
              if (totalScore > bestScore) {
                bestScore = totalScore;
                selectedBuilding = building;
              }
            }
          });
        }
      }

      // Track minimax decision
      setGameState(prev => ({
        ...prev,
        algorithmResults: {
          ...prev.algorithmResults,
          minimaxDecisions: [
            ...prev.algorithmResults.minimaxDecisions,
            {
              bestBuilding: selectedBuilding,
              score: minimaxResult.evaluationScore,
              candidateCount: candidates.length,
            },
          ],
        },
      }));

      return selectedBuilding;
    } catch (error) {
      console.warn('Minimax failed, using fallback:', error);
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

        return {
          ...prev,
          playerResources: newResources,
          playerScore: prev.playerScore + 10,
          gamePhase: 'aiTurn',
          message: `✅ Correct! Resource placed.`,
          historicalActions: [...prev.historicalActions, `✅ ${pendingAction.resource} placed at ${targetBuilding?.name}`],
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

      const newTurn = prev.turn + 1;
      const gameEnded = newTurn > 10;
      const blockBuilding = buildings.find(b => b.id === blockTarget);

      return {
        ...prev,
        aiBlocks: newBlocks,
        aiScore: prev.aiScore + 3,
        turn: newTurn,
        gamePhase: gameEnded ? 'results' : 'playing',
        message: gameEnded ? '🏁 Game Over!' : `🤖 AI blocked ${blockBuilding?.name}`,
        historicalActions: [...prev.historicalActions, `🤖 Blocked ${blockBuilding?.name}`],
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
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="text-center">
          <p className="text-4xl mb-4">⏳</p>
          <p className="text-xl">{gameState.message}</p>
        </div>
      </div>
    );
  }

  if (gameState.gamePhase === 'results') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-green-400 mb-2">🏁 Game Results</h1>
            <p className="text-slate-300 text-lg">
              {gameState.winner === 'player' ? '🎉 YOU WIN!' : gameState.winner === 'ai' ? '🤖 AI WINS!' : '🤝 TIE!'} 
              {' '}Final Score: <span className="text-green-400">{gameState.playerScore}</span> - <span className="text-red-400">{gameState.aiScore}</span>
            </p>
          </div>

          {/* Algorithm Usage */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-600">
              <div className="text-4xl font-bold text-purple-300 mb-2">{gameState.minimaxUses}</div>
              <p className="text-purple-200 font-semibold">Minimax Decisions</p>
              <p className="text-sm text-purple-300 mt-2">AI used minimax to find optimal blocks</p>
            </div>

            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-600">
              <div className="text-4xl font-bold text-blue-300 mb-2">{gameState.cspUses}</div>
              <p className="text-blue-200 font-semibold">CSP Validations</p>
              <p className="text-sm text-blue-300 mt-2">Player resource placements checked</p>
            </div>

            <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-lg p-6 border border-orange-600">
              <div className="text-4xl font-bold text-orange-300 mb-2">{gameState.astarUses}</div>
              <p className="text-orange-200 font-semibold">A* Path Plans</p>
              <p className="text-sm text-orange-300 mt-2">AI planned optimal task routes</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-900 to-cyan-800 rounded-lg p-6 border border-cyan-600">
              <div className="text-4xl font-bold text-cyan-300 mb-2">{gameState.turn - 1}</div>
              <p className="text-cyan-200 font-semibold">Total Turns</p>
              <p className="text-sm text-cyan-300 mt-2">Game lasted {gameState.turn - 1} rounds</p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-green-400 mb-4">👤 Your Results</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Score:</span>
                  <span className="text-green-400 font-bold">{gameState.playerScore} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Resources Placed:</span>
                  <span className="text-cyan-400 font-bold">{Object.keys(gameState.playerResources).length}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Trivia Correct:</span>
                  <span className="text-blue-400 font-bold">{Math.floor(gameState.playerScore / 10)} questions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">CSP Checks:</span>
                  <span className="text-purple-400 font-bold">{gameState.cspUses} validations</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-red-400 mb-4">🤖 AI Results</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Score:</span>
                  <span className="text-red-400 font-bold">{gameState.aiScore} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Buildings Blocked:</span>
                  <span className="text-amber-400 font-bold">{Object.keys(gameState.aiBlocks).filter(k => gameState.aiBlocks[k]).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Minimax Uses:</span>
                  <span className="text-purple-400 font-bold">{gameState.minimaxUses} decisions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">A* Path Plans:</span>
                  <span className="text-orange-400 font-bold">{gameState.astarUses} plans</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Avg. Score/Turn:</span>
                  <span className="text-red-400 font-bold">{(gameState.aiScore / (gameState.turn - 1)).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithms Used */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 mb-8">
            <h2 className="text-xl font-bold text-green-400 mb-4">🧠 Detailed Algorithm Results</h2>
            
            {/* Minimax Results */}
            <div className="mb-6">
              <div className="bg-slate-700 rounded p-4 mb-3">
                <p className="font-semibold text-purple-300">⚔️ Minimax Algorithm - {gameState.minimaxUses} decisions made</p>
                <p className="text-sm text-slate-300 mt-1">Game tree search evaluated candidate positions 2 moves ahead</p>
              </div>
              {gameState.algorithmResults.minimaxDecisions.length > 0 ? (
                <div className="bg-slate-900 rounded p-3 max-h-40 overflow-y-auto space-y-2">
                  {gameState.algorithmResults.minimaxDecisions.map((decision, idx) => (
                    <div key={idx} className="text-xs text-slate-300 border-l-2 border-purple-600 pl-2">
                      <span className="text-purple-400">Turn {idx + 1}</span>: Evaluated <span className="font-bold">{decision.candidateCount}</span> candidates, picked <span className="font-bold text-green-400">{decision.bestBuilding}</span> (score: {decision.score.toFixed(1)})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No decisions recorded</p>
              )}
            </div>

            {/* CSP Results */}
            <div className="mb-6">
              <div className="bg-slate-700 rounded p-4 mb-3">
                <p className="font-semibold text-blue-300">🔗 CSP Algorithm - {gameState.cspUses} validations performed</p>
                <p className="text-sm text-slate-300 mt-1">Constraint satisfaction validated resource placements</p>
              </div>
              {gameState.algorithmResults.cspValidations.length > 0 ? (
                <div className="bg-slate-900 rounded p-3 max-h-40 overflow-y-auto space-y-2">
                  {gameState.algorithmResults.cspValidations.map((validation, idx) => (
                    <div key={idx} className="text-xs text-slate-300 border-l-2 border-blue-600 pl-2">
                      <span className="text-blue-400">Check {idx + 1}</span>: <span className="font-bold">{validation.resource}</span> at <span className="font-bold">{validation.building}</span> → <span className={validation.valid ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{validation.valid ? '✓ VALID' : '✗ REJECTED'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No validations recorded</p>
              )}
            </div>

            {/* A* Results */}
            <div className="mb-6">
              <div className="bg-slate-700 rounded p-4 mb-3">
                <p className="font-semibold text-orange-300">🗺️ A* Pathfinding - {gameState.astarUses} path plans</p>
                <p className="text-sm text-slate-300 mt-1">Heuristic search found optimal task routes through campus</p>
              </div>
              {gameState.algorithmResults.astarPlans.length > 0 ? (
                <div className="bg-slate-900 rounded p-3 max-h-40 overflow-y-auto space-y-2">
                  {gameState.algorithmResults.astarPlans.map((plan, idx) => (
                    <div key={idx} className="text-xs text-slate-300 border-l-2 border-orange-600 pl-2">
                      <span className="text-orange-400">Plan {idx + 1}</span>: Path with <span className="font-bold">{plan.path.length}</span> nodes through <span className="font-bold">{plan.taskCount}</span> high-value targets (cost: {plan.score.toFixed(1)}) → <span className="text-orange-300">{plan.path.join(' → ')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No plans recorded</p>
              )}
            </div>
          </div>

          {/* Game Summary */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 mb-8">
            <h2 className="text-xl font-bold text-green-400 mb-4">📋 Game Summary</h2>
            <div className="bg-slate-700 rounded p-4 text-sm text-slate-300 space-y-2 max-h-48 overflow-y-auto">
              {gameState.historicalActions.map((action, idx) => (
                <p key={idx} className="text-slate-400">Turn {idx + 1}: {action}</p>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={resetGame} 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
            >
              🔄 Play Again
            </Button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg font-semibold text-lg border border-slate-600"
            >
              🏠 Home
            </button>
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
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-green-400">🌱 Eco Campus Strategy Game</h1>
        <p className="text-slate-300 text-sm">Real UST Campus Data • Search + Minimax + CSP + Trivia</p>
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Map */}
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4 overflow-auto">
          <svg className="w-full h-full" viewBox="0 0 500 450" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#0f5c4e', stopOpacity: 0.3 }} />
                <stop offset="50%" style={{ stopColor: '#164e63', stopOpacity: 0.2 }} />
                <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.4 }} />
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

        {/* Controls */}
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 flex flex-col overflow-auto space-y-3">
          <div className="space-y-2">
            <div className="bg-green-900 p-3 rounded">
              <p className="text-xs text-green-200">YOUR SCORE</p>
              <p className="text-2xl font-bold text-green-300">{gameState.playerScore}</p>
            </div>
            <div className="bg-red-900 p-3 rounded">
              <p className="text-xs text-red-200">AI SCORE</p>
              <p className="text-2xl font-bold text-red-300">{gameState.aiScore}</p>
            </div>
            <div className="bg-slate-700 p-2 rounded text-center">
              <p className="text-xs text-slate-300">TURN {gameState.turn}/10</p>
            </div>
          </div>

          <div className="bg-slate-700 p-3 rounded flex-1 text-sm">
            <p className="text-white mb-2">{gameState.message}</p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>📍 You: <span className="text-green-300">{playerBuilding?.code}</span></p>
              <p>🤖 AI: <span className="text-red-300">{aiBuilding?.code}</span></p>
              <p>♻️ Resources: {resourceCount}/5 | 🚫 Blocked: {blockedCount}</p>
            </div>
          </div>

          {gameState.gamePhase === 'trivia' && currentQuestion && (
            <div className="bg-cyan-900 border border-cyan-700 rounded p-3 space-y-2">
              <p className="text-cyan-300 text-xs font-bold">💡 ANSWER TO PLACE</p>
              <p className="text-white text-xs font-semibold">{currentQuestion.question}</p>
              <div className="space-y-1">
                {currentQuestion.answers.map((answer, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnswer(idx);
                      handleAnswerQuestion(idx);
                    }}
                    disabled={selectedAnswer !== null}
                    className={`w-full p-2 rounded text-xs font-medium transition-all ${
                      selectedAnswer !== null
                        ? idx === currentQuestion.correctAnswer
                          ? 'bg-green-600'
                          : idx === selectedAnswer ? 'bg-red-600' : 'bg-slate-700'
                        : 'bg-slate-700 hover:bg-slate-600 border border-cyan-400'
                    } text-white`}
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
                <p className="text-xs text-slate-400 font-bold mb-2">MOVE TO</p>
                <div className="grid grid-cols-2 gap-1">
                  {getAdjacentBuildings(gameState.playerPosition).map(adjId => {
                    const adj = buildings.find(b => b.id === adjId);
                    return (
                      <button
                        key={adjId}
                        onClick={() => handleMoveToBuilding(adjId)}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs border border-slate-600"
                      >
                        {adj?.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold mb-2">PLACE RESOURCE</p>
                <div className="space-y-1">
                  {resourceTypes.map(resource => (
                    <button
                      key={resource}
                      onClick={() => handlePlaceResource(resource)}
                      className="w-full bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-2 rounded text-xs border border-cyan-600 font-semibold"
                    >
                      ♻️ {resource.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {gameState.gameEnded && (
            <div className={`p-3 rounded border-2 text-center ${
              gameState.winner === 'player' ? 'bg-green-900 border-green-700'
                : gameState.winner === 'ai' ? 'bg-red-900 border-red-700'
                : 'bg-yellow-900 border-yellow-700'
            }`}>
              <p className="text-lg font-bold mb-1">
                {gameState.winner === 'player' ? '🎉 YOU WIN!' : gameState.winner === 'ai' ? '🤖 AI WINS!' : '🤝 TIE!'}
              </p>
              <p className="text-sm mb-2">{gameState.playerScore} - {gameState.aiScore}</p>
              <Button onClick={resetGame} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs">
                Play Again
              </Button>
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
