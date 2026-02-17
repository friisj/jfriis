// @ts-nocheck
import type { WireframeComponent, Wireframe } from "@/lib/studio/chalk/wireframe/schema";
import { WireframeContainer } from "./components/WireframeContainer";
import { WireframeText } from "./components/WireframeText";
import { WireframeButton } from "./components/WireframeButton";
import { WireframeInput } from "./components/WireframeInput";
import { WireframeList } from "./components/WireframeList";
import { WireframeImage } from "./components/WireframeImage";
import { WireframeDivider } from "./components/WireframeDivider";

interface WireframeRendererProps {
  wireframe: Wireframe;
  className?: string;
}

export function WireframeRenderer({
  wireframe,
  className = "",
}: WireframeRendererProps) {
  return (
    <div className={`wireframe-canvas bg-gray-50 p-8 rounded ${className}`}>
      {wireframe.components.map((component, index) => (
        <ComponentRenderer key={index} component={component} />
      ))}
    </div>
  );
}

interface ComponentRendererProps {
  component: WireframeComponent;
}

export function ComponentRenderer({ component }: ComponentRendererProps) {
  // Handle both 'type' field (TypeScript) and 'id' field (from LLM)
  const componentType = (component as any).id || component.type;

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
      console.warn("Unknown component type:", componentType, component);
      return null;
  }
}
