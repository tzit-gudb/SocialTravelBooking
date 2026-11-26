import apiClient from "../../../lib/apiClient";

const providerReviewApi = {
  async listReviews({
    reply_status = "all",
    rating = "all",
    q = "",
    page = 1,
    per_page = 15,
  } = {}) {
    const params = new URLSearchParams();
    if (reply_status && reply_status !== "all") params.append("reply_status", reply_status);
    if (rating && rating !== "all") params.append("rating", String(rating));
    if (q && q.trim()) params.append("q", q.trim());
    params.append("page", String(page));
    params.append("per_page", String(per_page));
    const qs = params.toString();
    return apiClient.get(`/provider/reviews${qs ? `?${qs}` : ""}`);
  },

  async replyReview(reviewId, providerReply) {
    return apiClient.post(`/provider/reviews/${reviewId}/reply`, {
      provider_reply: providerReply,
    });
  },
};

export default providerReviewApi;
