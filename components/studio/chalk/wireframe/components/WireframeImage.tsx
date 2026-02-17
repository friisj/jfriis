import type { ImageComponent } from "@/lib/studio/chalk/wireframe/schema";

type Props = ImageComponent["props"];

export function WireframeImage({ width, height, alt }: Props) {
  return (
    <div
      className="border-2 border-gray-800 bg-gray-100 flex items-center justify-center relative"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="w-full h-full p-4"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400"
          />
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400"
          />
        </svg>
      </div>
      <span className="text-xs font-mono text-gray-500 absolute bottom-1 left-1 bg-white px-1">
        {alt}
      </span>
    </div>
  );
}
