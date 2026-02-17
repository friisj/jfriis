import * as THREE from 'three';
import { Player } from '../game/types';
import { getCurrentVariant } from './variants';
import { PositionCalculator } from './PositionCalculator';

// Debug flag for showing IDs
let showDebugIds = false;

export function setDebugIds(enabled: boolean) {
  showDebugIds = enabled;
}

export class GameModels {
  public static createBoard(): THREE.Group {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    const boardGroup = new THREE.Group();

    // Board base
    const boardGeometry = new THREE.BoxGeometry(
      theme.board.dimensions.width, 
      theme.board.dimensions.height, 
      theme.board.dimensions.thickness
    );
    const boardMaterial = new THREE.MeshLambertMaterial({ color: theme.board.color });
    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.receiveShadow = true;
    boardGroup.add(boardMesh);

    // Create points (triangles)
    for (let i = 0; i < variant.gameplay.pointCount; i++) {
      const point = this.createPoint(i);
      boardGroup.add(point);
    }

    // Center bar
    const barGeometry = new THREE.BoxGeometry(
      theme.board.bar.width, 
      theme.board.bar.height, 
      theme.board.bar.thickness
    );
    const barMaterial = new THREE.MeshLambertMaterial({ color: theme.board.bar.color });
    const barMesh = new THREE.Mesh(barGeometry, barMaterial);
    barMesh.position.set(0, theme.board.bar.height / 2 + theme.board.dimensions.height / 2, 0);
    barMesh.userData = { pointIndex: 24, type: 'point' }; // BAR_POSITION
    boardGroup.add(barMesh);

    // Off board area (bear-off)
    const offGeometry = new THREE.BoxGeometry(
      theme.board.off.width, 
      theme.board.off.height, 
      theme.board.off.thickness
    );
    const offMaterial = new THREE.MeshLambertMaterial({ color: theme.board.off.color });
    const offMesh = new THREE.Mesh(offGeometry, offMaterial);
    offMesh.position.set(theme.proportions.offAreaCenterX, theme.board.off.height / 2 + theme.board.dimensions.height / 2, 0);
    offMesh.userData = { pointIndex: 25, type: 'point' }; // OFF_POSITION
    boardGroup.add(offMesh);

    return boardGroup;
  }

  private static createPoint(index: number): THREE.Mesh {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    const calculator = new PositionCalculator(theme);

    // Determine if this is a top or bottom row point
    const isTopRow = index >= 12;

    // Get triangle geometry parameters
    const { baseOffset, tipOffset } = calculator.getTriangleGeometry(isTopRow);

    // Triangle geometry - create flat on XZ plane
    const halfWidth = theme.points.triangleWidth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, baseOffset);    // Left base point at edge
    shape.lineTo(halfWidth, baseOffset);     // Right base point at edge
    shape.lineTo(0, tipOffset);              // Point extends toward center
    shape.lineTo(-halfWidth, baseOffset);    // Close the shape

    // Configure extrusion based on shape type
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: theme.points.triangleDepth,
      bevelEnabled: theme.points.shape === 'rounded',
      bevelThickness: theme.points.shape === 'rounded' ? 0.02 : 0,
      bevelSize: theme.points.shape === 'rounded' ? 0.05 : 0,
      bevelSegments: theme.points.shape === 'rounded' ? 3 : 0
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Rotate geometry to lay flat on XZ plane (horizontal)
    geometry.rotateX(-Math.PI / 2);

    // Alternate colors
    const color = (index % 2 === 0) ? theme.points.alternateColors[0] : theme.points.alternateColors[1];
    const material = new THREE.MeshLambertMaterial({ color });

    const point = new THREE.Mesh(geometry, material);

    // Use PositionCalculator to get the point position
    const position = calculator.getPointPosition(index);
    // Position point - triangles sit flush on board surface
    // X: horizontal position (left to right)
    // Y: flush with board top surface (extrusion extends upward)
    // Z: 0 (centered), triangles extend outward in ±Z via their geometry
    point.position.set(position.x, theme.board.dimensions.height / 2, 0);

    point.userData = { pointIndex: index, type: 'point' };

    // Add debug label if enabled
    if (showDebugIds) {
      const label = this.createTextLabel(`P${index}`, 0.5);
      // Position label at the tip of the triangle (where it extends toward center)
      if (isTopRow) {
        label.position.set(0, 1.0, -4.0);
      } else {
        label.position.set(0, 1.0, 4.0);
      }
      point.add(label);
    }

