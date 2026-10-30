import React from "react";
import Typography from "../../../components/ui/Typography";

export default function AuthBrandingPanel() {
  return (
    <aside className="w-full lg:w-1/2 bg-surface-elevated flex flex-col justify-center items-start text-left px-8 sm:px-14 lg:px-20 py-12 lg:py-16 lg:border-r border-border-subtle">
      <div className="w-full max-w-xl">
        {/* Hàng chứa Logo và Tag Hệ thống quản trị */}
        <div className="flex items-start gap-3 flex-wrap mb-3.5">
          <Typography
            variant="logo"
            as="h1"
            className="text-3xl sm:text-4xl lg:text-[34px] text-brand-primary font-bold tracking-tight leading-tight"
          >
            Social Travel Booking
          </Typography>
          <span className="px-1 py-1 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold tracking-wide border border-slate-300/80 shrink-0">
            Hệ thống quản trị
          </span>
        </div>

        <p className="text-sm sm:text-base text-ink-subtle leading-relaxed max-w-lg">
          Cổng vận hành và quản lý dịch vụ dành cho <br />
          <strong className="font-semibold text-brand-primary">Nhà cung cấp dịch vụ du lịch</strong>
        </p>
      </div>
    </aside>
  );
}
