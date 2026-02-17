import type { DividerComponent } from "@/lib/studio/chalk/wireframe/schema";

type Props = DividerComponent["props"];

export function WireframeDivider({ orientation }: Props) {
  const className =
    orientation === "horizontal"
      ? "border-t-2 border-gray-800 w-full my-2"
      : "border-l-2 border-gray-800 h-full mx-2";

  return <div className={className} />;
}
