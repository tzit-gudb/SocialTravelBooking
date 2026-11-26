import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  MessageSquareQuote,
  Search,
  Send,
  Star,
} from "lucide-react";
import ProviderLayout from "../layouts/ProviderLayout";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useDebouncedUrlSearch } from "../../../hooks/useDebouncedUrlSearch";
import { echo } from "../../../lib/echo";
import providerReviewApi from "../services/providerReviewApi";

const REPLY_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "unreplied", label: "Chưa phản hồi" },
  { id: "replied", label: "Đã phản hồi" },
];

function formatDateTimeVi(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
}

function renderStars(count) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= Number(count || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Trang Quản lý Đánh giá từ Du khách & Phản hồi (/provider/reviews).
 */
export default function ProviderReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const replyFilter = searchParams.get("reply_status") || "all";
  const ratingFilter = searchParams.get("rating") || "all";
  const currentPage = Math.max(1, Number(searchParams.get("page") || 1));
  const [searchInput, setSearchInput, searchQuery] = useDebouncedUrlSearch(
    searchParams,
    setSearchParams,
  );

  const [providerId, setProviderId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unreplied: 0, replied: 0, avg_rating: 0 });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const res = await providerReviewApi.listReviews({
        reply_status: replyFilter,
        rating: ratingFilter,
        q: searchQuery,
        page: currentPage,
        per_page: 15,
      });
      if (res?.provider_id) setProviderId(res.provider_id);
      setReviews(Array.isArray(res?.data) ? res.data : []);
      if (res?.counts) setCounts(res.counts);
      if (res?.meta) setMeta(res.meta);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Không thể tải danh sách đánh giá." });
    } finally {
      setIsLoading(false);
    }
  }, [replyFilter, ratingFilter, searchQuery, currentPage]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!providerId) return undefined;

    const channelName = `provider.${providerId}.reviews`;
    const channel = echo.channel(channelName);

    channel.listen(".review.updated", () => {
      loadReviews();
    });

    return () => {
      echo.leaveChannel(channelName);
    };
  }, [providerId, loadReviews]);

  const updateFilterParam = (key, value) => {
    setIsLoading(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      next.set("page", "1");
      return next;
    });
  };

  const handleOpenReply = (rev) => {
    setActiveReplyId(rev.id);
    setReplyDraft(rev.provider_reply || "");
    setFeedback(null);
  };

  const handleSubmitReply = async (e, reviewId) => {
    e.preventDefault();
    if (!replyDraft.trim()) return;

    setIsSubmittingReply(true);
    setFeedback(null);
    try {
      const res = await providerReviewApi.replyReview(reviewId, replyDraft.trim());
      setActiveReplyId(null);
      setReplyDraft("");
      setFeedback({
        type: "success",
        message: res?.message || "Đã gửi phản hồi đánh giá tới du khách!",
      });
      setTimeout(() => setFeedback(null), 4500);
      await loadReviews();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gửi phản hồi thất bại." });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <ProviderLayout
      title="Đánh giá từ du khách"
      subtitle="Theo dõi điểm đánh giá trung bình, nhận xét thực tế sau chuyến đi và phản hồi để tăng uy tín cơ sở."
    >
      <div className="space-y-6">
        {feedback ? (
          <div
            className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        ) : null}

        {/* 4 Thẻ KPI Đánh giá */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
            <span className="text-xs font-semibold text-amber-800 block">Điểm trung bình</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-700">
                {Number(counts.avg_rating || 0).toFixed(1)}
              </span>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-border-subtle bg-surface-elevated">
            <span className="text-xs font-medium text-ink-subtle block">Tổng đánh giá</span>
            <span className="text-2xl font-bold text-ink-primary mt-1 block">{counts.all}</span>
          </div>
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/40">
            <span className="text-xs font-semibold text-sky-800 block">Chưa phản hồi</span>
            <span className="text-2xl font-bold text-sky-700 mt-1 block">{counts.unreplied}</span>
          </div>
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40">
            <span className="text-xs font-semibold text-emerald-800 block">Đã phản hồi</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">{counts.replied}</span>
          </div>
        </div>

        {/* Bộ lọc & Danh sách Đánh giá */}
        <div className="bg-surface-elevated border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {REPLY_TABS.map((tab) => {
                const active = replyFilter === tab.id;
                const count = counts?.[tab.id] ?? 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => updateFilterParam("reply_status", tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      active
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-ink-body hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 ? (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                          active ? "bg-white/25 text-white" : "bg-slate-200 text-ink-subtle"
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm dịch vụ, mã đơn, nội dung..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary"
                />
                <Search className="w-4 h-4 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <select
                value={ratingFilter}
                onChange={(e) => updateFilterParam("rating", e.target.value)}
                aria-label="Lọc theo số sao"
                className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary cursor-pointer"
              >
                <option value="all">Tất cả số sao</option>
                <option value="5">5 sao</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao</option>
                <option value="2">2 sao</option>
                <option value="1">1 sao</option>
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-32 w-full" rounded="rounded-xl" />
              ))
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-ink-subtle">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <Typography variant="body" className="font-semibold text-ink-primary">
                  Chưa có đánh giá nào phù hợp
                </Typography>
                <Typography variant="caption" className="text-ink-subtle block mt-1">
                  Đánh giá từ du khách sau khi check-in hoặc hoàn thành chuyến đi sẽ hiển thị tại
                  đây.
                </Typography>
              </div>
            ) : (
              reviews.map((rev) => {
                const isEditing = activeReplyId === rev.id;
                const reviewerName = rev.user?.name || "Du khách";

                return (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-xl border border-border-subtle bg-white space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-ink-primary">{reviewerName}</div>
                          <div className="text-xs text-ink-subtle flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-teal-700">
                              {rev.service?.name || "--"}
                            </span>
                            {rev.booking?.booking_code ? (
                              <span className="font-mono">· {rev.booking.booking_code}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderStars(rev.rating)}
                        <span className="text-xs text-ink-subtle inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTimeVi(rev.created_at)}
                        </span>
                      </div>
                    </div>

                    {rev.cleanliness_rating ||
                    rev.service_rating ||
                    rev.location_rating ||
                    rev.value_rating ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {rev.cleanliness_rating ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-ink-body font-medium">
                            Vệ sinh: <strong>{rev.cleanliness_rating}/5</strong>
                          </span>
                        ) : null}
                        {rev.service_rating ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-ink-body font-medium">
                            Phục vụ: <strong>{rev.service_rating}/5</strong>
                          </span>
                        ) : null}
                        {rev.location_rating ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-ink-body font-medium">
                            Vị trí: <strong>{rev.location_rating}/5</strong>
                          </span>
                        ) : null}
                        {rev.value_rating ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-ink-body font-medium">
                            Giá trị: <strong>{rev.value_rating}/5</strong>
                          </span>
                        ) : null}
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold ${
                            rev.is_recommended
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {rev.is_recommended ? "Sẽ giới thiệu" : "Chưa giới thiệu"}
                        </span>
                      </div>
                    ) : null}

                    {rev.pros || rev.cons ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {rev.pros ? (
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-900">
                            <span className="font-semibold">Điểm hài lòng: </span>
                            {rev.pros}
                          </div>
                        ) : null}
                        {rev.cons ? (
                          <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 text-amber-900">
                            <span className="font-semibold">Cần cải thiện: </span>
                            {rev.cons}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {rev.content ? (
                      <p className="text-sm text-ink-body leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                        {rev.content}
                      </p>
                    ) : (
                      <p className="text-xs italic text-ink-subtle">
                        Du khách chỉ chấm điểm sao, không kèm nhận xét chữ.
                      </p>
                    )}

                    {/* Phản hồi hiện tại hoặc form trả lời */}
                    {rev.provider_reply && !isEditing ? (
                      <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800">
                            <MessageSquareQuote className="w-3.5 h-3.5" />
                            <span>Phản hồi của bạn</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReply(rev)}
                            className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-ink-primary">{rev.provider_reply}</p>
                      </div>
                    ) : null}

                    {!rev.provider_reply && !isEditing ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenReply(rev)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <MessageSquareQuote className="w-3.5 h-3.5" />
                          Phản hồi du khách
                        </button>
                      </div>
                    ) : null}

                    {isEditing ? (
                      <form onSubmit={(e) => handleSubmitReply(e, rev.id)} className="space-y-2.5">
                        <textarea
                          rows={2}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Nhập lời cảm ơn hoặc giải trình lịch sự tới du khách..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-sm text-ink-primary outline-hidden focus:ring-2 focus:ring-teal-500/20"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            disabled={isSubmittingReply}
                            className="px-3.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs font-semibold text-ink-body cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingReply || replyDraft.trim().length < 2}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {isSubmittingReply ? "Đang gửi..." : "Gửi phản hồi"}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {!isLoading && meta.last_page > 1 ? (
            <div className="px-5 py-3.5 border-t border-border-subtle bg-slate-50/60 flex items-center justify-between text-xs text-ink-subtle">
              <span>
                Trang <strong>{meta.current_page}</strong> / <strong>{meta.last_page}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() => {
                    setIsLoading(true);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("page", String(meta.current_page - 1));
                      return next;
                    });
                  }}
                  className="px-3 py-1 rounded-lg border border-border-subtle bg-white disabled:opacity-40 font-semibold text-ink-primary cursor-pointer"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => {
                    setIsLoading(true);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("page", String(meta.current_page + 1));
                      return next;
                    });
                  }}
                  className="px-3 py-1 rounded-lg border border-border-subtle bg-white disabled:opacity-40 font-semibold text-ink-primary cursor-pointer"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProviderLayout>
  );
}
