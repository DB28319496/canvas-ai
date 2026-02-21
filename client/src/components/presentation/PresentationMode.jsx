import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import MarkdownMessage from '../chat/MarkdownMessage.jsx';

// Strip HTML for plain text display
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function SlideContent({ node }) {
  const type = node.type;
  const d = node.data || {};

  switch (type) {
    case 'text':
      return (
        <div className="prose prose-invert prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: d.content || '<p>(empty)</p>' }} />
        </div>
      );
    case 'image':
      return (
        <div className="flex flex-col items-center gap-4">
          {d.imageUrl && (
            <img src={d.imageUrl} alt={d.label} className="max-h-[60vh] rounded-xl object-contain" />
          )}
          {d.description && <p className="text-gray-400 text-sm">{d.description}</p>}
        </div>
      );
    case 'pdf':
      return (
        <div>
          <p className="text-gray-400 mb-2">{d.filename} ({d.pageCount || '?'} pages)</p>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-[50vh] overflow-y-auto bg-white/5 p-4 rounded-xl">
            {d.parsedText || '(not parsed)'}
          </pre>
        </div>
      );
    case 'youtube':
      return (
        <div className="flex flex-col items-center gap-4">
          {d.thumbnail && <img src={d.thumbnail} alt={d.title} className="max-h-[40vh] rounded-xl" />}
          <p className="text-lg text-white">{d.title || ''}</p>
          {d.url && <p className="text-sm text-gray-500">{d.url}</p>}
        </div>
      );
    case 'voice':
      return (
        <div className="max-w-2xl">
          <pre className="text-base text-gray-300 whitespace-pre-wrap leading-relaxed">
            {d.transcript || '(no transcript)'}
          </pre>
        </div>
      );
    case 'web':
      return (
        <div className="max-w-2xl">
          {d.title && <p className="text-xl text-white mb-2">{d.title}</p>}
          {d.url && <p className="text-sm text-accent mb-4">{d.url}</p>}
          {d.description && <p className="text-gray-400 mb-4">{d.description}</p>}
          {d.content && (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto bg-white/5 p-4 rounded-xl">
              {d.content.slice(0, 2000)}
            </pre>
          )}
        </div>
      );
    case 'code':
      return (
        <div className="max-w-3xl w-full">
          <p className="text-xs text-gray-500 mb-2">{d.language || 'javascript'}</p>
          <pre className="text-sm text-green-300 bg-black/40 p-6 rounded-xl whitespace-pre-wrap overflow-x-auto font-mono">
            {d.content || '(empty)'}
          </pre>
        </div>
      );
    case 'sticky':
      return (
        <div className="bg-yellow-100 text-yellow-900 rounded-xl p-8 max-w-md text-lg shadow-xl">
          {d.content || '(empty)'}
        </div>
      );
    default:
      return <p className="text-gray-400">{stripHtml(d.content) || '(empty)'}</p>;
  }
}

export default function PresentationMode({ nodes, isOpen, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter out group nodes — they're containers, not content
  const slides = (nodes || []).filter(n => n.type !== 'group');
  const total = slides.length;

  const goNext = useCallback(() => {
    setCurrentSlide(s => Math.min(s + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentSlide(s => Math.max(s - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goPrev, onClose]);

  // Reset slide index when opening
  useEffect(() => {
    if (isOpen) setCurrentSlide(0);
  }, [isOpen]);

  if (!isOpen || total === 0) return null;

  const slide = slides[currentSlide];
  const label = slide?.data?.label || `Slide ${currentSlide + 1}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Maximize2 size={16} className="text-accent" />
          <span className="text-sm text-white font-medium">Presentation Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {currentSlide + 1} / {total}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-12 py-8 overflow-y-auto">
        <div className="text-center max-w-4xl w-full">
          <h1 className="text-2xl font-bold text-white mb-8">{label}</h1>
          <SlideContent node={slide} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pb-6">
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Slide dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? 'bg-accent' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === total - 1}
          className="p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
