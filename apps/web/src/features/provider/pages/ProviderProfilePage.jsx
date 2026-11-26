import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock } from "lucide-react";
import ProviderLayout from "../layouts/ProviderLayout";
import Typography from "../../../components/ui/Typography";
import { useAuth } from "../../../hooks/useAuth";
import providerProfileService from "../services/providerProfileService";

// Sub-components tuân thủ kiến trúc Component-Based Architecture
import ProviderProfileMetrics from "../components/ProviderProfileMetrics";
import ProviderAvatarUploader from "../components/ProviderAvatarUploader";
import ProviderInfoForm from "../components/ProviderInfoForm";
import ProviderWalletActivation from "../components/ProviderWalletActivation";
import ProviderBankAccountsManager from "../components/ProviderBankAccountsManager";
import ProviderSecurityForm from "../components/ProviderSecurityForm";

/**
 * Screen Orchestrator: Trang Quản lý Hồ sơ & Ví Travel của Đối tác (Provider)
 * Đóng vai trò "nhạc trưởng" điều phối state, kết nối Service và các sub-components.
 */
export default function ProviderProfilePage() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab điều hướng đồng bộ URL: 'profile' | 'wallet' | 'bank-accounts' | 'security'
  const tabParam = searchParams.get("tab");
  const activeTab = ["profile", "wallet", "bank-accounts", "security"].includes(tabParam)
    ? tabParam
    : "profile";

  useEffect(() => {
    if (!searchParams.has("tab")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "profile");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const setActiveTab = (nextTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", nextTab || "profile");
      return next;
    });
  };

  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isActivatingWallet, setIsActivatingWallet] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Feedback states
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [avatarFeedback, setAvatarFeedback] = useState(null);
  const [walletFeedback, setWalletFeedback] = useState(null);
  const [securityFeedback, setSecurityFeedback] = useState(null);

  // Đồng bộ thông tin hồ sơ và ví mới nhất từ backend khi mở trang
  useEffect(() => {
    providerProfileService
      .fetchProfile()
      .then((res) => {
        if (res?.data) {
          const freshData = res.data;
          updateUser({
            ...user,
            provider_profile: freshData,
            wallet: freshData.wallet || user?.wallet,
          });
        }
      })
      .catch(() => {});
  }, []);

  // 1. Cập nhật thông tin hồ sơ
  const handleSaveProfile = async (formData) => {
    setIsUpdatingProfile(true);
    setProfileFeedback(null);
    try {
      const response = await providerProfileService.updateProfile(formData);
      if (response?.user) {
        updateUser(response.user);
      } else if (response?.data) {
        updateUser({
          ...user,
          provider_profile: {
            ...(user?.provider_profile || {}),
            ...response.data,
          },
        });
      }
      setProfileFeedback({ type: "success", message: "Cập nhật hồ sơ đối tác thành công!" });
    } catch (err) {
      setProfileFeedback({ type: "error", message: err.message || "Cập nhật hồ sơ thất bại." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 2. Tải ảnh đại diện mới
  const handleUploadAvatar = async (file) => {
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);
    try {
      const res = await providerProfileService.uploadAvatar(file);
      if (res?.user) {
        updateUser(res.user);
      } else if (res?.data?.avatar_url) {
        const avatarUrl = res.data.avatar_url;
        updateUser({
          ...user,
          avatar_url: avatarUrl,
          avatar: avatarUrl,
          provider_profile: {
            ...(user?.provider_profile || {}),
            avatar_url: avatarUrl,
          },
        });
      }
      setAvatarFeedback({ type: "success", message: "Cập nhật ảnh đại diện thành công!" });
    } catch (err) {
      setAvatarFeedback({ type: "error", message: err.message || "Tải ảnh thất bại." });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 3. Kích hoạt Ví Travel Đối tác
  const handleActivateWallet = async (walletData) => {
    setIsActivatingWallet(true);
    setWalletFeedback(null);
    try {
      const res = await providerProfileService.activateWallet(walletData);
      if (res?.user) {
        updateUser(res.user);
      } else if (res?.data) {
        const newWallet = {
          ...(res.data.wallet || res.data),
          is_activated: true,
        };
        updateUser({
          ...user,
          wallet: newWallet,
        });
      }
      setWalletFeedback({
        type: "success",
        message: res?.message || "Kích hoạt Ví Travel thành công!",
      });
    } catch (err) {
      setWalletFeedback({ type: "error", message: err.message || "Kích hoạt ví thất bại." });
    } finally {
      setIsActivatingWallet(false);
    }
  };

  // 4. Đổi mật khẩu
  const handleChangePassword = async (payload) => {
    setIsChangingPassword(true);
    setSecurityFeedback(null);
    try {
      const res = await providerProfileService.changePassword(payload);
      setSecurityFeedback({ type: "success", message: res?.message || "Đổi mật khẩu thành công!" });
    } catch (err) {
      setSecurityFeedback({ type: "error", message: err.message || "Đổi mật khẩu thất bại." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const kycStatus = user?.provider_profile?.status || "approved";
  const isWalletActive = Boolean(
    user?.wallet &&
    user.wallet.is_activated !== false &&
    (user.wallet.wallet_id || user.wallet.id || user.wallet.balance !== undefined),
  );

  return (
    <ProviderLayout activeTab="profile">
      {/* 1. Header Trang */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Typography variant="h1">Hồ sơ cơ sở kinh doanh & Dịch vụ</Typography>
          <Typography variant="body-sm" className="text-ink-subtle mt-1">
            Quản lý thông tin thương hiệu, người đại diện, trạng thái ví thanh toán và cài đặt bảo
            mật tài khoản.
          </Typography>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {kycStatus === "approved" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-status-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đối tác đã xác thực</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
              <Clock className="w-4 h-4" />
              <span>Hồ sơ đang chờ duyệt</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards (Trạng thái ví, Mã đối tác, Email) */}
      <ProviderProfileMetrics user={user} onNavigateWalletTab={() => setActiveTab("wallet")} />

      {/* 3. Main Body: Cột trái (Avatar) & Cột phải (Tabs nội dung) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <ProviderAvatarUploader
            user={user}
            isUploading={isUploadingAvatar}
            onUploadFile={handleUploadAvatar}
            feedback={avatarFeedback}
          />
          <div className="bg-slate-50 border border-border-subtle rounded-xl p-5 shadow-2xs">
            <Typography
              variant="label"
              className="text-xs font-semibold text-ink-primary block mb-2"
            >
              Quy định thông tin hoạt động
            </Typography>
            <ul className="text-xs text-ink-body space-y-2 list-disc list-inside leading-relaxed">
              <li>
                Tên thương hiệu và số điện thoại hỗ trợ là thông tin hiển thị trực tiếp cho du khách
                khi đặt tour hoặc phòng nghỉ.
              </li>
              <li>
                Kích hoạt Ví thanh toán nội bộ là bước cần thiết để hệ thống ghi nhận doanh thu và
                tự động giải ngân sau khi phục vụ du khách.
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-surface-elevated border border-border-subtle rounded-xl shadow-2xs overflow-hidden">
            {/* Tab Header Navigation */}
            <div className="flex border-b border-border-subtle bg-slate-50/60 px-6 pt-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "profile"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-ink-subtle hover:text-ink-primary"
                }`}
              >
                Thông tin cơ sở & Đại diện
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "wallet"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-ink-subtle hover:text-ink-primary"
                }`}
              >
                <span>Ví thanh toán</span>
                {!isWalletActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bank-accounts")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "bank-accounts"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-ink-subtle hover:text-ink-primary"
                }`}
              >
                Tài khoản ngân hàng
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "security"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-ink-subtle hover:text-ink-primary"
                }`}
              >
                Bảo mật tài khoản
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {activeTab === "profile" && (
                <ProviderInfoForm
                  user={user}
                  isSubmitting={isUpdatingProfile}
                  onSubmit={handleSaveProfile}
                  feedback={profileFeedback}
                />
              )}

              {activeTab === "wallet" && (
                <ProviderWalletActivation
                  user={user}
                  isActivating={isActivatingWallet}
                  onActivateWallet={handleActivateWallet}
                  feedback={walletFeedback}
                />
              )}

              {activeTab === "bank-accounts" && <ProviderBankAccountsManager />}

              {activeTab === "security" && (
                <ProviderSecurityForm
                  isSubmitting={isChangingPassword}
                  onSubmit={handleChangePassword}
                  feedback={securityFeedback}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
