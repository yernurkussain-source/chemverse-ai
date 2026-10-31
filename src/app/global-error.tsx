"use client";

// Негізгі layout құлағанда ғана көрінеді: стильдер мен аудармалар жүктелмейді, сондықтан үш тілде, кірістірілген стильмен
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="kk">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f7fb", color: "#0b1020" }}>
        <title>CHEMVERSE AI</title>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "64px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Бірдеңе дұрыс болмады</h1>
          <p style={{ color: "#5b6478" }}>Что-то пошло не так · Something went wrong</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "12px 24px", border: 0, borderRadius: 999, background: "#0891b2", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            Қайта көру · Повторить · Try again
          </button>
          <p style={{ marginTop: 16 }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- layout құлаған: бетті толық қайта жүктеу керек */}
            <a href="/" style={{ color: "#0891b2" }}>
              CHEMVERSE AI
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
