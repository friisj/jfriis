import type { ContainerComponent } from "@/lib/studio/chalk/wireframe/schema";
import { WireframeText } from "./WireframeText";
import { WireframeButton } from "./WireframeButton";
import { WireframeInput } from "./WireframeInput";
import { WireframeList } from "./WireframeList";
import { WireframeImage } from "./WireframeImage";
import { WireframeDivider } from "./WireframeDivider";

type Props = ContainerComponent["props"];

export function WireframeContainer({
  label,
  orientation,
  children,
  width = "auto",
  height = "auto",
}: Props) {
  const flexDirection = orientation === "vertical" ? "flex-col" : "flex-row";
  const widthStyle = width === "auto" ? "w-auto" : `w-[${width}px]`;
  const heightStyle = height === "auto" ? "h-auto" : `h-[${height}px]`;

  return (
    <div
      className={`border-2 border-gray-800 bg-white p-4 ${flexDirection} ${widthStyle} ${heightStyle} flex gap-4`}
    >
      <div className="text-xs text-gray-500 font-mono mb-2">[{label}]</div>
      {children.map((child, index) => (
        <ComponentRenderer key={index} component={child} />
      ))}
    </div>
  );
}

function ComponentRenderer({ component }: { component: any }) {
  const componentType = component.id || component.type;

  switch (componentType) {
    case "container":
      return <WireframeContainer {...component.props} />;
    case "text":
      return <WireframeText {...component.props} />;
    case "button":
      return <WireframeButton {...component.props} />;
    case "input":
      return <WireframeInput {...component.props} />;
    case "list":
      return <WireframeList {...component.props} />;
    case "image":
      return <WireframeImage {...component.props} />;
    case "divider":
      return <WireframeDivider {...component.props} />;
    default:
      return null;
  }
}
