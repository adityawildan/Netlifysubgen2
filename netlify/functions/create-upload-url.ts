// netlify/functions/create-upload-url.ts

import { createClient } from '@supabase/supabase-js';

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are not set." }), { 
        status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { fileName } = await request.json();
    if (!fileName) {
        return new Response(JSON.stringify({ error: "fileName is required." }), { 
            status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const bucketName = 'audio-uploads';
    const sanitizedFileName = fileName.replace(/\s+/g, '_');
    const filePath = `${Date.now()}-${sanitizedFileName}`;

    // Ask Supabase to create a special upload URL
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      throw error;
    }

    // Send the special URL and the path back to the frontend
    return new Response(JSON.stringify({ signedUrl: data.signedUrl, filePath: filePath }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error creating signed URL:", error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to create signed URL.', details: message }), { 
        status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
