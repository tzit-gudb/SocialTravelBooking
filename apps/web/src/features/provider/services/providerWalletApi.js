import apiClient from "../../../lib/apiClient";

const providerWalletApi = {
  async getWalletSummary() {
    return apiClient.get("/provider/wallet");
  },

  async listTransactions({ type = "all", q = "", page = 1, per_page = 15 } = {}) {
    const params = new URLSearchParams();
    if (type && type !== "all") params.append("type", type);
    if (q && q.trim()) params.append("q", q.trim());
    params.append("page", String(page));
    params.append("per_page", String(per_page));
    const qs = params.toString();
    return apiClient.get(`/provider/wallet/transactions${qs ? `?${qs}` : ""}`);
  },

  async listWithdrawals({ status = "all", page = 1, per_page = 10 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    params.append("page", String(page));
    params.append("per_page", String(per_page));
    const qs = params.toString();
    return apiClient.get(`/provider/wallet/withdrawals${qs ? `?${qs}` : ""}`);
  },

  async withdraw(payload) {
    return apiClient.post("/provider/wallet/withdraw", payload);
  },

  async confirmReceipt(withdrawalId) {
    return apiClient.post(`/provider/wallet/withdrawals/${withdrawalId}/confirm-receipt`, {});
  },

  async reportIssue(withdrawalId, disputeNote) {
    return apiClient.post(`/provider/wallet/withdrawals/${withdrawalId}/report-issue`, {
      dispute_note: disputeNote,
    });
  },
};

export default providerWalletApi;
