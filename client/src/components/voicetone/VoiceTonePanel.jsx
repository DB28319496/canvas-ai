import React, { useState } from 'react';
import { X, Palette, Check, Sparkles, FileText } from 'lucide-react';

const presetTones = [
  { id: 'professional', label: 'Professional', desc: 'Clear, polished, and business-appropriate' },
  { id: 'casual', label: 'Casual', desc: 'Friendly, conversational, and relaxed' },
  { id: 'academic', label: 'Academic', desc: 'Formal, precise, and well-structured' },
  { id: 'creative', label: 'Creative', desc: 'Expressive, vivid, and engaging' },
  { id: 'witty', label: 'Witty', desc: 'Clever, humorous, and sharp' },
  { id: 'motivational', label: 'Motivational', desc: 'Uplifting, energetic, and inspiring' }
];

export default function VoiceTonePanel({ isOpen, onClose, settings, onSettingsChange }) {
  const [activeTab, setActiveTab] = useState('tone');

  if (!isOpen) return null;

  const { preset, customDescription, writingSamples } = settings;

  const handlePresetToggle = (id) => {
    const current = preset || [];
    const updated = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id];
    onSettingsChange({ ...settings, preset: updated });
  };

  const handleDescriptionChange = (e) => {
    onSettingsChange({ ...settings, customDescription: e.target.value });
  };

  const handleSamplesChange = (e) => {
    onSettingsChange({ ...settings, writingSamples: e.target.value });
  };

  const hasSettings = (preset?.length > 0) || customDescription?.trim() || writingSamples?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[520px] max-h-[80vh] bg-canvas-panel border border-canvas-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-canvas-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Palette size={18} className="text-accent" />
            <span className="text-sm font-semibold text-white">Voice & Tone</span>
            {hasSettings && (
              <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                Active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-canvas-border flex-shrink-0">
          <button
            onClick={() => setActiveTab('tone')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'tone'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Sparkles size={12} className="inline mr-1.5" />
            Tone Presets
          </button>
          <button
            onClick={() => setActiveTab('describe')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'describe'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Palette size={12} className="inline mr-1.5" />
            Describe Your Style
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'samples'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <FileText size={12} className="inline mr-1.5" />
            Writing Samples
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'tone' && (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Select one or more tone presets. The AI will blend them when generating content.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {presetTones.map((tone) => {
                  const isSelected = preset?.includes(tone.id);
                  return (
                    <button
                      key={tone.id}
                      onClick={() => handlePresetToggle(tone.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-canvas-border bg-canvas-bg/50 hover:border-gray-600'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'border-accent bg-accent' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{tone.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{tone.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'describe' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Describe your personal voice and style in your own words. The more specific, the better the AI can match your tone.
              </p>
              <textarea
                value={customDescription || ''}
                onChange={handleDescriptionChange}
                placeholder={"Example: I write in a conversational, down-to-earth way. I use short sentences and avoid jargon. I like to open with a hook or question. My humor is dry and understated. I speak directly to the reader using \"you\" and \"we\"."}
                className="w-full min-h-[160px] text-sm text-gray-200 bg-canvas-bg border border-canvas-border rounded-xl p-4 outline-none focus:border-accent resize-none leading-relaxed placeholder-gray-600"
              />
              <div className="mt-3 p-3 bg-canvas-bg/50 rounded-lg border border-canvas-border">
                <div className="text-[11px] text-gray-500 font-medium mb-1.5">Tips for great results:</div>
                <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside">
                  <li>Mention sentence length preference (short & punchy vs. flowing)</li>
                  <li>Note any words or phrases you use often</li>
                  <li>Describe your opening/closing style</li>
                  <li>Mention if you use humor, metaphors, or data</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Paste 1-3 examples of your writing. The AI will analyze your patterns and mirror your style when creating content.
              </p>
              <textarea
                value={writingSamples || ''}
                onChange={handleSamplesChange}
                placeholder={"Paste examples of your writing here — blog posts, scripts, social media captions, emails, etc.\n\nThe AI will pick up on your:\n• Sentence structure and rhythm\n• Word choice and vocabulary level\n• How you open and close pieces\n• Your use of questions, humor, or storytelling"}
                className="w-full min-h-[200px] text-sm text-gray-200 bg-canvas-bg border border-canvas-border rounded-xl p-4 outline-none focus:border-accent resize-none leading-relaxed placeholder-gray-600"
              />
              {writingSamples?.trim() && (
                <div className="mt-2 text-[11px] text-gray-500">
                  {writingSamples.split(/\s+/).length} words pasted
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-canvas-border flex-shrink-0">
          <button
            onClick={() => onSettingsChange({ preset: [], customDescription: '', writingSamples: '' })}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
