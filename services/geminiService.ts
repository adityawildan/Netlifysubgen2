import type { SubtitleSegment } from '../types';

/**
 * Reads a File object and converts it to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result includes a data URL prefix (e.g., "data:audio/mpeg;base64,").
      // We only need the part after the comma.
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateTranscription = async (file: File): Promise<SubtitleSegment[]> => {
    if (!file) {
        throw new Error("No file provided for transcription.");
    }

    try {
        // 1. Convert the file to a Base64 string to send in the request body.
        const base64Data = await fileToBase64(file);
        
        // 2. Call our single Netlify function with the file data.
        const generateUrl = '/.netlify/functions/generate';

        const response = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mimeType: file.type,
                data: base64Data, // Pass the Base64 encoded file data
            }),
        });
        
        const result = await response.json();

        if (!response.ok) {
            const errorMessage = result.error || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return result as SubtitleSegment[];

    } catch (error) {
        console.error("Transcription generation failed:", error);
        if (error instanceof Error) {
            // Avoid nesting error messages if it's our own thrown error.
            if (error.message.startsWith('Request failed')) {
                throw error;
            }
            throw new Error(`Failed to generate transcription. Please try again. (${error.message})`);
        }
        throw new Error("An unknown error occurred during transcription.");
    }
};