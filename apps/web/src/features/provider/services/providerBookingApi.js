import apiClient from "../../../lib/apiClient";

const providerBookingApi = {
  async listBookings({ status = "all", q = "", page = 1, per_page = 15 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (q && q.trim()) params.append("q", q.trim());
    params.append("page", String(page));
    params.append("per_page", String(per_page));
    const qs = params.toString();
    return apiClient.get(`/provider/bookings${qs ? `?${qs}` : ""}`);
  },

  async getBookingDetail(id) {
    return apiClient.get(`/provider/bookings/${id}`);
  },
};

export default providerBookingApi;
