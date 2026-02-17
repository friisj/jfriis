import type { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";

export type ChatContextType = "canvas" | "element";

export interface ChatContext {
  type: ChatContextType;
  canvasId?: string;
  elementId?: string;
  elementData?: any;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  contextType: ChatContextType;
  contextId?: string;
  // For assistant messages with options
  options?: WireframeOption[];
}

export interface WireframeOption {
  id: string;
  title: string;
  rationale: string;
  principles: string[];
  wireframe: {
    components: WireframeComponent[];
  };
}

export interface GenerateOptionsRequest {
  prompt: string;
  context: ChatContext;
  chatHistory?: ChatMessage[];
}

export interface GenerateOptionsResponse {
  options: WireframeOption[];
  usage?: any;
}
