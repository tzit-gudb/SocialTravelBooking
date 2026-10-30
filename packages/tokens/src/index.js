/**
 * Hệ thống Semantic Design Tokens dùng chung 100% cho Web (@stb/web) và Mobile (@stb/mobile).
 * Tuân thủ quy chuẩn docs/design-system.md & .agent/skills/ui-design/SKILL.md.
 */

export const colors = {
  surfaceBase: "#F8FAFC",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  surfaceObsidian: "#0B1320",
  surfaceObsidianSoft: "#131F33",

  // Bộ màu chủ đạo: Xanh trời (Sky Blue) - Đại dương, bầu trời tự do và an tâm
  brandPrimary: "#0284C7", // Sky Blue 600
  brandHover: "#0369A1", // Deep Sky Blue 700
  brandDark: "#075985", // Midnight Ocean 800
  brandLight: "#E0F2FE", // Soft Sky Mist 100
  brandSubtle: "#F0F9FF", // Clear Sky 50

  // Bộ màu phụ 1: Hoàng hôn & Nắng biển (Sunset Coral / Sand Gold) - Cho ưu đãi, rating, CTA
  secondaryWarm: "#F97316", // Sunset Coral 500
  secondaryWarmHover: "#EA580C", // Sunset Coral 600
  secondaryWarmLight: "#FFEDD5", // Warm Sand 100
  secondaryWarmSubtle: "#FFF7ED", // Warm Sand 50

  // Bộ màu phụ 2: Trải nghiệm sinh thái & Biển đảo (Lagoon Teal)
  secondaryLagoon: "#0D9488", // Teal 600
  secondaryLagoonLight: "#CCFBF1", // Mint Teal 100

  // Màu trung tính (Neutrals)
  inkPrimary: "#0F172A", // Slate 900
  inkBody: "#334155", // Slate 700
  inkSubtle: "#64748B", // Slate 500
  inkInverse: "#F8FAFC", // Slate 50

  borderSubtle: "#E2E8F0", // Slate 200
  borderStrong: "#CBD5E1", // Slate 300

  // Màu trạng thái (Feedback & Status)
  statusSuccess: "#059669",
  statusSuccessBg: "#ECFDF5",
  statusWarning: "#D97706",
  statusWarningBg: "#FFFBEB",
  statusDanger: "#E11D48",
  statusDangerBg: "#FFF1F2",
};

export const fonts = {
  // Font nhận diện thương hiệu dành riêng cho Logo "Social Travel Booking"
  logo: {
    regular: "Quicksand_400Regular",
    medium: "Quicksand_500Medium",
    semiBold: "Quicksand_600SemiBold",
    bold: "Quicksand_700Bold",
    family: "Quicksand, sans-serif",
  },
  // Font chuẩn dùng cho toàn bộ hệ thống giao diện UI (Web & Mobile)
  ui: {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semiBold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
    family:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  // Aliases mặc định hướng tới UI font cho tương thích ngược
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const touchTarget = {
  minHeight: 48,
  minWidth: 48,
};

export const typographyScale = {
  logo: {
    fontFamily: fonts.logo.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colors.inkPrimary,
  },
  display: {
    fontFamily: fonts.ui.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.inkPrimary,
  },
  h1: {
    fontFamily: fonts.ui.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.inkPrimary,
  },
  h2: {
    fontFamily: fonts.ui.bold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  h3: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  body: {
    fontFamily: fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    color: colors.inkBody,
  },
  bodySmall: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: colors.inkBody,
  },
  label: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  caption: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.inkSubtle,
  },
};
