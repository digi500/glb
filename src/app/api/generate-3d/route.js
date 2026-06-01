import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { image, model = "charles-dyfis-net/trellis" } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image URL or Base64 is required" }, { status: 400 });
    }

    const apiToken = req.headers.get("x-replicate-token") || process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: "API key is missing. Please configure it in your Settings panel." },
        { status: 401 }
      );
    }

    // Prepare inputs based on model
    let input = { image: image };

    // Charles-Dyfis-Net/Trellis specific parameters
    if (model === "charles-dyfis-net/trellis") {
      input = {
        image: image,
        mesh_simplify: 0.95, // Higher quality mesh, we'll decimate it in post-processing ourselves
        texture_size: 1024
      };
    }

    // Call Replicate API to generate 3D model
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        input: input
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || `Failed to start 3D model generation with ${model}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in generate-3d:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
