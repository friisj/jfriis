'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Brain, Sparkles, Clock, Zap } from 'lucide-react';

interface StepMetrics {
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
}

interface ThinkingChain {
  originalPrompt: string;
  referenceAnalysis?: string[];
  refinedPrompt?: string;
  metrics?: {
    vision?: StepMetrics;
    reasoning?: StepMetrics;
    generation?: StepMetrics;
    total?: StepMetrics;
  };
}

interface ThinkingChainViewerProps {
  thinkingChain: ThinkingChain;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(tokensIn?: number, tokensOut?: number): string | null {
  if (!tokensIn && !tokensOut) return null;
  const parts = [];
  if (tokensIn) parts.push(`${tokensIn} in`);
  if (tokensOut) parts.push(`${tokensOut} out`);
  return parts.join(' / ');
}

function MetricsBadge({ metrics, label }: { metrics?: StepMetrics; label?: string }) {
  if (!metrics) return null;
  const tokens = formatTokens(metrics.tokensIn, metrics.tokensOut);

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
      <Clock className="w-2.5 h-2.5" />
      {formatDuration(metrics.durationMs)}
      {tokens && (
        <>
          <span className="text-muted-foreground/50">|</span>
          <Zap className="w-2.5 h-2.5" />
          {tokens}
        </>
      )}
    </span>
  );
}

export function ThinkingChainViewer({ thinkingChain }: ThinkingChainViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedRefs, setExpandedRefs] = useState<number[]>([]);

  const hasVision = thinkingChain.referenceAnalysis && thinkingChain.referenceAnalysis.length > 0;

  const toggleRef = (index: number) => {
    setExpandedRefs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const totalMetrics = thinkingChain.metrics?.total;

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-950/30 flex items-center justify-between text-sm hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-purple-800 dark:text-purple-200">
          <Brain className="w-4 h-4" />
          Thinking Chain
          {totalMetrics && (
            <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400">
              ({formatDuration(totalMetrics.durationMs)} total)
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-purple-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-purple-600" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-4 bg-background">
          {/* Step 1: Original Prompt */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">1</span>
              Original Prompt
            </div>
            <div className="ml-7 p-2 bg-slate-50 dark:bg-slate-900 rounded text-sm">
              {thinkingChain.originalPrompt}
            </div>
          </div>

          {/* Step 2: Vision Analysis (if available) */}
          {hasVision && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px]">2</span>
                <Eye className="w-3 h-3" />
                Vision Analysis
                <span className="text-muted-foreground">({thinkingChain.referenceAnalysis!.length} refs)</span>
                <MetricsBadge metrics={thinkingChain.metrics?.vision} />
              </div>
              <div className="ml-7 space-y-2">
                {thinkingChain.referenceAnalysis!.map((analysis, index) => (
                  <div key={index} className="border rounded">
                    <button
                      onClick={() => toggleRef(index)}
                      className="w-full px-2 py-1.5 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium">Reference {index + 1}</span>
                      {expandedRefs.includes(index) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                    {expandedRefs.includes(index) && (
                      <div className="px-2 pb-2 text-xs text-muted-foreground whitespace-pre-wrap border-t bg-blue-50/50 dark:bg-blue-950/20">
                        {analysis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Refined Prompt */}
          {thinkingChain.refinedPrompt && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-[10px]">
                  {hasVision ? '3' : '2'}
                </span>
                <Sparkles className="w-3 h-3" />
                Refined Prompt
                <MetricsBadge metrics={thinkingChain.metrics?.reasoning} />
              </div>
              <div className="ml-7 p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm border border-green-200 dark:border-green-800">
                {thinkingChain.refinedPrompt}
              </div>
            </div>
          )}

          {/* Arrow to output with generation metrics */}
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-px bg-muted-foreground/30" />
              <span className="flex items-center gap-1.5">
                generates
                {thinkingChain.metrics?.generation && (
                  <MetricsBadge metrics={thinkingChain.metrics.generation} />
                )}
              </span>
              <div className="w-8 h-px bg-muted-foreground/30" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
