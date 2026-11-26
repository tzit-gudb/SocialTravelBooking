import React from "react";
import { Image, StyleSheet, View } from "react-native";
import AppText from "../../../components/common/AppText";
import { resolveMediaUrl } from "../../../lib/apiClient";

function getInitials(name = "Du khách") {
  const parts = String(name || "DK")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "DK";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export default function SocialAvatar({ uri, name = "Du khách", size = 40, style }) {
  const borderRadius = size / 2;
  const fontSize = Math.max(11, Math.round(size * 0.34));
  const rawUri = uri ? String(uri).trim() : "";
  const resolved =
    rawUri.startsWith("file://") || rawUri.startsWith("content://")
      ? rawUri
      : resolveMediaUrl(rawUri);

  if (resolved && /^(https?|file|content):\/\//i.test(resolved)) {
    return (
      <Image
        source={{ uri: resolved }}
        style={[{ width: size, height: size, borderRadius }, styles.img, style]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius }, styles.fallback, style]}>
      <AppText style={[styles.initials, { fontSize }]}>{getInitials(name)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: "#E2E8F0",
  },
  fallback: {
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
