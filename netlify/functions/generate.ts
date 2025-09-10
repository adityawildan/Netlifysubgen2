// netlify/functions/generate.ts

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  // ... (environment variable checks)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const bucketName = 'audio-uploads';
  let filePath = '';

  try {
    const body = await request.json();
    filePath = body.filePath; // We now receive the filePath

    if (!filePath) {
      throw new Error("filePath is required in the request body.");
    }

    // --- 1. GET A TEMP DOWNLOAD LINK FOR GEMINI ---
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 300); // URL is valid for 5 minutes (300 seconds)

    if (signedUrlError) {
      throw new Error(`Could not get file URL for Gemini: ${signedUrlError.message}`);
    }

    // --- 2. CALL GEMINI API WITH THE FILE URL ---
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
    const model = 'gemini-1.5-flash';

    // Instead of inlineData, we provide the URI of the file in Supabase
    const audioPart = {
      fileData: {
        mimeType: 'audio/mpeg', // Generic, Gemini will infer from the file
        uri: signedUrlData.signedUrl,
      },
    };

    const prompt = `You are an expert audio transcriptionist...`; // Your detailed prompt
    const schema = { /* Your schema */ };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: { responseMimeType: "application/json", responseSchema: schema },
    });

    const transcription = response.text.trim();

    // --- 3. DELETE FROM SUPABASE ---
    // (This logic remains the same)
    const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

    if (deleteError) {
        console.error("Failed to delete temporary file from Supabase:", deleteError);
    }

    // --- 4. RETURN RESULT TO USER ---
    return new Response(transcription, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function failed:", error);
    // ... (cleanup and error handling)
  }
}
