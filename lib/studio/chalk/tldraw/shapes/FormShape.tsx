// @ts-nocheck
import { T } from "tldraw";
import { WireframeShapeUtil, WireframeShape } from "./WireframeShapeUtil";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { ComponentRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer";

export type FormShape = WireframeShape & {
  type: "wireframe:form";
};

export class FormShapeUtil extends WireframeShapeUtil<FormShape> {
  static override type = "wireframe:form" as const;

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
        label: "Login Form",
        orientation: "vertical",
        children: [
          {
            id: "text",
            type: "content",
            fidelity: 1,
            props: {
              content: "Login",
              size: "large",
              emphasis: "strong",
            },
          },
          {
            id: "input",
            type: "interactive",
            fidelity: 1,
            props: {
              label: "Email",
              placeholder: "Enter your email",
              type: "email",
              required: true,
            },
          },
          {
            id: "input",
            type: "interactive",
            fidelity: 1,
            props: {
              label: "Password",
              placeholder: "Enter your password",
              type: "password",
              required: true,
            },
          },
          {
            id: "button",
            type: "interactive",
            fidelity: 1,
            props: {
              label: "Log In",
              variant: "primary",
              size: "medium",
            },
          },
        ],
      },
    };
  }

  override getDefaultProps(): FormShape["props"] {
    return {
      w: 300,
      h: 400,
      component: this.getDefaultComponent(),
    };
  }

  renderComponent(component: WireframeComponent): React.ReactNode {
    return (
      <div className="p-4">
        <ComponentRenderer component={component} />
      </div>
    );
  }
}
