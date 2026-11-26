<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\Service;
use App\Models\SocialNotification;
use App\Models\SocialProfile;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SocialService
{
    /**
     * Lấy trạng thái & thông tin hồ sơ MXH của người dùng hiện tại.
     */
    public function getMyProfile(User $user): array
    {
        $user->load(['socialProfile', 'touristProfile', 'providerProfile']);
        $profile = $user->socialProfile;

        $suggestedDisplayName = $user->touristProfile?->name
            ?? $user->providerProfile?->business_name
            ?? explode('@', $user->email ?? 'traveler')[0];

        $baseHandle = Str::of($suggestedDisplayName)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->substr(0, 24)
            ->value();

        if (strlen($baseHandle) < 3) {
            $baseHandle = 'traveler_'.$user->id;
        }

        return [
            'is_initialized' => $profile !== null,
            'social_active' => (bool) $user->social_active && $profile !== null,
            'profile' => $profile ? $this->formatProfile($profile, false, true) : null,
            'suggestions' => [
                'display_name' => $suggestedDisplayName,
                'username' => $baseHandle,
            ],
        ];
    }

    /**
     * Khởi tạo (lần đầu) hoặc cập nhật hồ sơ MXH. Kích hoạt ngay lập tức không cần duyệt.
     */
    public function setupOrUpdateProfile(User $user, array $data): array
    {
        $profile = DB::transaction(function () use ($user, $data) {
            $profile = SocialProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'username' => $data['username'],
                    'display_name' => $data['display_name'],
                    'bio' => $data['bio'] ?? null,
                    'avatar_url' => $data['avatar_url'] ?? null,
                    'cover_photo_url' => $data['cover_photo_url'] ?? null,
                    'website_url' => $data['website_url'] ?? null,
                ]
            );

            if (! $user->social_active) {
                $user->forceFill(['social_active' => true])->save();
            }

            return $profile->fresh();
        });

        return [
            'is_initialized' => true,
            'social_active' => true,
            'profile' => $this->formatProfile($profile, false, true),
        ];
    }

    /**
     * Xem hồ sơ MXH công khai của một người dùng bất kỳ.
     */
    public function getUserProfile(User $viewer, int $targetUserId): array
    {
        $profile = SocialProfile::query()
            ->where('user_id', $targetUserId)
            ->first();

        if (! $profile) {
            throw new NotFoundHttpException('Người dùng này chưa khởi tạo tài khoản mạng xã hội.');
        }

        $isOwner = $viewer->id === $targetUserId;
        $isFollowing = ! $isOwner && DB::table('follows')
            ->where('follower_id', $viewer->id)
            ->where('following_id', $targetUserId)
            ->exists();

        return $this->formatProfile($profile, $isFollowing, $isOwner);
    }

    /**
     * Bảng tin bài đăng cộng đồng (for_you | following | mine | saved).
     */
    public function listFeed(User $viewer, array $filters = []): array
    {
        $tab = $filters['tab'] ?? 'for_you';
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 50);

        $query = Post::query()
            ->where('is_hidden', false)
            ->with([
                'user:id,email,role,social_active',
                'user.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
                'user.touristProfile:id,user_id,name',
                'user.providerProfile:id,user_id,business_name',
                'media',
                'tags:id,name,display_name',
                'service:id,name,type,base_price,price_unit',
            ]);

        if ($tab === 'mine') {
            $query->where('user_id', $viewer->id);
        } elseif ($tab === 'saved') {
            $savedIds = DB::table('saved_posts')
                ->where('user_id', $viewer->id)
                ->orderByDesc('created_at')
                ->pluck('post_id')
                ->all();

            if (empty($savedIds)) {
                return $this->emptyPaginatedResponse($perPage);
            }
            $query->whereIn('id', $savedIds)
                ->where(function ($q) use ($viewer) {
                    $q->where('visibility', 'public')
                        ->orWhere('user_id', $viewer->id);
                });
        } elseif ($tab === 'following') {
            $followingIds = DB::table('follows')
                ->where('follower_id', $viewer->id)
                ->pluck('following_id')
                ->all();

            $followingIds[] = $viewer->id;
            $query->whereIn('user_id', $followingIds)
                ->whereIn('visibility', ['public', 'followers']);
        } else {
            // for_you (mặc định)
            if (! empty($filters['user_id'])) {
                $targetId = (int) $filters['user_id'];
                $query->where('user_id', $targetId);
                if ($targetId !== $viewer->id) {
                    $query->where('visibility', 'public');
                }
            } else {
                $query->where('visibility', 'public');
            }
        }

        if (! empty($filters['q'])) {
            $keyword = trim((string) $filters['q']);
            $query->where(function ($q) use ($keyword) {
                $q->where('content', 'ilike', "%{$keyword}%")
                    ->orWhere('location_name', 'ilike', "%{$keyword}%")
                    ->orWhereHas('tags', fn ($tq) => $tq->where('name', 'ilike', "%{$keyword}%"));
            });
        }

        if (! empty($filters['tag'])) {
            $tagName = ltrim(strtolower(trim((string) $filters['tag'])), '#');
            $query->whereHas('tags', fn ($tq) => $tq->where('name', $tagName));
        }

        $paginator = $query
            ->orderByDesc('is_pinned')
            ->latest('created_at')
            ->paginate($perPage);

        return $this->formatPaginatedPosts($paginator, $viewer);
    }

    /**
     * Đăng bài viết mới lên cộng đồng.
     */
    public function createPost(User $user, array $data): array
    {
        $profile = $this->requireInitializedProfile($user);

        $post = DB::transaction(function () use ($user, $profile, $data) {
            $serviceType = null;
            if (! empty($data['service_id'])) {
                $service = Service::query()->find($data['service_id']);
                $serviceType = $service?->type;
            }

            $cleanContent = trim((string) ($data['content'] ?? ''));

            $post = Post::query()->create([
                'user_id' => $user->id,
                'content' => $cleanContent !== '' ? $cleanContent : null,
                'location_name' => isset($data['location_name']) && trim((string) $data['location_name']) !== ''
                    ? trim((string) $data['location_name'])
                    : null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'service_id' => $data['service_id'] ?? null,
                'service_type' => $serviceType,
                'visibility' => $data['visibility'] ?? 'public',
            ]);

            // Lưu media URLs (nếu có)
            $mediaUrls = array_values(array_filter($data['media_urls'] ?? [], fn ($url) => is_string($url) && trim($url) !== ''));
            foreach ($mediaUrls as $idx => $url) {
                PostMedia::query()->create([
                    'post_id' => $post->id,
                    'media_type' => 'image',
                    'url' => trim($url),
                    'sort_order' => $idx,
                ]);
            }

            // Đồng bộ hashtags từ mảng tags + tự động tách #hashtag trong nội dung
            $rawTags = $data['tags'] ?? [];
            if ($cleanContent !== '') {
                preg_match_all('/#([\p{L}\p{N}_]+)/u', $cleanContent, $matches);
                if (! empty($matches[1])) {
                    $rawTags = array_merge($rawTags, $matches[1]);
                }
            }

            $tagIds = [];
            foreach ($rawTags as $rawTag) {
                $display = ltrim(trim((string) $rawTag), '#');
                $slug = Str::of($display)->ascii()->lower()->replaceMatches('/[^a-z0-9_]+/', '')->value();
                if ($slug === '' || strlen($slug) > 100) {
                    continue;
                }
                $tag = Tag::query()->firstOrCreate(
                    ['name' => $slug],
                    [
                        'display_name' => $display !== '' ? Str::limit($display, 100, '') : $slug,
                        'type' => 'general',
                        'posts_count' => 0,
                    ]
                );
                if (! in_array($tag->id, $tagIds, true)) {
                    $tagIds[] = $tag->id;
                    $tag->increment('posts_count');
                }
            }

            if (! empty($tagIds)) {
                $post->tags()->syncWithoutDetaching($tagIds);
            }

            $profile->increment('posts_count');

            return $post;
        });

        $post->load([
            'user:id,email,role,social_active',
            'user.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
            'user.touristProfile:id,user_id,name',
            'media',
            'tags:id,name,display_name',
            'service:id,name,type,base_price,price_unit',
        ]);

        return $this->formatPost($post, $user, [], [], []);
    }

    /**
     * Cập nhật nội dung, địa điểm, dịch vụ gắn kèm, hashtag & quyền riêng tư bài viết của chính chủ.
     */
    public function updatePost(User $user, int $postId, array $data): array
    {
        $post = Post::query()->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        if ($post->user_id !== $user->id && $user->role !== 'admin') {
            throw new AccessDeniedHttpException('Bạn không có quyền chỉnh sửa bài viết này.');
        }

        DB::transaction(function () use ($post, $data) {
            $updates = [];

            if (array_key_exists('content', $data)) {
                $clean = trim((string) ($data['content'] ?? ''));
                $updates['content'] = $clean !== '' ? $clean : null;
            }

            if (array_key_exists('location_name', $data)) {
                $loc = trim((string) ($data['location_name'] ?? ''));
                $updates['location_name'] = $loc !== '' ? $loc : null;
            }

            if (array_key_exists('visibility', $data)) {
                $updates['visibility'] = $data['visibility'];
            }

            if (array_key_exists('service_id', $data)) {
                $serviceId = $data['service_id'];
                $updates['service_id'] = $serviceId;
                $updates['service_type'] = $serviceId
                    ? Service::query()->whereKey($serviceId)->value('type')
                    : null;
            }

            if (! empty($updates)) {
                $post->update($updates);
            }

            if (array_key_exists('tags', $data) || array_key_exists('content', $data)) {
                $rawTags = $data['tags'] ?? [];
                $contentForTags = (string) ($post->fresh()->content ?? '');
                if ($contentForTags !== '') {
                    preg_match_all('/#([\p{L}\p{N}_]+)/u', $contentForTags, $matches);
                    if (! empty($matches[1])) {
                        $rawTags = array_merge($rawTags, $matches[1]);
                    }
                }

                $tagIds = [];
                foreach ($rawTags as $rawTag) {
                    $display = ltrim(trim((string) $rawTag), '#');
                    $slug = Str::of($display)->ascii()->lower()->replaceMatches('/[^a-z0-9_]+/', '')->value();
                    if ($slug === '' || strlen($slug) > 100) {
                        continue;
                    }
                    $tag = Tag::query()->firstOrCreate(
                        ['name' => $slug],
                        [
                            'display_name' => $display !== '' ? Str::limit($display, 100, '') : $slug,
                            'type' => 'general',
                            'posts_count' => 0,
                        ]
                    );
                    if (! in_array($tag->id, $tagIds, true)) {
                        $tagIds[] = $tag->id;
                    }
                }

                $post->tags()->sync($tagIds);
            }
        });

        $post = $post->fresh()->load([
            'user:id,email,role,social_active',
            'user.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
            'user.touristProfile:id,user_id,name',
            'media',
            'tags:id,name,display_name',
            'service:id,name,type,base_price,price_unit',
        ]);

        $likedIds = DB::table('likes')->where('user_id', $user->id)->where('post_id', $post->id)->pluck('post_id')->map(fn ($v) => (int) $v)->all();
        $savedIds = DB::table('saved_posts')->where('user_id', $user->id)->where('post_id', $post->id)->pluck('post_id')->map(fn ($v) => (int) $v)->all();

        return $this->formatPost($post, $user, $likedIds, $savedIds, []);
    }

    /**
     * Xóa bài viết (chỉ chính chủ hoặc admin).
     */
    public function deletePost(User $user, int $postId): void
    {
        $post = Post::query()->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        if ($post->user_id !== $user->id && $user->role !== 'admin') {
            throw new AccessDeniedHttpException('Bạn không có quyền xóa bài viết này.');
        }

        DB::transaction(function () use ($post) {
            $post->delete();
            SocialProfile::query()
                ->where('user_id', $post->user_id)
                ->where('posts_count', '>', 0)
                ->decrement('posts_count');
        });
    }

    /**
     * Bật/tắt thả tim bài viết.
     */
    public function toggleLike(User $user, int $postId): array
    {
        $this->requireInitializedProfile($user);

        $post = Post::query()->where('is_hidden', false)->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        return DB::transaction(function () use ($user, $post) {
            $existing = DB::table('likes')
                ->where('user_id', $user->id)
                ->where('post_id', $post->id)
                ->first();

            if ($existing) {
                DB::table('likes')
                    ->where('user_id', $user->id)
                    ->where('post_id', $post->id)
                    ->delete();

                $likesCount = max(0, (int) $post->likes_count - 1);
                $post->update(['likes_count' => $likesCount]);

                return [
                    'post_id' => $post->id,
                    'is_liked' => false,
                    'likes_count' => $likesCount,
                ];
            }

            DB::table('likes')->insert([
                'user_id' => $user->id,
                'post_id' => $post->id,
                'created_at' => now(),
            ]);

            $likesCount = (int) $post->likes_count + 1;
            $post->update(['likes_count' => $likesCount]);

            if ($post->user_id !== $user->id) {
                $this->createNotification(
                    recipientId: $post->user_id,
                    actorId: $user->id,
                    type: 'like_post',
                    postId: $post->id,
                    data: ['preview' => Str::limit((string) $post->content, 80)]
                );
            }

            return [
                'post_id' => $post->id,
                'is_liked' => true,
                'likes_count' => $likesCount,
            ];
        });
    }

    /**
     * Bật/tắt lưu (bookmark) bài viết.
     */
    public function toggleSave(User $user, int $postId): array
    {
        $this->requireInitializedProfile($user);

        $post = Post::query()->where('is_hidden', false)->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        $existing = DB::table('saved_posts')
            ->where('user_id', $user->id)
            ->where('post_id', $post->id)
            ->first();

        if ($existing) {
            DB::table('saved_posts')
                ->where('user_id', $user->id)
                ->where('post_id', $post->id)
                ->delete();

            return [
                'post_id' => $post->id,
                'is_saved' => false,
            ];
        }

        DB::table('saved_posts')->insert([
            'user_id' => $user->id,
            'post_id' => $post->id,
            'created_at' => now(),
        ]);

        return [
            'post_id' => $post->id,
            'is_saved' => true,
        ];
    }

    /**
     * Lấy danh sách bình luận của bài viết.
     */
    public function listComments(int $postId, int $perPage = 20): array
    {
        $post = Post::query()->where('is_hidden', false)->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        $paginator = Comment::query()
            ->where('post_id', $post->id)
            ->where('is_hidden', false)
            ->with([
                'user:id,email,role',
                'user.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
                'user.touristProfile:id,user_id,name',
            ])
            ->oldest('created_at')
            ->paginate(min(max($perPage, 1), 50));

        $items = $paginator->getCollection()
            ->map(fn (Comment $comment) => $this->formatComment($comment))
            ->values()
            ->all();

        return [
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * Thêm bình luận cho bài viết.
     */
    public function addComment(User $user, int $postId, array $data): array
    {
        $this->requireInitializedProfile($user);

        $post = Post::query()->where('is_hidden', false)->find($postId);
        if (! $post) {
            throw new NotFoundHttpException('Không tìm thấy bài viết.');
        }

        $comment = DB::transaction(function () use ($user, $post, $data) {
            $comment = Comment::query()->create([
                'post_id' => $post->id,
                'user_id' => $user->id,
                'parent_id' => $data['parent_id'] ?? null,
                'content' => trim((string) $data['content']),
            ]);

            $post->increment('comments_count');

            if ($post->user_id !== $user->id) {
                $this->createNotification(
                    recipientId: $post->user_id,
                    actorId: $user->id,
                    type: 'comment_post',
                    postId: $post->id,
                    commentId: $comment->id,
                    data: ['preview' => Str::limit($comment->content, 80)]
                );
            }

            return $comment;
        });

        $comment->load([
            'user:id,email,role',
            'user.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
            'user.touristProfile:id,user_id,name',
        ]);

        return [
            'comment' => $this->formatComment($comment),
            'comments_count' => (int) $post->fresh()->comments_count,
        ];
    }

    /**
     * Bật/tắt theo dõi người dùng khác.
     */
    public function toggleFollow(User $viewer, int $targetUserId): array
    {
        $viewerProfile = $this->requireInitializedProfile($viewer);

        if ($viewer->id === $targetUserId) {
            throw new HttpException(422, 'Bạn không thể tự theo dõi chính mình.');
        }

        $targetProfile = SocialProfile::query()->where('user_id', $targetUserId)->first();
        if (! $targetProfile) {
            throw new NotFoundHttpException('Tài khoản mạng xã hội này không tồn tại.');
        }

        return DB::transaction(function () use ($viewer, $viewerProfile, $targetUserId, $targetProfile) {
            $existing = DB::table('follows')
                ->where('follower_id', $viewer->id)
                ->where('following_id', $targetUserId)
                ->first();

            if ($existing) {
                DB::table('follows')
                    ->where('follower_id', $viewer->id)
                    ->where('following_id', $targetUserId)
                    ->delete();

                $newFollowers = max(0, (int) $targetProfile->followers_count - 1);
                $targetProfile->update(['followers_count' => $newFollowers]);

                $newFollowing = max(0, (int) $viewerProfile->following_count - 1);
                $viewerProfile->update(['following_count' => $newFollowing]);

                return [
                    'user_id' => $targetUserId,
                    'is_following' => false,
                    'followers_count' => $newFollowers,
                    'viewer_following_count' => $newFollowing,
                ];
            }

            DB::table('follows')->insert([
                'follower_id' => $viewer->id,
                'following_id' => $targetUserId,
                'created_at' => now(),
            ]);

            $newFollowers = (int) $targetProfile->followers_count + 1;
            $targetProfile->update(['followers_count' => $newFollowers]);

            $newFollowing = (int) $viewerProfile->following_count + 1;
            $viewerProfile->update(['following_count' => $newFollowing]);

            $this->createNotification(
                recipientId: $targetUserId,
                actorId: $viewer->id,
                type: 'follow_user',
                data: ['message' => 'đã bắt đầu theo dõi bạn']
            );

            return [
                'user_id' => $targetUserId,
                'is_following' => true,
                'followers_count' => $newFollowers,
                'viewer_following_count' => $newFollowing,
            ];
        });
    }

    /**
     * Tìm kiếm tài khoản & bài viết trong cộng đồng (kèm gợi ý khi chưa nhập từ khóa).
     */
    public function searchSocial(User $viewer, string $keyword = ''): array
    {
        $q = trim($keyword);

        $followingIds = DB::table('follows')
            ->where('follower_id', $viewer->id)
            ->pluck('following_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $profileQuery = SocialProfile::query()
            ->where('user_id', '!=', $viewer->id);

        if ($q !== '') {
            $cleanHandle = ltrim($q, '@');
            $profileQuery->where(function ($sub) use ($q, $cleanHandle) {
                $sub->where('username', 'ilike', "%{$cleanHandle}%")
                    ->orWhere('display_name', 'ilike', "%{$q}%")
                    ->orWhere('bio', 'ilike', "%{$q}%");
            });
        }

        $profiles = $profileQuery
            ->orderByDesc('followers_count')
            ->orderByDesc('posts_count')
            ->limit(12)
            ->get()
            ->map(fn (SocialProfile $p) => $this->formatProfile(
                $p,
                in_array((int) $p->user_id, $followingIds, true),
                false
            ))
            ->values()
            ->all();

        $postsResult = $this->listFeed($viewer, [
            'tab' => 'for_you',
            'q' => $q,
            'per_page' => 12,
        ]);

        $trendingTags = Tag::query()
            ->orderByDesc('posts_count')
            ->limit(8)
            ->get(['id', 'name', 'display_name', 'posts_count'])
            ->map(fn (Tag $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'display_name' => $t->display_name,
                'posts_count' => (int) $t->posts_count,
            ])
            ->values()
            ->all();

        return [
            'query' => $q,
            'profiles' => $profiles,
            'posts' => $postsResult['data'],
            'trending_tags' => $trendingTags,
        ];
    }

    /**
     * Danh sách hoạt động / thông báo MXH của người dùng.
     */
    public function listActivity(User $user, int $perPage = 25): array
    {
        $paginator = SocialNotification::query()
            ->where('user_id', $user->id)
            ->with([
                'actor:id,email,role',
                'actor.socialProfile:id,user_id,username,display_name,avatar_url,is_verified',
                'actor.touristProfile:id,user_id,name',
                'post:id,content,location_name',
            ])
            ->latest('created_at')
            ->paginate(min(max($perPage, 1), 50));

        $unreadCount = SocialNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        $items = $paginator->getCollection()->map(function (SocialNotification $n) {
            $actorProfile = $n->actor?->socialProfile;
            $actorName = $actorProfile?->display_name ?? $n->actor?->display_name ?? 'Người dùng';
            $actorUsername = $actorProfile?->username ?? explode('@', $n->actor?->email ?? 'traveler')[0];

            $actionText = match ($n->type) {
                'like_post' => 'đã thích bài viết của bạn',
                'comment_post' => 'đã bình luận bài viết của bạn',
                'reply_comment' => 'đã trả lời bình luận của bạn',
                'follow_user' => 'đã bắt đầu theo dõi bạn',
                default => 'đã tương tác với bạn',
            };

            return [
                'id' => $n->id,
                'type' => $n->type,
                'action_text' => $actionText,
                'is_read' => (bool) $n->is_read,
                'post_id' => $n->post_id,
                'comment_id' => $n->comment_id,
                'preview' => $n->data['preview'] ?? ($n->post ? Str::limit((string) $n->post->content, 80) : null),
                'created_at' => $n->created_at,
                'actor' => [
                    'id' => $n->actor?->id,
                    'username' => $actorUsername,
                    'display_name' => $actorName,
                    'avatar_url' => $actorProfile?->avatar_url,
                    'is_verified' => (bool) ($actorProfile?->is_verified ?? false),
                ],
            ];
        })->values()->all();

        return [
            'data' => $items,
            'unread_count' => $unreadCount,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * Đánh dấu tất cả thông báo MXH đã đọc.
     */
    public function markActivityAsRead(User $user): int
    {
        return SocialNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────────────────────────

    private function requireInitializedProfile(User $user): SocialProfile
    {
        $profile = $user->socialProfile()->first();
        if (! $profile) {
            throw new HttpException(403, 'Vui lòng khởi tạo hồ sơ mạng xã hội trước khi thực hiện thao tác này.');
        }

        return $profile;
    }

    private function createNotification(
        int $recipientId,
        int $actorId,
        string $type,
        ?int $postId = null,
        ?int $commentId = null,
        array $data = []
    ): void {
        if ($recipientId === $actorId) {
            return;
        }

        SocialNotification::query()->create([
            'user_id' => $recipientId,
            'actor_id' => $actorId,
            'type' => $type,
            'post_id' => $postId,
            'comment_id' => $commentId,
            'data' => $data ?: null,
            'is_read' => false,
        ]);
    }

    private function formatProfile(SocialProfile $profile, bool $isFollowing, bool $isOwner): array
    {
        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'username' => $profile->username,
            'display_name' => $profile->display_name,
            'bio' => $profile->bio,
            'avatar_url' => $profile->avatar_url,
            'cover_photo_url' => $profile->cover_photo_url,
            'website_url' => $profile->website_url,
            'is_verified' => (bool) $profile->is_verified,
            'followers_count' => (int) $profile->followers_count,
            'following_count' => (int) $profile->following_count,
            'posts_count' => (int) $profile->posts_count,
            'is_following' => $isFollowing,
            'is_owner' => $isOwner,
            'created_at' => $profile->created_at,
        ];
    }

    private function formatPaginatedPosts(LengthAwarePaginator $paginator, User $viewer): array
    {
        $collection = $paginator->getCollection();
        $postIds = $collection->pluck('id')->all();
        $authorIds = $collection->pluck('user_id')->unique()->values()->all();

        $likedPostIds = empty($postIds)
            ? []
            : DB::table('likes')
                ->where('user_id', $viewer->id)
                ->whereIn('post_id', $postIds)
                ->pluck('post_id')
                ->map(fn ($id) => (int) $id)
                ->all();

        $savedPostIds = empty($postIds)
            ? []
            : DB::table('saved_posts')
                ->where('user_id', $viewer->id)
                ->whereIn('post_id', $postIds)
                ->pluck('post_id')
                ->map(fn ($id) => (int) $id)
                ->all();

        $followingAuthorIds = empty($authorIds)
            ? []
            : DB::table('follows')
                ->where('follower_id', $viewer->id)
                ->whereIn('following_id', $authorIds)
                ->pluck('following_id')
                ->map(fn ($id) => (int) $id)
                ->all();

        $items = $collection
            ->map(fn (Post $post) => $this->formatPost($post, $viewer, $likedPostIds, $savedPostIds, $followingAuthorIds))
            ->values()
            ->all();

        return [
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    private function formatPost(
        Post $post,
        User $viewer,
        array $likedPostIds,
        array $savedPostIds,
        array $followingAuthorIds
    ): array {
        $sp = $post->user?->socialProfile;
        $displayName = $sp?->display_name ?? $post->user?->display_name ?? 'Du khách';
        $username = $sp?->username ?? explode('@', $post->user?->email ?? 'traveler')[0];

        return [
            'id' => $post->id,
            'content' => $post->content,
            'location_name' => $post->location_name,
            'visibility' => $post->visibility,
            'is_pinned' => (bool) $post->is_pinned,
            'likes_count' => (int) $post->likes_count,
            'comments_count' => (int) $post->comments_count,
            'shares_count' => (int) $post->shares_count,
            'is_liked' => in_array((int) $post->id, $likedPostIds, true),
            'is_saved' => in_array((int) $post->id, $savedPostIds, true),
            'is_owner' => $post->user_id === $viewer->id,
            'is_following_author' => in_array((int) $post->user_id, $followingAuthorIds, true),
            'created_at' => $post->created_at,
            'author' => [
                'id' => $post->user?->id,
                'username' => $username,
                'display_name' => $displayName,
                'avatar_url' => $sp?->avatar_url,
                'is_verified' => (bool) ($sp?->is_verified ?? false),
            ],
            'media' => $post->media->map(fn (PostMedia $m) => [
                'id' => $m->id,
                'media_type' => $m->media_type,
                'url' => $m->url,
                'thumbnail_url' => $m->thumbnail_url,
            ])->values()->all(),
            'tags' => $post->tags->map(fn (Tag $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'display_name' => $t->display_name,
            ])->values()->all(),
            'service' => $post->service ? [
                'id' => $post->service->id,
                'name' => $post->service->name,
                'type' => $post->service->type,
                'base_price' => (float) $post->service->base_price,
                'price_unit' => $post->service->price_unit,
            ] : null,
        ];
    }

    private function formatComment(Comment $comment): array
    {
        $sp = $comment->user?->socialProfile;
        $displayName = $sp?->display_name ?? $comment->user?->display_name ?? 'Du khách';
        $username = $sp?->username ?? explode('@', $comment->user?->email ?? 'traveler')[0];

        return [
            'id' => $comment->id,
            'post_id' => $comment->post_id,
            'parent_id' => $comment->parent_id,
            'content' => $comment->content,
            'likes_count' => (int) $comment->likes_count,
            'created_at' => $comment->created_at,
            'author' => [
                'id' => $comment->user?->id,
                'username' => $username,
                'display_name' => $displayName,
                'avatar_url' => $sp?->avatar_url,
                'is_verified' => (bool) ($sp?->is_verified ?? false),
            ],
        ];
    }

    private function emptyPaginatedResponse(int $perPage): array
    {
        return [
            'data' => [],
            'meta' => [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $perPage,
                'total' => 0,
            ],
        ];
    }
}
