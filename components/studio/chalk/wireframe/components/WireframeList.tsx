import type { ListComponent } from "@/lib/studio/chalk/wireframe/schema";
import { WireframeContainer } from "./WireframeContainer";
import { WireframeText } from "./WireframeText";
import { WireframeButton } from "./WireframeButton";
import { WireframeInput } from "./WireframeInput";
import { WireframeImage } from "./WireframeImage";
import { WireframeDivider } from "./WireframeDivider";

type Props = ListComponent["props"];

export function WireframeList({ items, orientation, spacing }: Props) {
  const flexDirection = orientation === "vertical" ? "flex-col" : "flex-row";

  const spacingClasses = {
    tight: "gap-1",
    normal: "gap-3",
    loose: "gap-6",
  };

  return (
    <div className={`flex ${flexDirection} ${spacingClasses[spacing]}`}>
      {items.map((item, index) => (
        <ComponentRenderer key={index} component={item} />
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
