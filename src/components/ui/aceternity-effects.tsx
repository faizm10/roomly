"use client";

import { useMemo, useState } from "react";

export function ImagesBadge({
  text,
  images,
  className = ""
}: {
  text: string;
  images: string[];
  className?: string;
}) {
  return (
    <div className={`images-badge ${className}`}>
      <span className="images-badge-folder">
        {images.slice(0, 3).map((image, index) => (
          <span
            key={image}
            className="images-badge-image"
            data-index={index}
            style={{ backgroundImage: `url("${image}")` }}
          />
        ))}
      </span>
      <span className="images-badge-text">{text}</span>
    </div>
  );
}

export function BackgroundRippleEffect({
  rows = 6,
  cols = 10,
  cellSize = 28,
  className = ""
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
}) {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const cells = useMemo(
    () =>
      Array.from({ length: rows * cols }, (_, index) => ({
        row: Math.floor(index / cols),
        col: index % cols
      })),
    [cols, rows]
  );

  return (
    <div
      aria-hidden="true"
      className={`ripple-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
      }}
    >
      {cells.map((cell) => {
        const distance = clickedCell
          ? Math.abs(clickedCell.row - cell.row) +
            Math.abs(clickedCell.col - cell.col)
          : 0;

        return (
          <button
            key={`${cell.row}-${cell.col}`}
            className="ripple-cell"
            style={
              {
                "--delay": `${distance * 35}ms`
              } as React.CSSProperties
            }
            type="button"
            onClick={() => setClickedCell(cell)}
          />
        );
      })}
    </div>
  );
}

export function BackgroundBoxes({
  rows = 9,
  cols = 18,
  className = ""
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`background-boxes ${className}`}>
      {Array.from({ length: rows * cols }, (_, index) => (
        <span
          key={index}
          className="background-box"
          style={
            {
              "--box-hue": `${155 + (index % 7) * 6}`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function materialPreviewImages() {
  return [
    svgDataUrl("#d9c8a6", "#9d7d53", "oak"),
    svgDataUrl("#f1eee6", "#c6c0b5", "linen"),
    svgDataUrl("#2d3734", "#87a096", "trim")
  ];
}

function svgDataUrl(background: string, stroke: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect width="96" height="64" fill="${background}"/><path d="M0 46C18 30 29 57 46 38C62 20 73 39 96 19" fill="none" stroke="${stroke}" stroke-width="5" opacity=".55"/><text x="10" y="18" font-family="Arial" font-size="9" fill="${stroke}" opacity=".9">${label}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
