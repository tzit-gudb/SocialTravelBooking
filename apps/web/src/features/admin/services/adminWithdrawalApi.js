import apiClient from "../../../lib/apiClient";

const adminWithdrawalApi = {
  async listWithdrawals({ status = "all", q = "", page = 1, per_page = 15 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (q && q.trim()) params.append("q", q.trim());
    params.append("page", String(page));
    params.append("per_page", String(per_page));
    const qs = params.toString();
    return apiClient.get(`/admin/withdrawals${qs ? `?${qs}` : ""}`);
  },

  async confirmPaid(id, payoutReference) {
    return apiClient.post(`/admin/withdrawals/${id}/confirm-paid`, {
      payout_reference: payoutReference,
    });
  },

  async reject(id, rejectedReason) {
    return apiClient.post(`/admin/withdrawals/${id}/reject`, {
      rejected_reason: rejectedReason,
    });
  },
};

export default adminWithdrawalApi;
