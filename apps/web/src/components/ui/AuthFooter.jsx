import React from "react";
import Typography from "./Typography";

/**
 * Footer dùng chung cho các màn hình Auth & Onboarding (Web Portal)
 */
export default function AuthFooter({ className = "" }) {
  return (
    <footer
      className={`w-full py-5 border-t border-border-subtle text-center bg-surface-elevated ${className}`.trim()}
    >
      <Typography variant="caption" className="text-xs sm:text-sm text-ink-subtle">
        © 2026 Social Travel Booking
      </Typography>
    </footer>
  );
}
