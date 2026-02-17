// @ts-nocheck
import { T } from "tldraw";
import { WireframeShapeUtil, WireframeShape } from "./WireframeShapeUtil";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { ComponentRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer";

export type ButtonShape = WireframeShape & {
  type: "wireframe:button";
};

export class ButtonShapeUtil extends WireframeShapeUtil<ButtonShape> {
  static override type = "wireframe:button" as const;

  static override props = {
    w: T.number,
    h: T.number,
    component: T.any,
  };

  getDefaultComponent(): WireframeComponent {
    return {
      id: "button",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "Button",
        variant: "primary",
        size: "medium",
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
