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
      className="flex items-center gap-1 px-2 py-0.5 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
      title="Copy code"
    >
      {copied ? <><Check size={10} className="text-green-400" /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  );
}

function extractText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children) return extractText(children.props.children);
  return '';
}

export default function MarkdownMessage({ content }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[15px] font-bold mt-4 mb-2 first:mt-0 pb-1.5 border-b border-current/10">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14px] font-bold mt-3.5 mb-1.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2.5 space-y-1.5 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2.5 space-y-1.5 pl-5 list-decimal">{children}</ol>
          ),
          li: ({ children, node }) => {
            const isOrdered = node?.position && false; // let CSS handle ol vs ul
            return (
              <li className="text-sm leading-relaxed chat-li">{children}</li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-[color:inherit] brightness-110">{children}</strong>
          ),
          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
          // Code blocks — only for actual programming code
          pre: ({ children }) => {
            const codeChild = React.Children.toArray(children).find(
              c => c?.props?.className || c?.type === 'code'
            );
            const lang = codeChild?.props?.className?.replace('language-', '') || 'code';
            const codeText = extractText(codeChild?.props?.children || children).replace(/\n$/, '');

            return (
              <div className="my-2.5 rounded-lg overflow-hidden code-block-container">
                <div className="code-block-header px-3 py-1.5 text-[10px] flex items-center justify-between">
                  <span className="uppercase tracking-wider opacity-60">{lang}</span>
                  <CodeBlockCopy code={codeText} />
                </div>
                <pre className="code-block-body p-3 overflow-x-auto">
                  <code className="text-xs font-mono leading-relaxed">{codeChild?.props?.children || children}</code>
                </pre>
              </div>
            );
          },
          code: ({ children }) => (
            <code className="font-mono text-[0.85em] font-medium opacity-95">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[3px] border-accent/40 pl-3 my-2.5 opacity-85 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-current/10">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-current/10 px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wider opacity-60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-current/10 px-3 py-2 text-sm">{children}</td>
          ),
          hr: () => <hr className="my-4 border-current/10" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
