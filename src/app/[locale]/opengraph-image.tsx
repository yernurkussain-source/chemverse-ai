import { ImageResponse } from "next/og";

// Сілтеме WhatsApp, Telegram т.б. жерде бөліскенде шығатын сурет. Әдепкі қаріпте қазақ әріптері жоқ — тек латын мәтіні
export const alt = "CHEMVERSE AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: 80, background: "linear-gradient(135deg, #070b1a 0%, #0d1b3a 100%)", color: "#eef2ff" }}>
        <div style={{ position: "relative", width: 260, height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 260, height: 100, border: "6px solid #22d3ee", borderRadius: "50%", opacity: 0.8 }} />
          <div style={{ position: "absolute", width: 260, height: 100, border: "6px solid #f472b6", borderRadius: "50%", transform: "rotate(60deg)" }} />
          <div style={{ position: "absolute", width: 260, height: 100, border: "6px solid #22d3ee", borderRadius: "50%", transform: "rotate(120deg)", opacity: 0.6 }} />
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#22d3ee" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
            CHEMVERSE<span style={{ color: "#22d3ee", marginLeft: 20 }}>AI</span>
          </div>
          <div style={{ fontSize: 36, color: "#a5b4cf", maxWidth: 700 }}>Chemistry with an AI tutor, 3D &amp; AR molecules and a virtual lab</div>
          <div style={{ fontSize: 28, color: "#22d3ee" }}>KZ · RU · EN</div>
        </div>
      </div>
    ),
    size,
  );
}
