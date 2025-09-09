
import React from 'react';

interface TranscriptionDisplayProps {
  srtContent: string;
  onSrtContentChange: (newContent: string) => void;
  onDownload: () => void;
  onReset: () => void;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ srtContent, onSrtContentChange, onDownload, onReset }) => {
  return (
    <div className="w-full max-w-3xl flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-4">Transcription Successful</h2>
        <p className="text-gray-400 mb-6">Review and edit the generated SRT content below.</p>
      
      <textarea
        value={srtContent}
        onChange={(e) => onSrtContentChange(e.target.value)}
        className="w-full h-80 p-4 font-mono text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        placeholder="SRT content will appear here..."
      />
      <div className="mt-6 flex space-x-4">
        <button
          onClick={onReset}
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Start Over
        </button>
        <button
          onClick={onDownload}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          Download .srt File
        </button>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;
