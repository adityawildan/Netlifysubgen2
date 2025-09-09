import { GoogleGenAI, Type } from "@google/genai";

// Main handler for the serverless function.
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
  }

  // API Key is securely accessed from environment variables on the server
  if (!process.env.API_KEY) {
    return new Response(JSON.stringify({ error: "API_KEY environment variable is not set on the server." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // The request now contains the Base64 encoded file data.
    const body = await request.json();
    const { mimeType, data } = body;

    if (!mimeType || !data) {
        return new Response(JSON.stringify({ error: "Missing mimeType or data in request body." }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    // Prepare the file data for the Gemini API
    const audioPart = {
      inlineData: {
        mimeType,
        data, // The Base64 string from the request body
      },
    };
    
    const prompt = `You are an expert audio transcriptionist specializing in creating readable subtitles. Your task is to transcribe the provided audio file with extreme accuracy and format it into subtitle segments.

    Generate a list of subtitle segments. Each segment must contain:
    1. A "start" timestamp in "HH:MM:SS,ms" format.
    2. An "end" timestamp in "HH:MM:SS,ms" format.
    3. The "text" of the transcription for that segment.
    
    **Important rules for the "text" field to ensure readability:**
    - Keep subtitle lines short, ideally one or two phrases per segment.
    - Avoid creating very long, multi-line text blocks within a single subtitle segment.
    - Break lines at natural pause points in the speech.
    - It is crucial to split longer sentences into smaller, coherent parts. Prefer to break lines before conjunctions (e.g., "and", "but", "or"), prepositions (e.g., "in", "on", "with"), or at the end of clauses.
    - Each subtitle segment should represent a short, digestible piece of information for the viewer.
    
    Ensure the timestamps are precise and the text is a faithful transcription of the speech in the audio.
    The output must be a valid JSON array matching the provided schema. Do not include any other text or explanations.`;
    
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                text: { type: Type.STRING },
            },
            required: ["start", "end", "text"],
        },
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });
    
    const jsonText = response.text.trim();
    // It's already JSON from the model, so we can pass it through.
    return new Response(jsonText, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("API call failed:", error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to process file with AI model.', details: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}