// @ts-nocheck
import { T } from "tldraw";
import { WireframeShapeUtil, WireframeShape } from "./WireframeShapeUtil";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { ComponentRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer";

export type ContainerShape = WireframeShape & {
  type: "wireframe:container";
};

export class ContainerShapeUtil extends WireframeShapeUtil<ContainerShape> {
  static override type = "wireframe:container" as const;

  static override props = {
    w: T.number,
    h: T.number,
    component: T.any,
  };

  getDefaultComponent(): WireframeComponent {
    return {
      id: "container",
      type: "layout",
      fidelity: 1,
      props: {
        width: "auto",
        height: "auto",
        label: "Container",
        orientation: "vertical",
        children: [],
      },
    };
  }

  renderComponent(component: WireframeComponent): React.ReactNode {
    return (
      <div className="p-2">
        <ComponentRenderer component={component} />
      </div>
    );
  }
}
