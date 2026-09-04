import React, { useEffect, useRef, useState } from 'react';
import type { NullityMatrixData } from '../../types/data';
import { Layers, Info } from 'lucide-react';

interface MissingMatrixProps {
  matrixData: NullityMatrixData;
  totalRows: number;
}

export const MissingMatrix: React.FC<MissingMatrixProps> = ({ matrixData, totalRows }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparklineRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ col: string; row: number; isMissing: boolean } | null>(null);

  const { columns, matrix } = matrixData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0 || columns.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const colWidth = width / columns.length;
    const rowHeight = height / matrix.length;

    // Draw cells
    for (let r = 0; r < matrix.length; r++) {
      const rowData = matrix[r];
      const y = r * rowHeight;

      for (let c = 0; c < columns.length; c++) {
        const isMissing = rowData[c];
        const x = c * colWidth;

        // Dark slate for valid, Bright Salmon/Red for missing
        if (isMissing) {
          ctx.fillStyle = '#ef4444'; // Missing: Bright Red
          ctx.fillRect(x, y, Math.max(1, colWidth - 1), Math.max(1, rowHeight));
        } else {
          ctx.fillStyle = '#334155'; // Valid: Slate 700
          ctx.fillRect(x, y, Math.max(1, colWidth - 1), Math.max(1, rowHeight));
        }
      }
    }

    // Draw sparkline canvas on right (number of complete columns per row)
    const sparkCanvas = sparklineRef.current;
    if (sparkCanvas) {
      const sCtx = sparkCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0f172a';
        sCtx.fillRect(0, 0, sparkCanvas.width, sparkCanvas.height);

        const sWidth = sparkCanvas.width;
        sCtx.strokeStyle = '#38bdf8';
        sCtx.lineWidth = 1.5;
        sCtx.beginPath();

        for (let r = 0; r < matrix.length; r++) {
          const validCount = matrix[r].filter((m) => !m).length;
          const ratio = validCount / columns.length;
          const x = ratio * sWidth;
          const y = r * (sparkCanvas.height / matrix.length);
          if (r === 0) sCtx.moveTo(x, y);
          else sCtx.lineTo(x, y);
        }
        sCtx.stroke();
      }
    }
  }, [matrix, columns]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0 || columns.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const colIdx = Math.floor(canvasX / (canvas.width / columns.length));
    const rowIdx = Math.floor(canvasY / (canvas.height / matrix.length));

    if (colIdx >= 0 && colIdx < columns.length && rowIdx >= 0 && rowIdx < matrix.length) {
      const actualRow = Math.floor((rowIdx / matrix.length) * totalRows) + 1;
      setHoverInfo({
        col: columns[colIdx],
        row: actualRow,
        isMissing: matrix[rowIdx][colIdx],
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            缺失值矩陣圖 (Missingno Matrix)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            類似 Python missingno 矩陣：<span className="text-red-400 font-medium">紅色表示缺值</span>，
            <span className="text-slate-400 font-medium">深灰表示有效資料</span>。右側曲線代表各列之完整度。
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-700 rounded-sm inline-block"></span>
            <span className="text-slate-300">有效資料</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-sm inline-block"></span>
            <span className="text-slate-300">缺失值 (NULL)</span>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          {/* Column names strip */}
          <div
            className="grid text-[11px] text-slate-300 font-mono mb-2 px-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 60px`,
            }}
          >
            {columns.map((col, idx) => (
              <div
                key={idx}
                className="truncate text-center hover:text-blue-300 transition-colors cursor-default"
                title={col}
              >
                {col}
              </div>
            ))}
            <div className="text-center text-[10px] text-sky-400 font-sans">列完整度</div>
          </div>

          {/* Matrix canvas + Sparkline */}
          <div className="flex items-stretch gap-2">
            <div className="flex flex-col justify-between text-[10px] text-slate-500 font-mono pr-1 select-none">
              <span>第 1 列</span>
              <span>第 {Math.floor(totalRows / 2)} 列</span>
              <span>第 {totalRows} 列</span>
            </div>

            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={320}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverInfo(null)}
                className="w-full h-[320px] rounded border border-slate-800 cursor-crosshair bg-slate-950 block"
              />
            </div>

            <div className="w-[60px]">
              <canvas
                ref={sparklineRef}
                width={60}
                height={320}
                className="w-full h-[320px] rounded border border-slate-800 bg-slate-950 block"
                title="每列完整欄位數曲線"
              />
            </div>
          </div>
        </div>
      </div>

      {hoverInfo ? (
        <div className="mt-3 text-xs bg-slate-950/80 border border-slate-800 py-1.5 px-3 rounded flex items-center gap-3">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>欄位: <strong className="text-slate-200">{hoverInfo.col}</strong></span>
          <span>約第 <strong className="text-slate-200">{hoverInfo.row}</strong> 列</span>
          <span>狀態: {hoverInfo.isMissing ? (
            <strong className="text-red-400">缺失值 (NULL)</strong>
          ) : (
            <strong className="text-emerald-400">有效值</strong>
          )}</span>
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>提示：移動滑鼠至矩陣圖上方，可即時查看特定位置的資料狀態。</span>
        </div>
      )}
    </div>
  );
};
