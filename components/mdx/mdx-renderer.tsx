import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { SpecimenEmbed } from './specimen-embed'

interface MdxRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown content with support for custom components
 * Used on public pages to display project and log entry content
 */
export function MdxRenderer({ content, className = '' }: MdxRendererProps) {
  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom component for embedding specimens
          // Usage in markdown: <Specimen id="simple-card" />
          specimen: (props: any) => <SpecimenEmbed {...props} />,
          Specimen: (props: any) => <SpecimenEmbed {...props} />,
        } as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
