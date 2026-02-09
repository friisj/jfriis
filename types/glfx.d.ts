declare module 'glfx' {
  interface Texture {
    destroy(): void;
  }

  interface Canvas extends HTMLCanvasElement {
    texture(source: HTMLImageElement | HTMLCanvasElement): Texture;
    draw(texture: Texture): Canvas;
    bulgePinch(centerX: number, centerY: number, radius: number, strength: number): Canvas;
    update(): Canvas;
  }

  export function canvas(): Canvas;
}
