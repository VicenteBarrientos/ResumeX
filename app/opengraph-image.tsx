import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ResumeX — personal job-search tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(180deg, #f1f3f6 0%, #e2e6ec 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
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
              color: "#1b1d22",
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
              color: "#1d3559",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            X
          </span>
        </div>

        <div
          style={{
            fontSize: "22px",
            fontWeight: "400",
            color: "#6b7280",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Personal job-search tools
        </div>
      </div>
    ),
    { ...size }
  );
}
