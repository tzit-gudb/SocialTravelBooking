export interface Colors {
  surfaceBase: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfaceObsidian: string;
  surfaceObsidianSoft: string;
  brandPrimary: string;
  brandHover: string;
  brandDark: string;
  brandLight: string;
  brandSubtle: string;
  secondaryWarm: string;
  secondaryWarmHover: string;
  secondaryWarmLight: string;
  secondaryWarmSubtle: string;
  secondaryLagoon: string;
  secondaryLagoonLight: string;
  inkPrimary: string;
  inkBody: string;
  inkSubtle: string;
  inkInverse: string;
  borderSubtle: string;
  borderStrong: string;
  statusSuccess: string;
  statusSuccessBg: string;
  statusWarning: string;
  statusWarningBg: string;
  statusDanger: string;
  statusDangerBg: string;
}

export interface FontVariantGroup {
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
  family: string;
}

export interface Fonts {
  logo: FontVariantGroup;
  ui: FontVariantGroup;
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface Radius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface TouchTarget {
  minHeight: number;
  minWidth: number;
}

export interface TypographyItem {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  letterSpacing?: number;
  color?: string;
}

export interface TypographyScale {
  logo: TypographyItem;
  display: TypographyItem;
  h1: TypographyItem;
  h2: TypographyItem;
  h3: TypographyItem;
  body: TypographyItem;
  bodySmall: TypographyItem;
  label: TypographyItem;
  caption: TypographyItem;
}

export declare const colors: Colors;
export declare const fonts: Fonts;
export declare const spacing: Spacing;
export declare const radius: Radius;
export declare const touchTarget: TouchTarget;
export declare const typographyScale: TypographyScale;
