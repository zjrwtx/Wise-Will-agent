"use client";

import { VideoToPdf } from "@/components/VideoToPdf";
import Link from "next/link";

export default function VideoToPdfPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--background)",
    }}>
      {/* Header */}
      <header style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--secondary)",
            textDecoration: "none",
          }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500 }}>返回首页</span>
        </Link>
        <div style={{
          fontSize: 14,
          color: "var(--secondary)",
        }}>
          AI 教育平台
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        padding: "40px 20px",
      }}>
        <VideoToPdf />
      </main>
    </div>
  );
}
