"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow effects */}
      <div style={{
        position: "absolute",
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(226,185,110,0.06) 0%, transparent 70%)",
        top: "10%",
        left: "20%",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,195,247,0.05) 0%, transparent 70%)",
        bottom: "15%",
        right: "15%",
        pointerEvents: "none",
      }} />

      {/* Login card */}
      <div style={{
        background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "48px 40px",
        width: "100%",
        maxWidth: 420,
        textAlign: "center",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        {/* Top accent line */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: "linear-gradient(90deg, #FF9933, #FFFFFF, #138808)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }} />

        {/* Logo */}
        <div style={{ fontSize: 52, marginBottom: 16 }}>🇮🇳</div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--gold)",
          marginBottom: 6,
          letterSpacing: "0.02em",
        }}>
          India Travel Tracker
        </h1>
        <p style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 36,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          Tax Records · Family Dashboard
        </p>

        {/* Error message */}
        {error && (
          <div style={{
            background: "rgba(239,83,80,0.1)",
            border: "1px solid rgba(239,83,80,0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "#ef9090",
          }}>
            {error === "AccessDenied"
              ? "⛔ Access denied. Only the authorised account can sign in."
              : "⚠️ Sign-in failed. Please try again."}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "14px 20px",
            background: "#fff",
            color: "#1a1a1a",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
          }}
        >
          {/* Google SVG icon */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.8 33.4 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.2-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.4 35.3 26.8 36 24 36c-5.4 0-9.8-3.6-11.3-8.4l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41.4 35.3 44 30 44 24c0-1.3-.2-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{
          marginTop: 28,
          fontSize: 11,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          Access restricted to authorised account only.<br />
          Session expires after 30 days.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-base)" }} />}>
      <LoginContent />
    </Suspense>
  );
}
