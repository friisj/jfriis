/**
 * Wireframe Component Schema
 * Defines the structure for low-fidelity wireframe components
 */

export const FIDELITY_LEVELS = {
  SKETCH: 1,
  WIREFRAME: 2,
  LO_FI: 3,
  MID_FI: 4,
  HI_FI: 5,
} as const;

export type FidelityLevel = (typeof FIDELITY_LEVELS)[keyof typeof FIDELITY_LEVELS];

export interface BaseComponent {
  id: string;
  type: ComponentType;
  fidelity: FidelityLevel;
}

export type ComponentType =
  | "container"
  | "text"
  | "button"
  | "input"
  | "list"
  | "image"
  | "divider";

export interface ContainerComponent extends BaseComponent {
  type: "container";
  props: {
    width?: number | "auto";
    height?: number | "auto";
    label: string;
    orientation: "vertical" | "horizontal";
    children: WireframeComponent[];
  };
}

export interface TextComponent extends BaseComponent {
  type: "text";
  props: {
    content: string;
    size: "small" | "medium" | "large";
    emphasis: "normal" | "strong";
  };
}

export interface ButtonComponent extends BaseComponent {
  type: "button";
  props: {
    label: string;
    variant: "primary" | "secondary" | "tertiary";
    size: "small" | "medium" | "large";
  };
}

export interface InputComponent extends BaseComponent {
  type: "input";
  props: {
    label: string;
    placeholder: string;
    type: "text" | "email" | "password" | "number";
    required: boolean;
  };
}

export interface ListComponent extends BaseComponent {
  type: "list";
  props: {
    items: WireframeComponent[];
    orientation: "vertical" | "horizontal";
    spacing: "tight" | "normal" | "loose";
  };
}

export interface ImageComponent extends BaseComponent {
  type: "image";
  props: {
    width: number;
    height: number;
    alt: string;
    placeholder: boolean;
  };
}

export interface DividerComponent extends BaseComponent {
  type: "divider";
  props: {
    orientation: "horizontal" | "vertical";
  };
}

export type WireframeComponent =
  | ContainerComponent
  | TextComponent
  | ButtonComponent
  | InputComponent
  | ListComponent
  | ImageComponent
  | DividerComponent;

export interface Wireframe {
  components: WireframeComponent[];
}

export interface WireframeOption {
  title: string;
  rationale: string;
  principles: string[];
  wireframe: Wireframe;
}

export interface GenerationResponse {
  options: WireframeOption[];
}

/**
 * Component Schema for LLM
 */
export const COMPONENT_SCHEMA = {
  version: "1.0",
  fidelityLevels: {
    1: "sketch",
    2: "wireframe",
    3: "lo-fi",
    4: "mid-fi",
    5: "hi-fi",
  },
  components: [
    {
      id: "container",
      type: "layout",
      fidelity: 1,
      props: {
        width: "number | 'auto'",
        height: "number | 'auto'",
        label: "string",
        orientation: "'vertical' | 'horizontal'",
        children: "Component[]",
      },
    },
    {
      id: "text",
      type: "content",
      fidelity: 1,
      props: {
        content: "string",
        size: "'small' | 'medium' | 'large'",
        emphasis: "'normal' | 'strong'",
      },
    },
    {
      id: "button",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "string",
        variant: "'primary' | 'secondary' | 'tertiary'",
        size: "'small' | 'medium' | 'large'",
      },
    },
    {
      id: "input",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "string",
        placeholder: "string",
        type: "'text' | 'email' | 'password' | 'number'",
        required: "boolean",
      },
    },
    {
      id: "list",
      type: "layout",
      fidelity: 1,
      props: {
        items: "Component[]",
        orientation: "'vertical' | 'horizontal'",
        spacing: "'tight' | 'normal' | 'loose'",
      },
    },
    {
      id: "image",
      type: "content",
      fidelity: 1,
      props: {
        width: "number",
        height: "number",
        alt: "string",
        placeholder: "boolean",
      },
    },
    {
      id: "divider",
      type: "layout",
      fidelity: 1,
      props: {
        orientation: "'horizontal' | 'vertical'",
      },
    },
  ],
};
