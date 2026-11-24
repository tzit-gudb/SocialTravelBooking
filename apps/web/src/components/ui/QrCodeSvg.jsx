import React, { useMemo } from "react";
import QRCode from "qrcode";

/**
 * Render mã QR Code sắc nét trên Web bằng SVG thuần + qrcode pure JS.
 */
export default function QrCodeSvg({
  value,
  size = 128,
  color = "#0F172A",
  backgroundColor = "#FFFFFF",
  className = "",
}) {
  const pathData = useMemo(() => {
    const safeVal = String(value || "").trim();
    if (!safeVal) return null;

    try {
      const qr = QRCode.create(safeVal, { errorCorrectionLevel: "M" });
      const modules = qr.modules;
      const count = modules.size;
      const data = modules.data;

      let d = "";
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (data[row * count + col]) {
            d += `M${col},${row}h1v1h-1z`;
          }
        }
      }

      return { count, d };
    } catch {
      return null;
    }
  }, [value]);

  if (!pathData) return null;

  const quietZone = 2;
  const viewBoxSize = pathData.count + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${quietZone} -${quietZone} ${viewBoxSize} ${viewBoxSize}`}
      style={{ backgroundColor }}
      className={className}
      role="img"
      aria-label="Mã QR vé điện tử"
    >
      <path d={pathData.d} fill={color} />
    </svg>
  );
}
