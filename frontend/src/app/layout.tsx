import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 教育助手 - 智能可视化学习平台",
  description: "使用 AI 生成互动可视化教程，让学习更直观、更有趣",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
