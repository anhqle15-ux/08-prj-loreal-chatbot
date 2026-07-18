// Cloudflare Worker for the L'Oréal chatbot.
// Deploy this script in Cloudflare Workers and add OPENAI_API_KEY as a secret.

export default {
  async fetch(request, env) {
    // Allow the GitHub Pages frontend to call the worker without CORS issues.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle browser preflight checks.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Read the OpenAI key only from the Cloudflare Worker secret.
    const apiKey = env.OPENAI_API_KEY;
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: {
            message: "The worker secret OPENAI_API_KEY is not configured.",
          },
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // The frontend sends a messages array, so the worker forwards it to OpenAI.
    const requestData = await request.json();
    const requestBody = {
      model: "gpt-4.1",
      messages: requestData.messages,
      temperature: 0.7,
      max_completion_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: corsHeaders,
    });
  },
};
