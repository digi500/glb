import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 });
    }

    const apiToken = req.headers.get("x-replicate-token") || process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: "API key is missing. Please configure it in your Settings panel." },
        { status: 401 }
      );
    }

    // Call Replicate API to get prediction status
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to fetch prediction status" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in check-prediction:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
