import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Mic, X, GripVertical, Square, ChevronDown, ChevronUp } from 'lucide-react';

export default function VoiceNode({ id, data }) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const recognitionRef = useRef(null);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let fullTranscript = data.transcript || '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += transcript + ' ';
          data.onChange?.(id, { transcript: fullTranscript.trim() });
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [id, data]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Mic size={14} className="text-purple-500" />
          <input
            value={data.label || 'Voice Note'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[150px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3 flex-1 overflow-hidden flex flex-col">
          {/* Record button */}
          <div className="flex justify-center mb-3">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <Square size={14} fill="white" />
                <span className="text-xs font-medium">Stop Recording</span>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
              >
                <Mic size={14} />
                <span className="text-xs font-medium">
                  {data.transcript ? 'Continue Recording' : 'Start Recording'}
                </span>
              </button>
            )}
          </div>

          {/* Transcript */}
          {(data.transcript || interimText) ? (
            <div className="flex-1 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-1 font-medium">Transcript:</div>
              <div className="text-xs text-gray-700 leading-relaxed">
                {data.transcript}
                {interimText && (
                  <span className="text-gray-400 italic"> {interimText}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-2">
              Click the button to start recording
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}
