import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { image } = await req.json(); // base64 string or image URL

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const apiToken = req.headers.get("x-replicate-token") || process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: "API key is missing. Please configure it in your Settings panel." },
        { status: 401 }
      );
    }

    // Call Replicate API to remove background
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cjwbw/rembg",
        input: {
          image: image
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to start background removal on Replicate" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in remove-bg:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
