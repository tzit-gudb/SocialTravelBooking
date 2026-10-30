import { UserRole, UserStatus } from "@stb/shared-types";

// Re-export trực tiếp từ Shared Types để đảm bảo Single Source of Truth
export { UserRole, UserStatus };

// Aliases duy trì tương thích ngược cho codebase
export const USER_ROLES = UserRole;
export const USER_STATUS = UserStatus;

/**
 * Kiểm tra dữ liệu đăng nhập phía Client
 */
export function validateLoginInput(email, password) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !email.trim()) {
    errors.email = "Nhập địa chỉ email của bạn.";
  } else if (!emailPattern.test(email.trim())) {
    errors.email = "Địa chỉ email chưa đúng định dạng.";
  }

  if (!password) {
    errors.password = "Nhập mật khẩu để đăng nhập.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Kiểm tra dữ liệu đăng ký phía Client
 */
export function validateRegisterInput({
  name,
  email,
  role,
  businessName,
  password,
  passwordConfirm,
}) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !email.trim()) {
    errors.email = "Nhập địa chỉ email của bạn.";
  } else if (!emailPattern.test(email.trim())) {
    errors.email = "Địa chỉ email chưa đúng định dạng.";
  }

  if (name !== undefined && (!name || name.trim().length < 2)) {
    errors.name = "Nhập họ và tên (tối thiểu 2 ký tự).";
  }

  if (role === USER_ROLES.PROVIDER && (!businessName || businessName.trim().length < 2)) {
    errors.business_name = "Nhập tên thương hiệu hoặc đơn vị cung cấp dịch vụ.";
  }

  if (!password || password.length < 8) {
    errors.password = "Mật khẩu cần tối thiểu 8 ký tự.";
  }

  if (password !== passwordConfirm) {
    errors.password_confirmation = "Mật khẩu nhập lại chưa khớp.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
