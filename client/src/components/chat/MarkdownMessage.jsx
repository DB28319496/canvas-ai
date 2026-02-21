import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1.5">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-2.5 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ inline, className, children }) => {
          if (inline) {
            return (
              <code className="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            );
          }
          return (
            <div className="my-2 rounded-lg overflow-hidden border border-white/10">
              <div className="bg-white/5 px-3 py-1 text-[10px] text-gray-500 border-b border-white/10">
                {className?.replace('language-', '') || 'code'}
              </div>
              <pre className="bg-black/30 p-3 overflow-x-auto">
                <code className="text-xs font-mono text-gray-200 leading-relaxed">{children}</code>
              </pre>
            </div>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent/50 pl-3 my-2 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-white/10 bg-white/5 px-2 py-1 text-left font-medium">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-white/10 px-2 py-1">{children}</td>
        ),
        hr: () => <hr className="my-3 border-white/10" />
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
