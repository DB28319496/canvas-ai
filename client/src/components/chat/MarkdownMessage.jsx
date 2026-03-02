import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

function CodeBlockCopy({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      title="Copy code"
    >
      {copied ? <><Check size={10} className="text-green-400" /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  );
}

// Extract text content from React children recursively
function extractText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children) return extractText(children.props.children);
  return '';
}

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
        // Code blocks (```code```) — handled via pre in react-markdown v10
        pre: ({ children }) => {
          // Extract language and text from the inner <code> element
          const codeChild = React.Children.toArray(children).find(
            c => c?.props?.className || c?.type === 'code'
          );
          const lang = codeChild?.props?.className?.replace('language-', '') || 'code';
          const codeText = extractText(codeChild?.props?.children || children).replace(/\n$/, '');

          return (
            <div className="my-2 rounded-lg overflow-hidden border border-white/[0.08]">
              <div className="bg-white/[0.04] px-3 py-1.5 text-[10px] text-gray-500 border-b border-white/[0.08] flex items-center justify-between">
                <span className="uppercase tracking-wider">{lang}</span>
                <CodeBlockCopy code={codeText} />
              </div>
              <pre className="bg-black/20 p-3 overflow-x-auto">
                <code className="text-xs font-mono text-gray-300 leading-relaxed">{codeChild?.props?.children || children}</code>
              </pre>
            </div>
          );
        },
        // Inline code (`code`) only
        code: ({ children }) => (
          <code className="bg-white/[0.06] text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono border border-white/[0.08]">
            {children}
          </code>
        ),
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
