"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

const components: Partial<Components> = {
  // Links open in a new tab safely
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-muted-foreground/60 underline-offset-2 hover:decoration-foreground"
    />
  ),

  // Inline code
  code: ({ node, className, children, ...props }) => {
    const isInline = !className?.includes("language-");
    if (isInline) {
      return (
        <code
          className="rounded-sm bg-muted px-1 py-px font-mono text-[0.9em] text-foreground/90"
          {...props}
        >
          {children}
        </code>
      );
    }
    // Block code is handled by pre below
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // Fenced code blocks
  pre: ({ node, children, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-sm bg-muted p-3 text-sm font-mono text-foreground/90 border border-border"
      {...props}
    >
      {children}
    </pre>
  ),

  // Lists — tighter than default for chat bubbles
  ul: ({ node, ...props }) => (
    <ul className="my-1.5 list-disc pl-5 space-y-0.5" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-1.5 list-decimal pl-5 space-y-0.5" {...props} />
  ),
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,

  // Paragraphs — reduce vertical rhythm inside bubbles
  p: ({ node, ...props }) => <p className="my-1 leading-relaxed" {...props} />,

  // Strong / emphasis keep the system weight
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,

  // Blockquotes for notes / asides
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground italic"
      {...props}
    />
  ),
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className="agent-markdown text-[15px] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
