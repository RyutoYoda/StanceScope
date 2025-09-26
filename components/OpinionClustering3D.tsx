import React, { useMemo, useState, useEffect } from 'react';

interface OpinionClustering3DProps {
  comments: string[];
}

interface ClusterPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  label: string;
  size: number;
  groupId: number;
  comment: string;
}

export function OpinionClustering3D({ comments }: OpinionClustering3DProps) {
  const [rotation, setRotation] = useState({ x: -20, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Generate cluster data from comments
  const clusterPoints = useMemo(() => {
    const groups = 5;
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    const labels = ['支持派', '懐疑派', '中立派', '批判派', '分析派'];

    return comments.slice(0, 80).map((comment, index) => {
      const groupId = Math.floor(Math.random() * groups);
      const angle = (index / 80) * Math.PI * 2;
      const radius = 180 + Math.random() * 120;

      // Create cluster-based positions
      const clusterOffset = groupId * (Math.PI * 2 / groups);
      const x = Math.cos(angle + clusterOffset) * radius + (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 240 + Math.sin(groupId) * 60;
      const z = Math.sin(angle + clusterOffset) * radius + (Math.random() - 0.5) * 60;

      return {
        id: `point-${index}`,
        x,
        y,
        z,
        color: colors[groupId],
        label: labels[groupId],
        size: 4 + Math.random() * 8,
        groupId,
        comment: comment.length > 100 ? comment.substring(0, 100) + '...' : comment,
      };
    });
  }, [comments]);

  // Auto-rotation (pause when hovering or dragging)
  useEffect(() => {
    if (!isDragging && !hoveredPoint) {
      const interval = setInterval(() => {
        setRotation(prev => ({ ...prev, y: prev.y + 0.5 }));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isDragging, hoveredPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - rotation.y, y: e.clientY - rotation.x });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setRotation({
        x: e.clientY - dragStart.y,
        y: e.clientX - dragStart.x,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 3D to 2D projection with responsive center
  const projectPoint = (point: ClusterPoint) => {
    const radX = (rotation.x * Math.PI) / 180;
    const radY = (rotation.y * Math.PI) / 180;

    // Rotate around Y axis
    const x1 = point.x * Math.cos(radY) - point.z * Math.sin(radY);
    const z1 = point.x * Math.sin(radY) + point.z * Math.cos(radY);

    // Rotate around X axis
    const y1 = point.y * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = point.y * Math.sin(radX) + z1 * Math.cos(radX);

    // Perspective projection with responsive center (50% of viewBox)
    const perspective = 600;
    const scale = perspective / (perspective + z2 + 300);

    return {
      x: x1 * scale + 400, // Center at 50% of 800px viewBox
      y: y1 * scale + 300, // Center at 50% of 600px viewBox
      scale,
      z: z2,
    };
  };

  // Sort points by depth for proper rendering
  const sortedPoints = useMemo(() => {
    return [...clusterPoints].sort((a, b) => {
      const projA = projectPoint(a);
      const projB = projectPoint(b);
      return projA.z - projB.z;
    });
  }, [clusterPoints, rotation]);

  // Calculate cluster centers for labels
  const clusterCenters = useMemo(() => {
    const centers: { [key: number]: { x: number; y: number; z: number; color: string; label: string } } = {};

    for (let i = 0; i < 5; i++) {
      const groupPoints = clusterPoints.filter(p => p.groupId === i);
      if (groupPoints.length > 0) {
        centers[i] = {
          x: groupPoints.reduce((sum, p) => sum + p.x, 0) / groupPoints.length,
          y: groupPoints.reduce((sum, p) => sum + p.y, 0) / groupPoints.length,
          z: groupPoints.reduce((sum, p) => sum + p.z, 0) / groupPoints.length,
          color: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'][i],
          label: ['支持派', '懐疑派', '中立派', '批判派', '分析派'][i],
        };
      }
    }

    return centers;
  }, [clusterPoints]);

  return (
    <div className="relative w-full h-[500px] md:h-[600px] bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 rounded-2xl border border-purple-500/30 overflow-hidden">
      <svg
        viewBox="0 0 800 600"
        className="absolute inset-0 w-full h-full cursor-move"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1e1e2e" stopOpacity="0" />
          </radialGradient>

          {/* Glow filters */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx="400" cy="300" r="280" fill="url(#bgGradient)" opacity="0.3" />

        {/* Connection lines between same group points */}
        {sortedPoints.slice(0, 30).map((point1, i) => {
          const proj1 = projectPoint(point1);
          return sortedPoints.slice(i + 1, 30).map((point2, j) => {
            if (point1.groupId === point2.groupId) {
              const proj2 = projectPoint(point2);
              const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) +
                Math.pow(point1.y - point2.y, 2) +
                Math.pow(point1.z - point2.z, 2)
              );

              if (distance < 150) {
                return (
                  <line
                    key={`line-${i}-${j}`}
                    x1={proj1.x}
                    y1={proj1.y}
                    x2={proj2.x}
                    y2={proj2.y}
                    stroke={point1.color}
                    strokeOpacity={0.1 * proj1.scale}
                    strokeWidth={0.5}
                  />
                );
              }
            }
            return null;
          });
        })}

        {/* Render points */}
        {sortedPoints.map(point => {
          const proj = projectPoint(point);
          const isHovered = hoveredPoint === point.id;

          return (
            <g key={point.id}>
              <circle
                cx={proj.x}
                cy={proj.y}
                r={point.size * proj.scale}
                fill={point.color}
                fillOpacity={0.8 * proj.scale}
                filter={isHovered ? "url(#glow)" : undefined}
                stroke={point.color}
                strokeOpacity={proj.scale}
                strokeWidth={isHovered ? 2 : 1}
                onMouseEnter={() => setHoveredPoint(point.id)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="transition-all duration-200"
                style={{
                  transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                  transformOrigin: `${proj.x}px ${proj.y}px`,
                }}
              />

              {/* Particle effect */}
              <circle
                cx={proj.x}
                cy={proj.y}
                r={point.size * proj.scale * 0.3}
                fill="white"
                fillOpacity={0.6 * proj.scale}
              />
            </g>
          );
        })}

        {/* Cluster labels */}
        {Object.values(clusterCenters).map((center, i) => {
          const proj = projectPoint({
            ...center,
            id: `center-${i}`,
            size: 10,
            groupId: i,
          } as ClusterPoint);

          return (
            <text
              key={`label-${i}`}
              x={proj.x}
              y={proj.y - 20}
              fill={center.color}
              fontSize={14 * proj.scale}
              fontWeight="bold"
              textAnchor="middle"
              opacity={proj.scale}
              className="select-none"
            >
              {center.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-purple-500/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-purple-300 mb-2">意見クラスタ</h4>
        <div className="space-y-1">
          {['支持派', '懐疑派', '中立派', '批判派', '分析派'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-lg"
                style={{
                  backgroundColor: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'][i],
                  boxShadow: `0 0 10px ${['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'][i]}40`,
                }}
              />
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-purple-500/30 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-300">マウスでドラッグして回転</p>
      </div>

      {/* Hover info */}
      {hoveredPoint && (() => {
        const point = clusterPoints.find(p => p.id === hoveredPoint);
        return point ? (
          <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur border border-purple-500/30 rounded-lg px-4 py-3 max-w-xs shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: point.color }}
              />
              <span className="text-sm font-semibold text-purple-300">
                {point.label}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {point.comment}
            </p>
          </div>
        ) : null;
      })()}
    </div>
  );
}