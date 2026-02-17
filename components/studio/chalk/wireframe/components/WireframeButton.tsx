import type { ButtonComponent } from "@/lib/studio/chalk/wireframe/schema";

type Props = ButtonComponent["props"];

export function WireframeButton({ label, variant, size }: Props) {
  const sizeClasses = {
    small: "px-3 py-1 text-sm",
    medium: "px-4 py-2 text-base",
    large: "px-6 py-3 text-lg",
  };

  const borderWidth = variant === "primary" ? "border-4" : "border-2";

  return (
    <button
      className={`${borderWidth} border-gray-800 bg-white font-mono ${sizeClasses[size]} hover:bg-gray-100 transition-colors`}
    >
      {label}
    </button>
  );
}
