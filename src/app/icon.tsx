import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #0ea5e9 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#fbbf24",
          }}
        />
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -1,
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
