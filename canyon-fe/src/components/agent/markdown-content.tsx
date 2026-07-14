"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

const components: Partial<Components> = {
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-muted-foreground/60 underline-offset-2 hover:decoration-foreground"
    />
  ),

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
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  pre: ({ node, children, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-sm border border-border bg-muted p-3 font-mono text-sm text-foreground/90"
      {...props}
    >
      {children}
    </pre>
  ),

  ul: ({ node, ...props }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-5" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5" {...props} />
  ),
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,

  p: ({ node, ...props }) => <p className="my-1 leading-relaxed" {...props} />,

  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,

  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground"
      {...props}
    />
  ),

  // GFM tables — match product hairline tables
  table: ({ node, ...props }) => (
    <div className="my-2 overflow-x-auto rounded-sm border border-border bg-card">
      <table className="w-full caption-bottom text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="border-b border-border [&_tr]:border-b" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="[&_tr:last-child]:border-0" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="border-b border-border transition-colors hover:bg-secondary/40" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th
      className="h-9 px-3 text-left align-middle font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td className="px-3 py-2 align-middle text-sm" {...props} />
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
