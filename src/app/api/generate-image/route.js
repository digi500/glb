import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { prompt, model = "black-forest-labs/flux-schnell", aspect_ratio = "1:1" } = await req.json();

    const apiToken = req.headers.get("x-replicate-token") || process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: "API key is missing. Please configure it in your Settings panel." },
        { status: 401 }
      );
    }

    // Call Replicate API to generate image
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait=false" // Async execution to prevent timeout
      },
      body: JSON.stringify({
        // Using newer model deployment format
        model: model,
        input: {
          prompt: prompt,
          aspect_ratio: aspect_ratio,
          output_format: "png"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to start image generation on Replicate" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in generate-image:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
