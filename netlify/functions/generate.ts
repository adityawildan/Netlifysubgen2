// netlify/functions/generate.ts

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Helper to convert Base64 to a Buffer for Supabase
const base64ToBuffer = (base64: string) => {
  return Buffer.from(base64, 'base64');
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  // UPDATED: Using more specific names for the keys
  const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const missing = [!GEMINI_API_KEY && "GEMINI_API_KEY", !SUPABASE_URL && "SUPABASE_URL", !SUPABASE_SERVICE_KEY && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    return new Response(JSON.stringify({ error: `Missing environment variables: ${missing}` }), { 
        status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const bucketName = 'audio-uploads';
  let fileName = '';

  try {
    const body = await request.json();
    const { mimeType, data } = body;

    if (!mimeType || !data) {
        return new Response(JSON.stringify({ error: "Missing mimeType or data in request body." }), { 
            status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // --- 1. UPLOAD TO SUPABASE ---
    const audioBuffer = base64ToBuffer(data);
    fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.audio`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, audioBuffer, { contentType: mimeType });

    if (uploadError) {
      console.error("Supabase upload failed:", uploadError);
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
    }
    
    // --- 2. CALL GEMINI API ---
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const model = 'gemini-1.5-flash';
    const audioPart = { inlineData: { mimeType, data } };
    
    const prompt = `You are an expert audio transcriptionist...`; // Your detailed prompt
    const schema = { /* Your schema */ };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: { responseMimeType: "application/json", responseSchema: schema },
    });
    
    const transcription = response.text.trim();

    // --- 3. DELETE FROM SUPABASE (after we have the transcription) ---
    const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);
    
    if (deleteError) {
        // We don't stop the function if delete fails, but we log the error.
        console.error("Failed to delete temporary file from Supabase:", deleteError);
    }
    
    // --- 4. RETURN RESULT TO USER ---
    return new Response(transcription, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function failed:", error);

    // If an error happened after the file was uploaded but before it was deleted,
    // we should try to clean it up.
    if (fileName) {
        console.log(`Attempting to clean up failed upload: ${fileName}`);
        await supabase.storage.from(bucketName).remove([fileName]);
    }
    
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to process request.', details: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
