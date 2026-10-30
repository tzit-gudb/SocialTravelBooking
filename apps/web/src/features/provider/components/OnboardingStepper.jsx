import React from "react";
import { Check } from "lucide-react";

/**
 * Component thanh tiến độ 3 bước Onboarding Nhà cung cấp:
 * - Căn chỉnh chính xác tuyệt đối bằng flex-1 connector
 * - Hiệu ứng chuyển động mượt mà khi bước thay đổi (transition-all duration-700)
 * - Vòng sóng pulse sinh động tại bước hiện tại
 */
export default function OnboardingStepper({ currentStep = 2 }) {
  const steps = [
    { number: 1, title: "Tạo tài khoản", desc: "Đã hoàn thành" },
    { number: 2, title: "Hoàn thành hồ sơ", desc: "Thông tin nhà cung cấp" },
    { number: 3, title: "Chờ xác nhận", desc: "Xét duyệt từ ban quản trị" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mb-12 px-2 sm:px-4">
      <div className="flex items-start justify-between">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Node hiển thị bước */}
              <div className="flex flex-col items-center w-24 sm:w-32 text-center group">
                {/* Vòng tròn chỉ báo số bước */}
                <div className="relative flex items-center justify-center">
                  {/* Hiệu ứng sóng lan tỏa (glowing ping) cho bước đang thực hiện */}
                  {isCurrent && (
                    <span className="absolute -inset-1.5 rounded-full bg-brand-primary/20 animate-ping pointer-events-none" />
                  )}

                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ease-out z-10 ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-100"
                        : isCurrent
                          ? "bg-brand-primary text-white ring-4 ring-brand-primary/20 shadow-lg shadow-brand-primary/25 scale-105"
                          : "bg-surface-elevated border-2 border-slate-300 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5] transition-transform duration-300 scale-100" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                </div>

                {/* Nhãn văn bản dưới từng bước */}
                <div className="mt-3">
                  <span
                    className={`block text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                      isCurrent
                        ? "text-brand-primary"
                        : isCompleted
                          ? "text-ink-primary"
                          : "text-ink-subtle"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span
                    className={`hidden sm:block text-[11px] mt-0.5 transition-colors duration-300 ${
                      isCurrent
                        ? "text-brand-primary/80 font-medium"
                        : isCompleted
                          ? "text-emerald-700 font-medium"
                          : "text-slate-400"
                    }`}
                  >
                    {step.desc}
                  </span>
                </div>
              </div>

              {/* Thanh nối giữa các bước có hiệu ứng nạp tiến độ */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 h-1 bg-slate-200 rounded-full self-start mt-5 relative overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: currentStep > step.number ? "100%" : "0%",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
