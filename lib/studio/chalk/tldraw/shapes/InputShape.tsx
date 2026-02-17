// @ts-nocheck
import { T } from "tldraw";
import { WireframeShapeUtil, WireframeShape } from "./WireframeShapeUtil";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { ComponentRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer";

export type InputShape = WireframeShape & {
  type: "wireframe:input";
};

export class InputShapeUtil extends WireframeShapeUtil<InputShape> {
  static override type = "wireframe:input" as const;

  static override props = {
    w: T.number,
    h: T.number,
    component: T.any,
  };

  getDefaultComponent(): WireframeComponent {
    return {
      id: "input",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "Input",
        placeholder: "Enter text...",
        type: "text",
        required: false,
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
