// @ts-nocheck
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { GameRenderer } from '@/lib/studio/ludo/three/GameRenderer';
import { CameraPreset } from '@/lib/studio/ludo/three/camera/presets';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useAnimationStore } from '@/lib/studio/ludo/game/stores/animationStore';
import { useHistoryStore } from '@/lib/studio/ludo/game/stores/historyStore';
import { useDebugStore } from '@/lib/studio/ludo/game/stores/debugStore';
import { Player } from '@/lib/studio/ludo/game/types';
import { logger } from '@/lib/studio/ludo/utils/logger';
import { HelperPanel } from '../UI/HelperPanel';
import { setPhysicsAnimationFn } from '@/lib/studio/ludo/game/dice';
import { gameSoundHooks } from '@/lib/studio/ludo/audio/GameSoundHooks';

/**
 * Clean, refactored Board component using GameRenderer
 * Eliminates useEffect chaos and provides clean separation of concerns
 */
export default function Board() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Camera state
  const [currentCameraPreset, setCurrentCameraPreset] = useState<CameraPreset | null>(CameraPreset.OVERHEAD);

  // Get game state from gameStore
  const gameState = useGameStore();
  const { selectChecker, clearSelection, rollDice, rollOpeningDie } = useGameStore();

  // Get players from flowStore
  const { players } = useFlowStore();

  const { showHelpers } = useHistoryStore();
  const { debugMode } = useDebugStore();

  // Merge game state with players for renderer
  const fullGameState = { ...gameState, players };

  // Initialize renderer once
  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    logger.info('🎬 Initializing GameRenderer...');

    try {
      const renderer = new GameRenderer(canvasRef.current);
      rendererRef.current = renderer;

      // Set initial viewport size to ensure proper camera FOV and rendering
      const rect = canvasRef.current.getBoundingClientRect();
      renderer.handleResize(rect.width, rect.height);
      logger.debug(`🎬 Initial viewport size: ${rect.width}x${rect.height}`);

      // Inject physics animation function into dice roller
      // This allows dice.ts to trigger 3D physics animations
      setPhysicsAnimationFn(async () => {
        if (rendererRef.current) {
          return await rendererRef.current.animateDiceRoll();
        }
        // Fallback if renderer not available
        return [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
      });

      // Set opening die click callback - pass physics result to game state
      renderer.setOpeningDieClickCallback((player: Player, value: number) => {
        rollOpeningDie(player, value);
      });

      // Initial render will be handled by the separate gameState effect
      logger.info('✅ GameRenderer initialized and ready');
    } catch (error) {
      logger.error('❌ Failed to initialize GameRenderer:', error);
    }

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        logger.info('🧹 Cleaning up GameRenderer...');
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      // Clear physics animation function
      setPhysicsAnimationFn(null);
    };
  }, []); // Empty dependency array - initialize once only

  // Update renderer when game state changes
  useEffect(() => {
    if (!rendererRef.current) return;

    rendererRef.current.updateGameState(fullGameState);
  }, [fullGameState]);

  // Handle AI opening rolls
  useEffect(() => {
    if (!rendererRef.current) return;

    const { gamePhase, openingRoll } = gameState;

    if (gamePhase !== 'opening_roll' || !openingRoll) return;

    // If white hasn't rolled yet and white is AI, trigger white to roll
    if (openingRoll.whiteRoll === null && players[Player.WHITE].type === 'ai') {
      logger.info('🤖 Triggering AI (White) opening roll...');
      setTimeout(() => {
        if (rendererRef.current) {
          rendererRef.current.triggerAIOpeningRoll(Player.WHITE);
        }
      }, 500);
    }
    // If white has rolled, black hasn't, and black is AI, trigger black to roll
    else if (openingRoll.whiteRoll !== null &&
             openingRoll.blackRoll === null &&
             players[Player.BLACK].type === 'ai') {
      logger.info('🤖 White rolled, triggering AI (Black) opening roll...');
      setTimeout(() => {
        if (rendererRef.current) {
          rendererRef.current.triggerAIOpeningRoll(Player.BLACK);
        }
      }, 800);
    }
  }, [gameState.gamePhase, gameState.openingRoll, players]);

  // Listen for theme changes from Theme Builder Panel
  useEffect(() => {
    const handleThemeChange = () => {
      if (!rendererRef.current || !canvasRef.current) return;

      logger.info('🎨 Theme changed - rebuilding scene...');

      // Capture camera's relative position (azimuth angle and distance from board center)
      const scene = rendererRef.current.getScene();
      const camera = scene.camera;

      // Calculate azimuth (rotation around Y axis) and distance
      const boardCenter = new THREE.Vector3(0, 0, 0);
      const cameraPos = camera.position.clone();
      const distance = cameraPos.distanceTo(boardCenter);
      const azimuthAngle = Math.atan2(cameraPos.x, cameraPos.z) * (180 / Math.PI);
      const elevationAngle = Math.asin(cameraPos.y / distance) * (180 / Math.PI);

      logger.debug('🎨 Saving camera state:', { azimuthAngle, elevationAngle, distance });

      // Dispose and recreate renderer with new theme
      rendererRef.current.dispose();

      const renderer = new GameRenderer(canvasRef.current);
      rendererRef.current = renderer;

      // Resize canvas WITHOUT adjusting camera (we'll restore it manually)
      const rect = canvasRef.current.getBoundingClientRect();
      const newScene = renderer.getScene();
      newScene.resize(rect.width, rect.height);
      // Skip: renderer.handleResize() - this would call adjustForViewport and rotate camera

      // Restore camera's relative position
      const newCamera = newScene.camera;

      // Convert back to cartesian coordinates
      const azimuthRad = azimuthAngle * (Math.PI / 180);
      const elevationRad = elevationAngle * (Math.PI / 180);

      const newX = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
      const newY = distance * Math.sin(elevationRad);
      const newZ = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);

      newCamera.position.set(newX, newY, newZ);
      newCamera.lookAt(boardCenter);

      // Update the camera's projection matrix after position change
      newCamera.updateProjectionMatrix();

      logger.debug('🎨 Restored camera position:', { x: newX, y: newY, z: newZ });

      // Restore game state
      renderer.updateGameState(gameState);

      // Restore light helpers visibility
      renderer.setLightHelpersVisible(showHelpers);

      // Clear preset indicator since we have custom position
      setCurrentCameraPreset(null);

      // Force a render to show the updated scene
      renderer.forceRender();

      logger.info('✅ Scene rebuilt with new theme (camera position preserved)');
    };

    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, [gameState, showHelpers]);

  // Handle canvas resize using ResizeObserver (watches canvas element, not just window)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!rendererRef.current) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        logger.debug(`📐 Canvas resized: ${width}x${height}`);
        rendererRef.current.handleResize(width, height);
      }
    };

    // Use ResizeObserver to watch the canvas element itself
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    logger.info('📐 ResizeObserver attached to canvas element');

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Toggle light helpers based on showHelpers state
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLightHelpersVisible(showHelpers);
    }
  }, [showHelpers]);

  // Camera control handlers
  const handleCameraPresetChange = useCallback((preset: CameraPreset) => {
    if (rendererRef.current) {
      rendererRef.current.switchCameraPreset(preset);
      setCurrentCameraPreset(preset);
      logger.info(`🎥 Camera: ${preset}`);
    }
  }, []);

  const handleCameraReset = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.resetCamera();
      setCurrentCameraPreset(CameraPreset.OVERHEAD);
      logger.info('🎥 Camera Reset');
    }
  }, []);

  const handleCameraRotate = useCallback((degrees: number) => {
    if (rendererRef.current) {
      rendererRef.current.rotateCameraAroundBoard(degrees);
      // Clear preset since we've rotated
      setCurrentCameraPreset(null);
      logger.info(`🔄 Camera rotated ${degrees}°`);
    }
  }, []);

  const handleCameraZoom = useCallback((delta: number) => {
    if (rendererRef.current) {
      rendererRef.current.adjustCameraZoom(delta);
      // Clear preset since we've zoomed
      setCurrentCameraPreset(null);
      logger.info(`🔍 Camera zoom adjusted by ${delta}`);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!rendererRef.current) return;

      switch (event.key.toLowerCase()) {
        // Camera presets
        case '1':
          handleCameraPresetChange(CameraPreset.OVERHEAD);
          break;
        case '2':
          handleCameraPresetChange(CameraPreset.WHITE_PLAYER);
          break;
        case '3':
          handleCameraPresetChange(CameraPreset.BLACK_PLAYER);
          break;
        case '4':
          handleCameraPresetChange(CameraPreset.SIDE_VIEW);
          break;
        case '5':
          handleCameraPresetChange(CameraPreset.CINEMATIC);
          break;
        case 'r':
          handleCameraReset();
          break;

        // Camera rotation
        case 'q':
        case 'arrowleft':
          handleCameraRotate(-45);
          break;
        case 'e':
        case 'arrowright':
          handleCameraRotate(45);
          break;

        // Debug & info
        case 'd':
          // Toggle debug mode
          const debugEnabled = !useDebugStore.getState().debugMode;
          rendererRef.current.setDebugMode(debugEnabled);
          useDebugStore.getState().toggleDebugMode();
          break;
        case 'p':
          // Log performance stats
          logger.info('📊 Performance Stats:', rendererRef.current.getPerformanceStats());
          break;
        case 'i':
          // Log scene info
          rendererRef.current.logSceneInfo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode, handleCameraPresetChange, handleCameraReset, handleCameraRotate]);

  // ============== DICE ROLL ANIMATION ==============
  // Note: Dice animation now happens during rollDice() call via physics engine
  // The animation is triggered by dice.ts which calls the injected physics function
  // No need for separate animation effect here

  // ============== ANIMATION QUEUE CONSUMER ==============

  const animationState = useAnimationStore();
  const { moveChecker } = useGameStore();

  useEffect(() => {
    // Process pending animations from the queue
    if (!rendererRef.current || animationState.isAnimating || !animationState.pendingAnimations || animationState.pendingAnimations.length === 0) {
      return;
    }

    const animation = animationState.pendingAnimations[0];
    const { clearAnimation } = useAnimationStore.getState();

    logger.debug('🎬 Processing queued animation:', animation.id, animation.type, `${animation.from} -> ${animation.to}`);

    // Mark as animating
    useAnimationStore.setState({ isAnimating: true });

    // Get the checker mesh
    const checkerMesh = rendererRef.current.getScene().scene.getObjectByName(animation.checkerId) as THREE.Mesh;
    if (!checkerMesh) {
      logger.warn('🎬 Checker mesh not found for animation, skipping animation:', animation.checkerId);
      clearAnimation(moveChecker);
      return;
    }

    // Get current and target positions
    const player = checkerMesh.userData.player as Player;
    // Use fresh state snapshot to avoid stale closure
    const currentState = useGameStore.getState();

    const fromPos = checkerMesh.position.clone();

    // Special handling for hit moves - animate BOTH checkers simultaneously
    if (animation.type === 'hit') {
      // Find the hit checker at the destination
      const targetPosition = currentState.board.find(pos => pos.pointIndex === animation.to);
      const hitChecker = targetPosition?.checkers.find(c => c.player !== player);
      const hitCheckerMesh = hitChecker
        ? rendererRef.current.getScene().scene.getObjectByName(hitChecker.id) as THREE.Mesh
        : null;

      if (hitChecker && hitCheckerMesh) {
        // Calculate positions BEFORE state changes
        const hitCheckerFromPos = hitCheckerMesh.position.clone(); // This is where attacker will go!
        const hitCheckerPlayer = hitCheckerMesh.userData.player as Player;
        const hitCheckerToPos = rendererRef.current.calculateTargetPosition(24, currentState, hitCheckerPlayer);

        // Create visual effects
        rendererRef.current.createMoveEffect(fromPos, hitCheckerFromPos);
        rendererRef.current.createHitEffect(hitCheckerFromPos);

        logger.debug('🎬 Starting SIMULTANEOUS hit animations (AI/queued):', {
          attacker: `${animation.checkerId}: ${animation.from} -> ${animation.to}`,
          hit: `${hitChecker.id}: ${animation.to} -> BAR`
        });

        // Start BOTH animations at the same time
        Promise.all([
          rendererRef.current.animateCheckerMove(animation.checkerId, fromPos, hitCheckerFromPos, {}),
          rendererRef.current.animateCheckerMove(hitChecker.id, hitCheckerFromPos, hitCheckerToPos, {})
        ]).then(() => {
          logger.debug('🎬 Both hit animations complete');
          clearAnimation(moveChecker);
        }).catch(error => {
          logger.warn('🎬 Hit animation failed:', error);
          clearAnimation(moveChecker);
        });

        return; // Exit early - we've handled the hit animation
      }
    }

    // Regular move or bear-off animation
    const toPos = rendererRef.current.calculateTargetPosition(animation.to, currentState, player);
    const isBearOff = animation.to === 25; // OFF_POSITION
    const animationOptions = isBearOff ? { targetRotation: Math.PI / 2 } : {};

    // Create move trail effect
    rendererRef.current.createMoveEffect(fromPos, toPos);

    // Start the animation
    logger.debug('🎬 Starting animation:', animation.checkerId, `${animation.from} -> ${animation.to}`);

    const animationPromise = rendererRef.current.animateCheckerMove(
      animation.checkerId,
      fromPos,
      toPos,
      animationOptions
    );

    // When animation completes, clear it from queue (which will execute the move)
    animationPromise
      .then(() => {
        logger.debug('🎬 Animation complete:', animation.id);
        clearAnimation(moveChecker);
      })
      .catch(error => {
        logger.warn('🎬 Animation failed:', error);
        clearAnimation(moveChecker); // Still clear the animation even if it failed
      });

  }, [animationState.pendingAnimations, animationState.isAnimating]);

  // ============== GAME INTERACTION LOGIC ==============
  // Define these first to avoid circular dependencies

  const handleCheckerClick = useCallback((checkerId: string, player: Player) => {
    const currentState = useGameStore.getState();

    // Only allow interaction during moving phase with current player's checkers
    if (currentState.gamePhase !== 'moving' || player !== currentState.currentPlayer) {
      // Play error sound for clicking opponent's checker or wrong phase
      gameSoundHooks.playInvalidSelectionWrongPlayer();
      return;
    }

    // Clear any existing click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Delay single-click action to allow double-click to take precedence
    clickTimeoutRef.current = setTimeout(() => {
      const latestState = useGameStore.getState();

      // Check if this checker can move
      const canMove = latestState.availableMoves.some(move => move.checkerId === checkerId);
      logger.debug(`🔍 Checker ${checkerId} can move: ${canMove}`, {
        availableMovesForChecker: latestState.availableMoves.filter(m => m.checkerId === checkerId),
        totalAvailableMoves: latestState.availableMoves.length
      });
      if (!canMove) {
        logger.debug(`❌ Checker ${checkerId} cannot move - early return`);
        // Play softer error sound for own checker that can't move
        gameSoundHooks.playInvalidSelectionCannotMove();
        return;
      }

      if (latestState.selectedChecker === checkerId) {
        // Deselecting current checker
        logger.debug(`🔄 Deselecting checker ${checkerId}`);
        if (rendererRef.current) {
          rendererRef.current.setCheckerSelection(checkerId, false);
        }
        clearSelection();
      } else {
        // Selecting new checker
        logger.debug(`✅ Selecting new checker ${checkerId}`);
        // Clear previous selection first
        if (latestState.selectedChecker && rendererRef.current) {
          logger.debug(`🔄 Clearing previous selection: ${latestState.selectedChecker}`);
          rendererRef.current.setCheckerSelection(latestState.selectedChecker, false);
        }

        // Set new selection
        selectChecker(checkerId);
        if (rendererRef.current) {
          rendererRef.current.setCheckerSelection(checkerId, true);
        }
        // Play positive selection sound
        gameSoundHooks.playCheckerSelect();
        logger.debug(`🎯 Selection complete for ${checkerId}`);
      }

      clickTimeoutRef.current = null;
    }, 200); // 200ms delay to detect double-clicks
  }, [selectChecker, clearSelection]);

  const handleDiceClick = useCallback(async () => {
    const currentState = useGameStore.getState();

    // Allow dice rolling in setup or rolling phases
    if (currentState.gamePhase === 'setup' || currentState.gamePhase === 'rolling') {
      rollDice();

      // Animate dice roll when dice values become available
      // This will be triggered by the game state update
    }
  }, [rollDice]);

  const handlePointClick = useCallback(async (pointIndex: number) => {
    const currentState = useGameStore.getState();

    if (!currentState.selectedChecker || currentState.gamePhase !== 'moving') {
      return;
    }

    // Convert visual coordinates back to game coordinates
    const gamePointIndex = pointIndex === 24 || pointIndex === 25 ? pointIndex : 23 - pointIndex;

    // Find valid move to this point
    const validMove = currentState.availableMoves.find(move =>
      move.checkerId === currentState.selectedChecker && move.to === gamePointIndex
    );

    if (validMove && rendererRef.current) {
      // Determine animation type and check for hit
      const targetPosition = currentState.board.find(pos => pos.pointIndex === gamePointIndex);
      const isBearOff = gamePointIndex === 25; // OFF_POSITION
      const isHit = !isBearOff && targetPosition &&
                    targetPosition.checkers.length === 1 &&
                    targetPosition.checkers[0].player !== currentState.currentPlayer;

      // Clear selection immediately
      clearSelection();
      rendererRef.current.setCheckerSelection(validMove.checkerId, false);

      // If this is a hit move, animate both checkers SIMULTANEOUSLY
      if (isHit && targetPosition) {
        const hitChecker = targetPosition.checkers[0];
        const attackerMesh = rendererRef.current.getScene().scene.getObjectByName(validMove.checkerId) as THREE.Mesh;
        const hitCheckerMesh = rendererRef.current.getScene().scene.getObjectByName(hitChecker.id) as THREE.Mesh;

        if (attackerMesh && hitCheckerMesh) {
          // Calculate positions BEFORE any state changes
          const attackerFromPos = attackerMesh.position.clone();
          const hitCheckerFromPos = hitCheckerMesh.position.clone(); // This is where attacker will go!
          const _player = attackerMesh.userData.player as Player;
          const hitCheckerPlayer = hitCheckerMesh.userData.player as Player;

          // Hit checker goes to bar
          const hitCheckerToPos = rendererRef.current.calculateTargetPosition(24, currentState, hitCheckerPlayer);

          // Create visual effects
          rendererRef.current.createMoveEffect(attackerFromPos, hitCheckerFromPos);
          rendererRef.current.createHitEffect(hitCheckerFromPos);

          logger.debug('🎬 Starting SIMULTANEOUS hit animations:', {
            attacker: `${validMove.checkerId}: ${validMove.from} -> ${validMove.to}`,
            hit: `${hitChecker.id}: ${gamePointIndex} -> BAR`
          });

          // Start BOTH animations at the same time
          Promise.all([
            rendererRef.current.animateCheckerMove(validMove.checkerId, attackerFromPos, hitCheckerFromPos, {}),
            rendererRef.current.animateCheckerMove(hitChecker.id, hitCheckerFromPos, hitCheckerToPos, {})
          ]).then(() => {
            // Both animations complete - now execute the state update
            logger.debug('🎬 Both hit animations complete - executing move');
            useGameStore.getState().makeMove(validMove);
          }).catch(error => {
            logger.warn('🎬 Hit animation failed:', error);
            useGameStore.getState().makeMove(validMove);
          });
        } else {
          // Fallback if meshes not found
          useGameStore.getState().makeMove(validMove);
        }
      } else {
        // Regular move or bear-off - use animation queue
        const animationType: 'move' | 'bear_off' = isBearOff ? 'bear_off' : 'move';
        const animation: import('@/lib/studio/ludo/game/types').PendingAnimation = {
          id: `human-move-${Date.now()}-${Math.random()}`,
          type: animationType,
          checkerId: validMove.checkerId,
          from: validMove.from,
          to: validMove.to,
          timestamp: Date.now(),
          player: currentState.currentPlayer,
          move: validMove
        };

        logger.debug('🎬 Queueing regular move animation:', animation.id, animation.type, `${animation.from} -> ${animation.to}`);
        useAnimationStore.getState().queueAnimation(animation);
      }
    }
  }, [clearSelection]);

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

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;

    const clickedObject = rendererRef.current.handleClick(event.clientX, event.clientY);
    if (!clickedObject) return;

    const userData = clickedObject.userData;

    if (userData.type === 'checker') {
      // Handle double-click inline to avoid dependency issues
      const currentState = useGameStore.getState();
      
      // Only allow interaction during moving phase with current player's checkers
      if (currentState.gamePhase !== 'moving' || userData.player !== currentState.currentPlayer) {
        return;
      }

      // Clear the single-click timeout to prevent selection
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      // Get all moves for this checker
      const checkerMoves = currentState.availableMoves.filter(move => move.checkerId === userData.id);
      
      // If no moves available for this checker, do nothing
      if (checkerMoves.length === 0) {
        return;
      }
      
      // Group moves by destination to handle doubles properly
      const movesByDestination = new Map<number, typeof checkerMoves>();
      checkerMoves.forEach(move => {
        if (!movesByDestination.has(move.to)) {
          movesByDestination.set(move.to, []);
        }
        movesByDestination.get(move.to)!.push(move);
      });
      
      // If exactly one unique destination, execute it automatically
      if (movesByDestination.size === 1) {
        // Clear any existing selection first
        if (currentState.selectedChecker && rendererRef.current) {
          rendererRef.current.setCheckerSelection(currentState.selectedChecker, false);
        }
        clearSelection();

        // Execute the move with animation
        const validMove = Array.from(movesByDestination.values())[0][0];

        // Determine animation type and check for hit
        const targetPosition = currentState.board.find(pos => pos.pointIndex === validMove.to);
        const isBearOff = validMove.to === 25; // OFF_POSITION
        const isHit = !isBearOff && targetPosition &&
                      targetPosition.checkers.length === 1 &&
                      targetPosition.checkers[0].player !== currentState.currentPlayer;

        if (rendererRef.current) {
          // If this is a hit move, animate both checkers SIMULTANEOUSLY
          if (isHit && targetPosition) {
            const hitChecker = targetPosition.checkers[0];
            const attackerMesh = rendererRef.current.getScene().scene.getObjectByName(validMove.checkerId) as THREE.Mesh;
            const hitCheckerMesh = rendererRef.current.getScene().scene.getObjectByName(hitChecker.id) as THREE.Mesh;

            if (attackerMesh && hitCheckerMesh) {
              const attackerFromPos = attackerMesh.position.clone();
              const hitCheckerFromPos = hitCheckerMesh.position.clone(); // Attacker's target!
              const hitCheckerPlayer = hitCheckerMesh.userData.player as Player;
              const hitCheckerToPos = rendererRef.current.calculateTargetPosition(24, currentState, hitCheckerPlayer);

              rendererRef.current.createMoveEffect(attackerFromPos, hitCheckerFromPos);
              rendererRef.current.createHitEffect(hitCheckerFromPos);

              logger.debug('🎬 SIMULTANEOUS hit animations (dblclick)');

              Promise.all([
                rendererRef.current.animateCheckerMove(validMove.checkerId, attackerFromPos, hitCheckerFromPos, {}),
                rendererRef.current.animateCheckerMove(hitChecker.id, hitCheckerFromPos, hitCheckerToPos, {})
              ]).then(() => {
                useGameStore.getState().makeMove(validMove);
              }).catch(error => {
                logger.warn('🎬 Hit animation failed:', error);
                useGameStore.getState().makeMove(validMove);
              });
            } else {
              useGameStore.getState().makeMove(validMove);
            }
          } else {
            // Regular move or bear-off - use animation queue
            const animationType: 'move' | 'bear_off' = isBearOff ? 'bear_off' : 'move';
            const animation: import('@/lib/studio/ludo/game/types').PendingAnimation = {
              id: `human-dblclick-${Date.now()}-${Math.random()}`,
              type: animationType,
              checkerId: validMove.checkerId,
              from: validMove.from,
              to: validMove.to,
              timestamp: Date.now(),
              player: currentState.currentPlayer,
              move: validMove
            };

            logger.debug('🎬 Queueing double-click move animation:', animation.id, animation.type);
            useAnimationStore.getState().queueAnimation(animation);
          }
        } else {
          useGameStore.getState().makeMove(validMove);
        }
      } else if (movesByDestination.size > 1) {
        // Multiple destinations available - fallback to selection behavior
        if (currentState.selectedChecker && rendererRef.current) {
          rendererRef.current.setCheckerSelection(currentState.selectedChecker, false);
        }
        selectChecker(userData.id);
        if (rendererRef.current) {
          rendererRef.current.setCheckerSelection(userData.id, true);
        }
      }
    }
  }, [clearSelection, selectChecker]);

  // Canvas interaction - detect clicks vs drags to not interfere with OrbitControls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    let pointerDownPos: { x: number; y: number } | null = null;
    let pointerDownTime: number = 0;

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY };
      pointerDownTime = performance.now();
      logger.debug('🖱️ Pointer down:', { x: event.clientX, y: event.clientY });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerDownPos) return;

      // Calculate distance moved
      const dx = event.clientX - pointerDownPos.x;
      const dy = event.clientY - pointerDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = performance.now() - pointerDownTime;

      logger.debug('🖱️ Pointer up:', { distance, duration });

      // Only treat as click if didn't move much and was quick
      if (distance < 10 && duration < 300) {
        logger.debug('🖱️ Detected click (not drag)');
        // Convert to React mouse event format
        const mouseEvent = {
          clientX: event.clientX,
          clientY: event.clientY
        } as React.MouseEvent<HTMLCanvasElement>;
        handleCanvasClick(mouseEvent);
      } else {
        logger.debug('🖱️ Detected drag/orbit (not click)');
      }

      pointerDownPos = null;
    };

    // Use throttled hover handler with requestAnimationFrame
    let hoverScheduled = false;
    const handlePointerMove = (event: PointerEvent) => {
      // Only process hover if no buttons pressed (not dragging)
      if (event.buttons === 0 && !hoverScheduled) {
        hoverScheduled = true;
        requestAnimationFrame(() => {
          handleCanvasMouseMove({
            clientX: event.clientX,
            clientY: event.clientY
          } as React.MouseEvent<HTMLCanvasElement>);
          hoverScheduled = false;
        });
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      logger.debug('🖱️ Double click detected');
      handleCanvasDoubleClick({
        clientX: event.clientX,
        clientY: event.clientY
      } as React.MouseEvent<HTMLCanvasElement>);
    };

    // Attach native event listeners
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('dblclick', handleDoubleClick);

    logger.info('🎮 Canvas event listeners attached (click detection, hover)');
    logger.info('🎮 OrbitControls: drag to orbit, scroll to zoom, right-click to pan');

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleCanvasClick, handleCanvasMouseMove, handleCanvasDoubleClick]);

  // ============== RENDER ==============

  return (
    <div className="relative w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        tabIndex={0} // Make focusable for keyboard events
        style={{ outline: 'none' }}
      />

      {/* Consolidated Helper Panel - middle-left (conditional based on showHelpers) */}
      {showHelpers && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
          <HelperPanel
            currentCameraPreset={currentCameraPreset}
            onPresetChange={handleCameraPresetChange}
            onReset={handleCameraReset}
            onRotate={handleCameraRotate}
            onZoom={handleCameraZoom}
            // eslint-disable-next-line react-hooks/refs
            renderer={rendererRef.current}
          />
        </div>
      )}
    </div>
  );
}