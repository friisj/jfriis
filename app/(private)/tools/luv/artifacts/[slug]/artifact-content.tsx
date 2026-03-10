'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ArtifactContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-scroll">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
