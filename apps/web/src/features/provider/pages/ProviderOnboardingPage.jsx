import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import AuthFooter from "../../../components/ui/AuthFooter";
import OnboardingStepper from "../components/OnboardingStepper";
import ProviderProfileForm from "../components/ProviderProfileForm";
import OnboardingSuccessState from "../components/OnboardingSuccessState";
import { useAuth } from "../../../hooks/useAuth";
import providerKycService from "../services/providerKycService";
import {
  INITIAL_PROVIDER_ONBOARDING_DATA,
  validateProviderOnboarding,
} from "../models/providerOnboardingModel";

/**
 * Screen Orchestrator: Trang Thiết lập hồ sơ Nhà cung cấp (Onboarding)
 */
export default function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const [step, setStep] = useState(2); // 2: Hoàn thành hồ sơ, 3: Chờ xác nhận
  const [formData, setFormData] = useState(() => ({
    ...INITIAL_PROVIDER_ONBOARDING_DATA,
    business_name: user?.provider_profile?.business_name || "",
    representative_name: user?.provider_profile?.representative_name || user?.name || "",
    phone: user?.provider_profile?.phone || "",
    address: user?.provider_profile?.address || "",
    business_type_id: String(user?.provider_profile?.business_type_id || "1"),
  }));
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động kiểm tra trạng thái KYC của Provider khi nạp trang
  useEffect(() => {
    let isMounted = true;

    providerKycService
      .fetchKycStatus()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data;

        if (data?.status === "approved") {
          navigate("/provider/dashboard", { replace: true });
        } else if (data?.status === "pending") {
          setStep(3);
          const submittedDate = data.submitted_at ? new Date(data.submitted_at) : new Date();
          setSubmissionInfo({
            referenceCode: `STB-PRV-${data.profile?.id || "KYC"}`,
            submittedAt: submittedDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
          if (data.profile) {
            setFormData((prev) => ({
              ...prev,
              business_name: data.profile.business_name || prev.business_name,
              representative_name: data.profile.representative_name || prev.representative_name,
              phone: data.profile.phone || prev.phone,
              address: data.profile.address || prev.address,
              description: data.profile.description || prev.description,
              business_type_id: String(data.profile.business_type_id || prev.business_type_id),
              business_license_url: data.profile.business_license_url || prev.business_license_url,
            }));
          }
        }
      })
      .catch((err) => {
        console.warn("[Onboarding] Fetch KYC status:", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const resetFeedback = () => {
    if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
  };

  /**
   * Nút Quay lại ở đầu trang: Luôn đăng xuất và quay về trang Đăng nhập (/auth)
   */
  const handleBackToLogin = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("[Onboarding] Logout error on back to login:", err);
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFeedback();

    const { isValid, errors } = validateProviderOnboarding(formData);
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await providerKycService.submitKyc(formData);
      await refreshUser?.();

      const profile = response?.data?.provider_profile;
      const code = `STB-PRV-${profile?.id || Math.floor(100000 + Math.random() * 900000)}`;
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
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
      } else {
        alert(err.message || "Không thể nộp hồ sơ xét duyệt. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface-elevated flex flex-col justify-between">
      {/* Vùng nội dung chung đồng bộ hoàn toàn theo chiều ngang (max-w-3xl) */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-8 py-6 sm:py-8 flex flex-col">
        {/* Header: Nút back và Logo căn giữa tuyệt đối */}
        <header className="relative w-full flex items-center justify-between pb-6 mb-4 border-b border-border-subtle/60">
          <button
            type="button"
            onClick={handleBackToLogin}
            aria-label="Quay lại trang đăng nhập"
            title="Quay lại trang đăng nhập"
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
                  Hoàn thành hồ sơ nhà cung cấp
                </Typography>
                <p className="text-sm sm:text-base text-ink-subtle max-w-xl mx-auto leading-relaxed">
                  Vui lòng cung cấp thông tin pháp nhân và giấy phép kinh doanh để Ban quản trị xét
                  duyệt tư cách đối tác lữ hành.
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
              onBackToAuth={handleBackToLogin}
            />
          )}
        </main>
      </div>

      <AuthFooter />
    </div>
  );
}
