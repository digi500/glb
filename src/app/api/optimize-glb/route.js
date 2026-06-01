import { NextResponse } from "next/server";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const ratio = parseFloat(formData.get("ratio") || "0.5");
    const error = parseFloat(formData.get("error") || "0.01");

    if (!file) {
      return NextResponse.json({ error: "GLB file is required" }, { status: 400 });
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Initialize the WebAssembly simplifier
    await MeshoptSimplifier.ready;

    // Load document using gltf-transform NodeIO
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.readBinary(uint8Array);

    // Apply optimization: weld vertices first, then simplify
    await document.transform(
      weld({ tolerance: 0.0001 }),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: ratio,
        error: error
      })
    );

    // Write back to binary GLB
    const optimizedGlb = io.writeBinary(document);

    // Return the optimized GLB binary
    return new Response(optimizedGlb, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": `attachment; filename="optimized_${file.name || "model.glb"}"`
      }
    });

  } catch (error) {
    console.error("Error in optimize-glb:", error);
    return NextResponse.json(
      { error: "Failed to optimize GLB: " + error.message },
      { status: 500 }
    );
  }
}
