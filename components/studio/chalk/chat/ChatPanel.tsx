"use client";

import { useState, useRef, useEffect } from "react";
import type {
  ChatMessage,
  ChatContext,
  WireframeOption,
} from "@/lib/studio/chalk/types/chat";
import { OptionCard } from "./OptionCard";
import { Loader2, MessageSquare } from "lucide-react";

interface ChatPanelProps {
  context: ChatContext;
  onContextChange: (context: ChatContext) => void;
  onSelectOption: (option: WireframeOption) => void;
  selectedElementName?: string;
}

export function ChatPanel({
  context,
  onContextChange,
  onSelectOption,
  selectedElementName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
      contextType: context.type,
      contextId: context.elementId || context.canvasId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/apps/chalk/api/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          context,
          chatHistory: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate options");
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Here are ${data.options.length} design options for your request:`,
        timestamp: Date.now(),
        contextType: context.type,
        options: data.options,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to generate options"}`,
        timestamp: Date.now(),
        contextType: context.type,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectOption = (option: WireframeOption) => {
    setSelectedOptionId(option.id);
    onSelectOption(option);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header with Context Switcher */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          AI Chat
        </h2>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Context:</label>
          <select
            value={context.type}
            onChange={(e) =>
              onContextChange({
                type: e.target.value as "canvas" | "element",
              })
            }
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="canvas">Canvas</option>
            <option value="element" disabled={!selectedElementName}>
              {selectedElementName
                ? `Element: ${selectedElementName}`
                : "Element (select one first)"}
            </option>
          </select>
        </div>

        {context.type === "canvas" && (
          <p className="text-xs text-gray-500 mt-2">
            Generate new components for your canvas
          </p>
        )}
        {context.type === "element" && selectedElementName && (
          <p className="text-xs text-gray-500 mt-2">
            Focused on: {selectedElementName}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Start a conversation to generate wireframes</p>
            <p className="text-xs mt-1">
              Try: "Create a login form" or "Design a product card"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Options Grid */}
              {message.options && message.options.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {message.options.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      onSelect={handleSelectOption}
                      selected={selectedOptionId === option.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">
                Generating options...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to design..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm self-end"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
