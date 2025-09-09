import React, { useState, useCallback } from 'react';
import { AppStatus, SubtitleSegment } from './types';
import { generateTranscription } from './services/geminiService';
import { convertToSRT } from './utils/srtConverter';
import FileUpload from './components/FileUpload';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import Loader from './components/Loader';
import { FileIcon, LogoIcon } from './components/Icon';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [file, setFile] = useState<File | null>(null);
  const [srtContent, setSrtContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      // 5MB limit for serverless function payload
      if (selectedFile.size > 5 * 1024 * 1024) { 
        setErrorMessage('File is too large. Kegedean bang, file gabisa lebih dari 5MB.');
        setStatus(AppStatus.Error);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setStatus(AppStatus.FileSelected);
      setErrorMessage('');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setStatus(AppStatus.Processing);
    setErrorMessage('');

    try {
      const transcriptionResult = await generateTranscription(file);
      if (transcriptionResult && transcriptionResult.length > 0) {
        const srt = convertToSRT(transcriptionResult);
        setSrtContent(srt);
        setStatus(AppStatus.Success);
      } else {
        throw new Error('Transcription failed or returned no content. The AI may not have been able to process this file.');
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setErrorMessage(message);
      setStatus(AppStatus.Error);
    }
  }, [file]);

  const handleDownload = () => {
    if (!srtContent) return;
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = file ? file.name.split('.').slice(0, -1).join('.') : 'subtitles';
    a.download = `${fileName}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleReset = () => {
    setFile(null);
    setSrtContent('');
    setErrorMessage('');
    setStatus(AppStatus.Idle);
  };

  const renderContent = () => {
    switch (status) {
      case AppStatus.Processing:
        return <Loader message="Analyzing file... This can take a moment." />;
      case AppStatus.Success:
        return (
          <TranscriptionDisplay 
            srtContent={srtContent} 
            onSrtContentChange={setSrtContent}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        );
      case AppStatus.Error:
        return (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400">Generation Failed</h3>
            <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        );
      case AppStatus.FileSelected:
         return (
            <div className="text-center">
                <div className="flex items-center justify-center text-gray-300">
                    <FileIcon className="w-8 h-8 mr-3" />
                    <span className="font-medium">{file?.name}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  ({(file!.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                    <button
                      onClick={handleReset}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Change File
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Generate Subtitles
                    </button>
                </div>
            </div>
         );
      case AppStatus.Idle:
      default:
        return (
            <FileUpload onFileChange={handleFileChange} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
      <header className="absolute top-0 left-0 p-6 flex items-center">
        <LogoIcon className="w-8 h-8 text-indigo-500"/>
        <h1 className="text-xl font-bold ml-3">AI Subtitle Generator</h1>
      </header>
      <main className="w-full max-w-3xl flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center py-4 text-gray-600 text-sm">
          <p>Powered by Google Gemini. For personal use.</p>
      </footer>
    </div>
  );
};

export default App;
