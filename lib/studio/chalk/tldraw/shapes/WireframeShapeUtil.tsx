import {
  BaseBoxShapeUtil,
  DefaultColorStyle,
  HTMLContainer,
  RecordProps,
  T,
  TLBaseShape,
} from "tldraw";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { WireframeComponentWrapper } from "@/components/studio/chalk/canvas/WireframeComponentWrapper";

// Base type for all wireframe shapes
export type WireframeShape = TLBaseShape<
  string,
  {
    w: number;
    h: number;
    component: WireframeComponent;
  }
>;

// Base util class for wireframe shapes
export abstract class WireframeShapeUtil<
  Shape extends WireframeShape
> extends BaseBoxShapeUtil<Shape> {
  static override type: string;

  override canResize = () => true;
  override canBind = () => true;

  override getDefaultProps(): Shape["props"] {
    return {
      w: 200,
      h: 100,
      component: this.getDefaultComponent(),
    };
  }

  // Each shape defines its default component structure
  abstract getDefaultComponent(): WireframeComponent;

  override component(shape: Shape) {
    const bounds = this.getGeometry(shape).bounds;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: bounds.width,
          height: bounds.height,
          pointerEvents: "all",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <WireframeComponentWrapper
          shapeId={shape.id}
          component={shape.props.component}
        >
          {this.renderComponent(shape.props.component)}
        </WireframeComponentWrapper>
      </HTMLContainer>
    );
  }

  override indicator(shape: Shape) {
    const bounds = this.getGeometry(shape).bounds;
    return (
      <rect
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    );
  }

  // Render the wireframe component
  abstract renderComponent(component: WireframeComponent): React.ReactNode;
}
