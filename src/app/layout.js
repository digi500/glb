import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "AI 3D GLB Generator & Optimizer | Game-Ready Asset Builder",
  description: "Create premium 3D GLB models from text prompts or uploaded images using state-of-the-art AI, and optimize them in real-time for mobile games or high-fidelity applications.",
  keywords: ["3d generator", "glb builder", "game assets", "image to 3d", "glb optimizer", "3d mesh decimation"],
  robots: "index, follow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        {/* Load model-viewer script as a module */}
        <script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
          defer
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
