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
      // Handle missing env vars
  }
  
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const bucketName = 'audio-uploads';
  let filePath = '';

  try {
    const body = await request.json();
    filePath = body.filePath;
    const mimeType = body.mimeType;

    // --- SPY MESSAGE 1: Check what we received from the frontend ---
    console.log("--- SPY 1 ---");
    console.log("Received filePath:", filePath);
    console.log("Received mimeType:", mimeType);

    if (!filePath || !mimeType) {
      throw new Error("filePath and mimeType are required in the request body.");
    }
    
    // --- GET A TEMP DOWNLOAD LINK FOR GEMINI ---
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 300); // URL is valid for 5 minutes

    // --- SPY MESSAGE 2: See what Supabase returned ---
    console.log("--- SPY 2 ---");
    console.log("Supabase signed URL data:", JSON.stringify(signedUrlData, null, 2));
    console.log("Supabase signed URL error:", JSON.stringify(signedUrlError, null, 2));
    
    if (signedUrlError) {
      throw new Error(`Supabase error creating signed URL: ${signedUrlError.message}`);
    }
    
    // --- ADDED A MORE ROBUST CHECK ---
    if (!signedUrlData || !signedUrlData.signedUrl) {
        throw new Error("Failed to get a signed URL from Supabase. The data object was empty.");
    }

    const downloadUrl = signedUrlData.signedUrl;

    // --- SPY MESSAGE 3: Check the final URL before sending to Gemini ---
    console.log("--- SPY 3 ---");
    console.log("Final download URL for Gemini:", downloadUrl);
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
    const model = 'gemini-1.5-flash';
    
    const audioPart = {
      fileData: { mimeType: mimeType, uri: downloadUrl },
    };
    
    const prompt = `You are an expert audio transcriptionist...`;
    const schema = { /* Your schema */ };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: { responseMimeType: "application/json", responseSchema: schema },
    });
    
    const transcription = response.text.trim();

    // ... (delete logic and final return)

  } catch (error) {
    // --- SPY MESSAGE 4: Log the final error before exiting ---
    console.error("--- SPY 4 ---");
    console.error("Caught an error in the handler:", error);
    
    // ... (cleanup and error handling)
  }
}
