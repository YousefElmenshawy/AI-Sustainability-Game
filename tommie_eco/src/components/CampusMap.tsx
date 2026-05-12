'use client';

import React, { useEffect, useRef } from 'react';

interface Building {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
}

interface GameState {
  playerPosition: string;
  aiPosition: string;
  playerResources: { [key: string]: string };
  aiBlocks: { [key: string]: boolean };
}

interface MapProps {
  buildings: Building[];
  gameState: GameState;
  onBuildingClick: (buildingId: string) => void;
  edges: Array<{ source: string; target: string; distance: number }>;
}

export function CampusMap({ buildings, gameState, onBuildingClick, edges }: MapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate bounds from coordinates
  const getBounds = () => {
    if (buildings.length === 0) return { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 };
    
    let minLat = buildings[0].lat, maxLat = buildings[0].lat;
    let minLon = buildings[0].lon, maxLon = buildings[0].lon;
    
    buildings.forEach(b => {
      minLat = Math.min(minLat, b.lat);
      maxLat = Math.max(maxLat, b.lat);
      minLon = Math.min(minLon, b.lon);
      maxLon = Math.max(maxLon, b.lon);
    });
    
    return { minLat, maxLat, minLon, maxLon };
  };

  const bounds = getBounds();
  const padding = 0.001;

  useEffect(() => {
    if (!canvasRef.current || buildings.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Helper to convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon + padding)) * width;
      const y = ((bounds.maxLat + padding - lat) / (bounds.maxLat - bounds.minLat + padding)) * height;
      return { x, y };
    };

    // Draw edges (paths between buildings)
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const from = buildings.find(b => b.id === edge.source);
      const to = buildings.find(b => b.id === edge.target);
      if (from && to) {
        const start = latLonToCanvas(from.lat, from.lon);
        const end = latLonToCanvas(to.lat, to.lon);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    // Draw buildings
    buildings.forEach(building => {
      const { x, y } = latLonToCanvas(building.lat, building.lon);
      const isPlayer = building.id === gameState.playerPosition;
      const isAI = building.id === gameState.aiPosition;
      const hasResource = gameState.playerResources[building.id];
      const isBlocked = gameState.aiBlocks[building.id];

      // Determine color
      let fillColor = '#3b82f6'; // default blue
      if (isPlayer) fillColor = '#22c55e'; // green
      if (isAI) fillColor = '#ef4444'; // red
      if (isBlocked) fillColor = '#fbbf24'; // amber
      if (hasResource) fillColor = '#06b6d4'; // cyan

      // Draw building circle
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = isBlocked ? 0.6 : 1;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw outline
      if (isPlayer || isAI) {
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Draw label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(building.code, x, y + 18);
    });

    // Draw legend
    const legendX = 10, legendY = 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(legendX, legendY, 120, 110);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, 120, 110);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Legend', legendX + 8, legendY + 15);

    const legendItems = [
      { color: '#22c55e', label: 'You' },
      { color: '#ef4444', label: 'AI' },
      { color: '#06b6d4', label: 'Resource' },
      { color: '#fbbf24', label: 'Blocked' },
    ];

    legendItems.forEach((item, idx) => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX + 12, legendY + 30 + idx * 18, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px sans-serif';
      ctx.fillText(item.label, legendX + 22, legendY + 33 + idx * 18);
    });
  }, [buildings, gameState, edges, bounds]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg bg-slate-900 cursor-pointer"
      onClick={(e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find nearest building
        let nearest = null;
        let nearestDist = Infinity;

        const bounds = getBounds();
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        buildings.forEach(building => {
          const bx = ((building.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon + 0.001)) * width;
          const by = ((bounds.maxLat + 0.001 - building.lat) / (bounds.maxLat - bounds.minLat + 0.001)) * height;
          const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
          if (dist < 15 && dist < nearestDist) {
            nearest = building;
            nearestDist = dist;
          }
        });

        if (nearest) onBuildingClick(nearest.id);
      }}
    />
  );
}
