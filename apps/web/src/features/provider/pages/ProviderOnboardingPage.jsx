import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import AuthFooter from "../../../components/ui/AuthFooter";
import OnboardingStepper from "../components/OnboardingStepper";
import ProviderProfileForm from "../components/ProviderProfileForm";
import OnboardingSuccessState from "../components/OnboardingSuccessState";

/**
 * Screen Orchestrator: Trang Thiết lập hồ sơ Nhà cung cấp (Onboarding)
 * Đồng bộ căn giữa Logo với Form trong cùng khung max-w-3xl, nút Back phong cách iOS.
 */
export default function ProviderOnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(2); // 2: Hoàn thành hồ sơ, 3: Chờ xác nhận
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "Tour du lịch & Trải nghiệm biển đảo",
    phone: "",
    city: "Đà Nẵng",
    address: "",
    taxNumber: "",
    representativeName: "",
  });
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFeedback = () => {
    if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
  };

  const validate = () => {
    const errors = {};
    if (!formData.businessName.trim()) {
      errors.businessName = "Vui lòng nhập tên thương hiệu / doanh nghiệp du lịch.";
    }
    if (!formData.phone.trim() || !/^[0-9+\-\s()]{8,20}$/.test(formData.phone.trim())) {
      errors.phone = "Vui lòng nhập số điện thoại liên hệ hợp lệ.";
    }
    if (!formData.representativeName.trim()) {
      errors.representativeName = "Vui lòng nhập họ tên người đại diện quản lý.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    resetFeedback();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const code = `STB-PRV-${Math.floor(100000 + Math.random() * 900000)}`;
      const time = new Date().toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setSubmissionInfo({ referenceCode: code, submittedAt: time });
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-surface-elevated flex flex-col justify-between">
      {/* Vùng nội dung chung đồng bộ hoàn toàn theo chiều ngang (max-w-3xl) */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-8 py-6 sm:py-8 flex flex-col">
        {/* Header: Nút back iOS và Logo căn giữa tuyệt đối cùng trục với form */}
        <header className="relative w-full flex items-center justify-between pb-6 mb-4 border-b border-border-subtle/60">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            aria-label="Quay lại"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink-body hover:text-ink-primary hover:bg-slate-100 transition-colors cursor-pointer z-10"
          >
            <ChevronLeft className="w-6 h-6 -ml-0.5" />
          </button>

          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
            <Typography
              variant="logo"
              as="h1"
              className="text-2xl sm:text-[26px] font-bold text-brand-primary tracking-tight text-center"
            >
              Social Travel Booking
            </Typography>
          </div>

          <div className="w-10 h-10" />
        </header>

        {/* Nội dung chính: Thanh Stepper và Form */}
        <main className="flex-1 w-full pt-2 pb-6">
          <OnboardingStepper currentStep={step} />

          {step === 2 ? (
            <div>
              <div className="text-center mb-8">
                <Typography
                  variant="h1"
                  className="text-2xl sm:text-3xl font-bold mb-2 text-ink-primary"
                >
                  Hoàn thành hồ sơ
                </Typography>
                <p className="text-sm sm:text-base text-ink-subtle max-w-xl mx-auto leading-relaxed">
                  Vui lòng điền đầy đủ các thông tin để tiến hành khởi tạo hồ sơ dành cho nhà cung
                  cấp dịch vụ.
                </p>
              </div>

              <ProviderProfileForm
                formData={formData}
                setFormData={setFormData}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onResetFeedback={resetFeedback}
              />
            </div>
          ) : (
            <OnboardingSuccessState
              formData={formData}
              submissionInfo={submissionInfo}
              onBackToAuth={() => navigate("/auth")}
            />
          )}
        </main>
      </div>

      <AuthFooter />
    </div>
  );
}
