import type { TextComponent } from "@/lib/studio/chalk/wireframe/schema";

type Props = TextComponent["props"];

export function WireframeText({ content, size, emphasis }: Props) {
  const sizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-2xl",
  };

  const emphasisClass = emphasis === "strong" ? "font-bold" : "font-normal";

  return (
    <div
      className={`font-mono ${sizeClasses[size]} ${emphasisClass} text-gray-900`}
    >
      {content}
    </div>
  );
}
