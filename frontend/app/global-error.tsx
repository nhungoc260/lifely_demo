"use client";

/** Lỗi nghiêm trọng ở chính layout gốc: dùng HTML tối giản, không phụ thuộc provider nào. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h1>LIFELY is temporarily unavailable</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 12, border: 0, background: "#9f1239", color: "#fff", cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
