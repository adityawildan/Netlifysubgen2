import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icon';

interface FileUploadProps {
  onFileChange: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl text-center">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative block w-full rounded-lg border-2 border-dashed p-12 transition-colors duration-200 ${
          isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept="audio/*,video/*"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
          <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
          <span className="mt-4 block text-lg font-semibold text-gray-200">
            Drop file audio/video di sini mase
          </span>
          <span className="mt-1 block text-sm text-gray-400">or click to browse</span>
        </label>
      </div>
       <p className="text-xs text-gray-500 mt-4">Max file size: 50MB. Supported formats include MP3, WAV, MP4, MOV, etc.</p>
    </div>
  );
};

export default FileUpload;
