import React from "react";

const VARIANT_CLASSES = {
  logo: "font-logo font-bold tracking-tight",
  display: "text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15]",
  h1: "text-2xl font-bold tracking-tight leading-snug text-ink-primary",
  h2: "text-xl font-bold tracking-tight leading-snug text-ink-primary",
  h3: "text-lg font-semibold leading-snug text-ink-primary",
  body: "text-base font-normal leading-relaxed text-ink-body",
  "body-sm": "text-sm font-normal leading-relaxed text-ink-body",
  label: "text-[13px] font-semibold leading-normal text-ink-primary",
  caption: "text-xs font-medium leading-normal text-ink-subtle",
};

const DEFAULT_TAGS = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  "body-sm": "p",
  label: "label",
  caption: "span",
};

/**
 * Component khóa chặt quy chuẩn kiểu chữ (Typography Lock-in)
 * Đảm bảo toàn bộ hệ thống tuân thủ đúng Type Scale của Design System.
 */
export default function Typography({ variant = "body", as, className = "", children, ...props }) {
  const Component = as || DEFAULT_TAGS[variant] || "p";
  const baseClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.body;

  return (
    <Component className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
