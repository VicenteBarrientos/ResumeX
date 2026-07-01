import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ResumeX — AI-Powered Job Search Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0d1117",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              fontSize: "96px",
              fontWeight: "700",
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            Resume
          </span>
          <span
            style={{
              fontSize: "96px",
              fontWeight: "700",
              color: "#22d3ee",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            X
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            fontWeight: "400",
            color: "#6b7280",
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          AI-Powered Job Search
        </div>
      </div>
    ),
    { ...size }
  );
}