    return point;
  }

  public static createChecker(player: Player, id: string): THREE.Mesh {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    
    const geometry = new THREE.CylinderGeometry(
      theme.checkers.radius.top, 
      theme.checkers.radius.bottom, 
      theme.checkers.height, 
      theme.checkers.segments
    );
    const color = theme.checkers.colors[player];
    const material = new THREE.MeshLambertMaterial({ color });
    
    const checker = new THREE.Mesh(geometry, material);
    checker.castShadow = true;
    checker.userData = { 
      type: 'checker', 
      player, 
      id,
      isSelected: false 
    };
    
    // Add debug label if enabled
    if (showDebugIds) {
      const label = this.createTextLabel(id, 0.3);
      label.position.set(0, 0.5, 0); // Higher above the checker
      checker.add(label);
    }
    
    return checker;
  }

  public static createDice(value: number, player?: Player): THREE.Mesh {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    
    const geometry = new THREE.BoxGeometry(theme.dice.size, theme.dice.size, theme.dice.size);
    const diceColor = player ? theme.dice.colors[player].face : theme.dice.colors[Player.WHITE].face;
    const material = new THREE.MeshLambertMaterial({ color: diceColor });
    
    const dice = new THREE.Mesh(geometry, material);
    dice.castShadow = true;
    dice.userData = { type: 'dice', value };
    
    // Add dots for the dice value (simplified)
    this.addDiceDots(dice, value, player);
    
    return dice;
  }

  private static addDiceDots(dice: THREE.Mesh, value: number, player?: Player): void {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    
    const dotGeometry = new THREE.SphereGeometry(theme.dice.dotRadius, theme.dice.dotSegments, theme.dice.dotSegments);
    const dotColor = player ? theme.dice.colors[player].dots : theme.dice.colors[Player.WHITE].dots;
    const dotMaterial = new THREE.MeshLambertMaterial({ color: dotColor });
    
    // Simplified dot placement for now
    const dotPositions = this.getDotPositions(value);
    
    dotPositions.forEach(pos => {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(pos);
      dice.add(dot);
    });
  }

  private static getDotPositions(value: number): THREE.Vector3[] {
    const variant = getCurrentVariant();
    const theme = variant.theme;
    const positions: THREE.Vector3[] = [];
    const offset = theme.dice.size / 2 + 0.01; // Just outside the cube face
    
    switch (value) {
      case 1:
        positions.push(new THREE.Vector3(0, 0, offset));
        break;
      case 2:
        positions.push(new THREE.Vector3(-0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0.1, -0.1, offset));
        break;
      case 3:
        positions.push(new THREE.Vector3(-0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0, 0, offset));
        positions.push(new THREE.Vector3(0.1, -0.1, offset));
        break;
      case 4:
        positions.push(new THREE.Vector3(-0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0.1, 0.1, offset));
        positions.push(new THREE.Vector3(-0.1, -0.1, offset));
        positions.push(new THREE.Vector3(0.1, -0.1, offset));
        break;
      case 5:
        positions.push(new THREE.Vector3(-0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0, 0, offset));
        positions.push(new THREE.Vector3(-0.1, -0.1, offset));
        positions.push(new THREE.Vector3(0.1, -0.1, offset));
        break;
      case 6:
        positions.push(new THREE.Vector3(-0.1, 0.1, offset));
        positions.push(new THREE.Vector3(0.1, 0.1, offset));
        positions.push(new THREE.Vector3(-0.1, 0, offset));
        positions.push(new THREE.Vector3(0.1, 0, offset));
        positions.push(new THREE.Vector3(-0.1, -0.1, offset));
        positions.push(new THREE.Vector3(0.1, -0.1, offset));
        break;
    }
    
    return positions;
  }

  private static createTextLabel(text: string, size: number): THREE.Mesh {
    // Create canvas for text with higher resolution
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Set larger canvas size for better text quality
    canvas.width = 256;
    canvas.height = 128;
    
    // Clear canvas with transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style text - larger and more visible
    context.fillStyle = '#ffff00'; // Bright yellow
    context.font = `bold ${Math.floor(size * 200)}px Arial`; // Larger font
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add thick black outline for maximum visibility
    context.strokeStyle = '#000000';
    context.lineWidth = 8;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create material and mesh
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false, // Always show on top
      alphaTest: 0.1 // Don't render fully transparent pixels
    });
    
    const geometry = new THREE.PlaneGeometry(size * 3, size * 1.5); // Wider for better readability
    const mesh = new THREE.Mesh(geometry, material);
    
    // Always face camera and add slight rotation to be more readable
    mesh.rotation.x = 0; // Flat horizontal
    mesh.rotation.z = 0; // No rotation
    
    return mesh;
  }

  public static getPointPosition(pointIndex: number): THREE.Vector3 {
    const variant = getCurrentVariant();
    const calculator = new PositionCalculator(variant.theme);
    return calculator.getPointPosition(pointIndex);
  }

  public static getCheckerStackPosition(pointIndex: number, stackIndex: number, player?: Player): THREE.Vector3 {
    const variant = getCurrentVariant();
    const calculator = new PositionCalculator(variant.theme);
    return calculator.getCheckerStackPosition(pointIndex, stackIndex, player);
  }
}