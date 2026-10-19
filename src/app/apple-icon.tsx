import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #0ea5e9 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#fbbf24",
            border: "3px solid rgba(255,255,255,0.85)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 26,
            width: 64,
            height: 10,
            borderRadius: 5,
            background: "rgba(255,255,255,0.3)",
            transform: "rotate(-10deg)",
          }}
        />
        <span
          style={{
            fontSize: 92,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -4,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          TJ
        </span>
      </div>
    ),
    { ...size }
  );
}
