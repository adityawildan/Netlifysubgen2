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
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), { 
          status: 500, headers: { 'Content-Type': 'application/json' }
      });
  }
  
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const bucketName = 'audio-uploads';
  let filePath = '';

  try {
    const body = await request.json();
    filePath = body.filePath;
    const mimeType = body.mimeType;

    if (!filePath || !mimeType) {
      throw new Error("filePath and mimeType are required in the request body.");
    }
    
    // --- NEW: DOWNLOAD THE FILE FROM SUPABASE ---
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file from Supabase: ${downloadError.message}`);
    }
    if (!fileBlob) {
      throw new Error("Downloaded file is empty.");
    }
    
    // --- NEW: CONVERT FILE TO BASE64 ---
    const fileBuffer = await fileBlob.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');
    
    // --- CALL GEMINI API WITH THE RAW DATA (inlineData) ---
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
    const model = 'gemini-1.5-flash';
    
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data, // Back to using the Base64 string
      },
    };
    
    const prompt = `You are an expert audio transcriptionist...`; // Your prompt
    const schema = { /* Your schema */ };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: { responseMimeType: "application/json", responseSchema: schema },
    });
    
    const transcription = response.text.trim();

    // --- DELETE FROM SUPABASE ---
    const { error: deleteError } = await supabase.storage.from(bucketName).remove([filePath]);
    if (deleteError) {
        console.error("Failed to delete temporary file from Supabase:", deleteError);
    }
    
    return new Response(transcription, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Caught an error in the handler:", error);
    // ... cleanup and error handling
    if (filePath) {
        await supabase.storage.from(bucketName).remove([filePath]);
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to process request.', details: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
