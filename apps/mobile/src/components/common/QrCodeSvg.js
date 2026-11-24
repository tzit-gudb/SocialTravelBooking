import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import QRCode from "qrcode";

/**
 * Render mã QR Code sắc nét bằng react-native-svg + qrcode pure JS
 * (tương thích 100% Expo Go, không phụ thuộc module native).
 */
export default function QrCodeSvg({
  value,
  size = 180,
  color = "#0F172A",
  backgroundColor = "#FFFFFF",
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
    <View style={[styles.wrap, { width: size, height: size, backgroundColor }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`-${quietZone} -${quietZone} ${viewBoxSize} ${viewBoxSize}`}
      >
        <Path d={pathData.d} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
