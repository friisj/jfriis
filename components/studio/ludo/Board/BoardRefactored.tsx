// @ts-nocheck
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GameRenderer } from '@/lib/studio/ludo/three/GameRenderer';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useDebugStore } from '@/lib/studio/ludo/game/stores/debugStore';
import { Player } from '@/lib/studio/ludo/game/types';

/**
 * Clean, refactored Board component using GameRenderer
 * Eliminates useEffect chaos and provides clean separation of concerns
 */
export default function Board() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  // Get game state with minimal destructuring - combining both stores
  const gameState = {
    ...useGameStore(),
    ...useFlowStore()
  };
  const { selectChecker, makeMove, clearSelection, rollDice } = useGameStore();
  const { debugMode } = useDebugStore();

  // Initialize renderer once
  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    console.log('🎬 Initializing GameRenderer...');

    try {
      const renderer = new GameRenderer(canvasRef.current);
      rendererRef.current = renderer;

      // Initial render will be handled by the separate gameState effect
      console.log('✅ GameRenderer initialized and ready');
    } catch (error) {
      console.error('❌ Failed to initialize GameRenderer:', error);
    }

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        console.log('🧹 Cleaning up GameRenderer...');
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []); // Empty dependency array - initialize once only

  // Update renderer when game state changes
  useEffect(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.updateGameState(gameState);
  }, [gameState]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        rendererRef.current.handleResize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!rendererRef.current) return;
      
      switch (event.key.toLowerCase()) {
        case 'd':
          // Toggle debug mode
          const debugEnabled = !useDebugStore.getState().debugMode;
          rendererRef.current.setDebugMode(debugEnabled);
          useDebugStore.getState().toggleDebugMode();
          break;
        case 'p':
          // Log performance stats
          console.log('📊 Performance Stats:', rendererRef.current.getPerformanceStats());
          break;
        case 'i':
          // Log scene info
          rendererRef.current.logSceneInfo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  // ============== GAME INTERACTION LOGIC ==============
  // Define these first to avoid circular dependencies

  const handleCheckerClick = useCallback((checkerId: string, player: Player) => {
    const currentState = useGameStore.getState();

    // Only allow interaction during moving phase with current player's checkers
    if (currentState.gamePhase !== 'moving' || player !== currentState.currentPlayer) {
      return;
    }

    if (currentState.selectedChecker === checkerId) {
      clearSelection();
    } else {
      selectChecker(checkerId);
    }
  }, [selectChecker, clearSelection]);

  const handleDiceClick = useCallback(() => {
    const currentState = useGameStore.getState();

    // Allow dice rolling in setup or rolling phases
    if (currentState.gamePhase === 'setup' || currentState.gamePhase === 'rolling') {
      rollDice();
    }
  }, [rollDice]);

  const handlePointClick = useCallback((pointIndex: number) => {
    const currentState = useGameStore.getState();

    if (!currentState.selectedChecker || currentState.gamePhase !== 'moving') {
      return;
    }

    // Find valid move to this point
    const validMove = currentState.availableMoves.find(move =>
      move.checkerId === currentState.selectedChecker && move.to === pointIndex
    );

    if (validMove) {
      makeMove(validMove);
    }
  }, [makeMove]);

  // ============== INTERACTION HANDLERS ==============

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;

    const clickedObject = rendererRef.current.handleClick(event.clientX, event.clientY);
    if (!clickedObject) return;

    const userData = clickedObject.userData;

    switch (userData.type) {
      case 'checker':
        handleCheckerClick(userData.id, userData.player);
        break;
      case 'dice':
        handleDiceClick();
        break;
      case 'point':
        handlePointClick(userData.pointIndex);
        break;
    }
  }, [handleCheckerClick, handleDiceClick, handlePointClick]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;

    rendererRef.current.handleMouseMove(event.clientX, event.clientY);
  }, []);

  // ============== RENDER ==============
  
  return (
    <div className="relative w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        tabIndex={0} // Make focusable for keyboard events
        style={{ outline: 'none' }}
      />
      
      {/* Status overlay */}
      <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
        <div>Phase: {gameState.gamePhase}</div>
        <div>Player: {gameState.currentPlayer}</div>
        {gameState.dice && (
          <div>Dice: [{gameState.dice.join(', ')}]</div>
        )}
        {gameState.selectedChecker && (
          <div>Selected: {gameState.selectedChecker}</div>
        )}
        <div className="text-xs text-gray-300 mt-1">
          Press &apos;D&apos; for debug, &apos;P&apos; for performance, &apos;I&apos; for scene info
        </div>
      </div>

      {/* Performance monitoring in development */}
      {process.env.NODE_ENV === 'development' && (
        // eslint-disable-next-line react-hooks/refs
        <PerformanceOverlay renderer={rendererRef.current} />
      )}
    </div>
  );
}

// ============== PERFORMANCE OVERLAY ==============

interface PerformanceOverlayProps {
  renderer: GameRenderer | null;
}

interface PerformanceStats {
  renderer: {
    rendering: {
      currentFPS: number;
      averageFrameTime: number;
      isDirty: boolean;
    };
    objectPool: {
      reuseRatio: number;
    };
  };
  scene: {
    objectCount: number;
  };
}

function PerformanceOverlay({ renderer }: PerformanceOverlayProps) {
  const [stats, setStats] = React.useState<PerformanceStats | null>(null);
  
  useEffect(() => {
    if (!renderer) return;
    
    const interval = setInterval(() => {
      setStats(renderer.getPerformanceStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [renderer]);

  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 text-white text-xs bg-black bg-opacity-70 p-2 rounded font-mono">
      <div>FPS: {stats.renderer.rendering.currentFPS.toFixed(1)}</div>
      <div>Frame Time: {stats.renderer.rendering.averageFrameTime.toFixed(1)}ms</div>
      <div>Objects: {stats.scene.objectCount}</div>
      <div>Pool Efficiency: {(stats.renderer.objectPool.reuseRatio * 100).toFixed(1)}%</div>
      <div className={stats.renderer.rendering.isDirty ? 'text-red-400' : 'text-green-400'}>
        Dirty: {stats.renderer.rendering.isDirty ? 'Yes' : 'No'}
      </div>
    </div>
  );
}