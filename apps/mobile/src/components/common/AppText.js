import React from "react";
import { Text, StyleSheet } from "react-native";
import { typographyScale, fonts } from "../../theme/tokens";

/**
 * Component khóa chặt quy chuẩn kiểu chữ trên Mobile (Typography Lock-in)
 * - Mặc định: Plus Jakarta Sans cho toàn bộ giao diện UI
 * - isLogo hoặc variant="logo": Quicksand cho nhận diện thương hiệu
 * - Tự động tính toán lineHeight cân đối theo fontSize để chống cắt ngọn chữ
 */
export default function AppText({
  variant = "body",
  isLogo = false,
  weight,
  style,
  children,
  ...props
}) {
  const isLogoText = isLogo || variant === "logo";
  const activeVariant = isLogoText && variant === "body" ? "logo" : variant;
  const baseStyle = typographyScale[activeVariant] || typographyScale.body;

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const activeWeight = weight || flattenedStyle.fontWeight;
  const activeFontSize = flattenedStyle.fontSize || baseStyle.fontSize;

  // Đảm bảo lineHeight luôn >= fontSize * 1.35 để tránh cắt ngọn chữ khi font to
  const resolvedLineHeight =
    flattenedStyle.lineHeight || Math.max(baseStyle.lineHeight, Math.round(activeFontSize * 1.35));

  let resolvedFontFamily = baseStyle.fontFamily;
  if (isLogoText) {
    if (activeWeight === "700" || activeWeight === "bold") {
      resolvedFontFamily = fonts.logo.bold;
    } else if (activeWeight === "600" || activeWeight === "semibold") {
      resolvedFontFamily = fonts.logo.semiBold;
    } else if (activeWeight === "500" || activeWeight === "medium") {
      resolvedFontFamily = fonts.logo.medium;
    } else {
      resolvedFontFamily = fonts.logo.regular;
    }
  } else {
    if (activeWeight === "700" || activeWeight === "bold") {
      resolvedFontFamily = fonts.ui.bold;
    } else if (activeWeight === "600" || activeWeight === "semibold") {
      resolvedFontFamily = fonts.ui.semiBold;
    } else if (activeWeight === "500" || activeWeight === "medium") {
      resolvedFontFamily = fonts.ui.medium;
    } else if (activeWeight === "400" || activeWeight === "normal") {
      resolvedFontFamily = fonts.ui.regular;
    }
  }

  return (
    <Text
      style={[
        baseStyle,
        { lineHeight: resolvedLineHeight },
        style,
        { fontFamily: resolvedFontFamily },
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
