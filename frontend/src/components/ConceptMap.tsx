"use client";

import { useEffect, useRef, useState } from "react";

// 概念节点
export interface ConceptNode {
  id: string;
  label: string;
  description?: string;
  status: "unexplored" | "explored" | "current";
}

// 概念边
export interface ConceptEdge {
  source: string;
  target: string;
  relation: string;
}

// 概念地图
export interface ConceptMapData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  currentFocus?: string;
}

interface ConceptMapProps {
  data: ConceptMapData;
  onNodeClick: (nodeId: string) => void;
  isLoading?: boolean;
}

// 节点位置计算 - 简单的力导向布局
function calculateLayout(nodes: ConceptNode[], edges: ConceptEdge[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  const width = 280;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  // 找到当前焦点节点
  const currentNode = nodes.find((n) => n.status === "current");
  const currentId = currentNode?.id;

  if (nodes.length === 0) return positions;

  if (nodes.length === 1) {
    positions[nodes[0].id] = { x: centerX, y: centerY };
    return positions;
  }

  // 将当前节点放在中心
  if (currentId) {
    positions[currentId] = { x: centerX, y: centerY };
  }

  // 找出与当前节点直接相连的节点
  const connectedNodes = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source === currentId) connectedNodes.add(edge.target);
    if (edge.target === currentId) connectedNodes.add(edge.source);
  });

  // 将相连节点围绕中心排列
  const connectedArray = Array.from(connectedNodes);
  const radius = 100;
  connectedArray.forEach((nodeId, index) => {
    const angle = (2 * Math.PI * index) / connectedArray.length - Math.PI / 2;
    positions[nodeId] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  // 剩余节点放在外圈
  const remainingNodes = nodes.filter(
    (n) => !positions[n.id] && n.id !== currentId
  );
  const outerRadius = 160;
  remainingNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / remainingNodes.length - Math.PI / 2;
    positions[node.id] = {
      x: centerX + outerRadius * Math.cos(angle),
      y: centerY + outerRadius * Math.sin(angle),
    };
  });

  return positions;
}

export function ConceptMap({ data, onNodeClick, isLoading }: ConceptMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (data.nodes.length > 0) {
      const newPositions = calculateLayout(data.nodes, data.edges);
      setPositions(newPositions);
    }
  }, [data.nodes, data.edges]);

  if (data.nodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--secondary)",
          padding: 20,
          textAlign: "center",
        }}
      >
        <svg
          style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.5 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p style={{ fontSize: 14 }}>开始学习后，</p>
        <p style={{ fontSize: 14 }}>知识地图将在这里展开</p>
      </div>
    );
  }

  const getNodeColor = (status: ConceptNode["status"]) => {
    switch (status) {
      case "current":
        return "#3b82f6";
      case "explored":
        return "#22c55e";
      case "unexplored":
        return "#6b7280";
    }
  };

  const getNodeBorderColor = (status: ConceptNode["status"]) => {
    switch (status) {
      case "current":
        return "#60a5fa";
      case "explored":
        return "#4ade80";
      case "unexplored":
        return "#9ca3af";
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 标题 */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--secondary)" }}>
          知识地图
        </span>
        {isLoading && (
          <span
            style={{
              fontSize: 11,
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                animation: "pulse 1s infinite",
              }}
            />
            更新中
          </span>
        )}
      </div>

      {/* SVG 地图 */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 280 400"
          style={{ display: "block" }}
        >
          {/* 边 */}
          {data.edges.map((edge, index) => {
            const sourcePos = positions[edge.source];
            const targetPos = positions[edge.target];
            if (!sourcePos || !targetPos) return null;

            return (
              <g key={`edge-${index}`}>
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="var(--border)"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                {/* 关系标签 */}
                <text
                  x={(sourcePos.x + targetPos.x) / 2}
                  y={(sourcePos.y + targetPos.y) / 2 - 4}
                  fontSize={9}
                  fill="var(--secondary)"
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}

          {/* 节点 */}
          {data.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const isHovered = hoveredNode === node.id;
            const isCurrent = node.status === "current";
            const nodeRadius = isCurrent ? 28 : 24;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={() => onNodeClick(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* 光晕效果 (当前节点) */}
                {isCurrent && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 8}
                    fill={getNodeColor(node.status)}
                    opacity={0.15}
                  />
                )}

                {/* 悬停效果 */}
                {isHovered && !isCurrent && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 4}
                    fill={getNodeColor(node.status)}
                    opacity={0.2}
                  />
                )}

                {/* 节点圆 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={getNodeColor(node.status)}
                  stroke={getNodeBorderColor(node.status)}
                  strokeWidth={2}
                  opacity={node.status === "unexplored" ? 0.7 : 1}
                />

                {/* 节点标签 */}
                <text
                  x={pos.x}
                  y={pos.y}
                  fontSize={isCurrent ? 11 : 10}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight={isCurrent ? 600 : 400}
                >
                  {node.label.length > 5
                    ? node.label.slice(0, 5) + "..."
                    : node.label}
                </text>

                {/* 状态图标 */}
                {node.status === "unexplored" && (
                  <text
                    x={pos.x + nodeRadius - 4}
                    y={pos.y - nodeRadius + 4}
                    fontSize={10}
                    fill="white"
                  >
                    ?
                  </text>
                )}
                {node.status === "explored" && (
                  <text
                    x={pos.x + nodeRadius - 6}
                    y={pos.y - nodeRadius + 6}
                    fontSize={10}
                    fill="white"
                  >
                    ✓
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 悬停提示 */}
        {hoveredNode && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              padding: "8px 12px",
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 2 }}>
              {data.nodes.find((n) => n.id === hoveredNode)?.label}
            </div>
            <div style={{ color: "var(--secondary)", fontSize: 11 }}>
              {data.nodes.find((n) => n.id === hoveredNode)?.description ||
                "点击探索此概念"}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "var(--secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
            }}
          />
          当前
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
          已探索
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#6b7280",
            }}
          />
          待探索
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
