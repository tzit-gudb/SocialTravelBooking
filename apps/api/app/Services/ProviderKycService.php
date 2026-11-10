<?php

namespace App\Services;

use App\Enums\ProviderStatus;
use App\Enums\UserRole;
use App\Models\BusinessType;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProviderKycService
{
    public function __construct(
        protected MediaService $mediaService
    ) {}

    /**
     * Handle submission or updating of Provider KYC profile.
     * Supports storing up to 5 license image paths or 1 PDF path as JSON array.
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, UploadedFile>|UploadedFile|null  $licenseFiles
     */
    public function submitKyc(
        User $user,
        array $data,
        array|UploadedFile|null $licenseFiles = null
    ): ProviderProfile {
        return DB::transaction(function () use ($user, $data, $licenseFiles) {
            $businessTypeId = $this->resolveBusinessTypeId($data);

            $existingProfile = ProviderProfile::where('user_id', $user->id)->first();

            // Store license file(s) into private storage disk and return an array of paths
            $licensePaths = $this->resolveLicensePaths(
                $licenseFiles,
                $data['business_license_url'] ?? null,
                $existingProfile?->business_license_url
            );

            $address = trim($data['address']);
            if (! empty($data['city']) && ! str_contains($address, $data['city'])) {
                $address .= ', '.$data['city'];
            }

            $profile = ProviderProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'business_name' => trim($data['business_name']),
                    'representative_name' => trim($data['representative_name']),
                    'business_type_id' => $businessTypeId,
                    'phone' => trim($data['phone']),
                    'address' => $address,
                    'business_license_url' => $licensePaths,
                    'description' => isset($data['description']) ? trim($data['description']) : null,
                    'status' => ProviderStatus::Pending->value,
                    'rejection_reason' => null,
                ]
            );

            // Sync user role and status
            $user->role = UserRole::Provider->value;
            $user->status = 'pending';
            $user->save();

            return $profile->load('businessType');
        });
    }

    /**
     * Retrieve current KYC status for the authenticated Provider.
     *
     * @return array<string, mixed>
     */
    public function getKycStatus(User $user): array
    {
        $profile = ProviderProfile::with('businessType')->where('user_id', $user->id)->first();

        if (! $profile) {
            return [
                'status' => ProviderStatus::Draft->value,
                'is_submitted' => false,
                'submitted_at' => null,
                'rejection_reason' => null,
                'approved_at' => null,
                'profile' => null,
            ];
        }

        return [
            'status' => $profile->status,
            'is_submitted' => $profile->status !== ProviderStatus::Draft->value,
            'submitted_at' => $profile->updated_at?->toISOString() ?? $profile->created_at?->toISOString(),
            'rejection_reason' => $profile->rejection_reason,
            'approved_at' => $profile->approved_at?->toISOString(),
            'profile' => [
                'id' => $profile->id,
                'user_id' => $profile->user_id,
                'business_name' => $profile->business_name,
                'representative_name' => $profile->representative_name,
                'business_type_id' => $profile->business_type_id,
                'business_type' => $profile->businessType ? [
                    'id' => $profile->businessType->id,
                    'name' => $profile->businessType->name,
                    'type' => $profile->businessType->type,
                    'slug' => $profile->businessType->slug,
                ] : null,
                'phone' => $profile->phone,
                'address' => $profile->address,
                'business_license_url' => $profile->business_license_url ?? [],
                'description' => $profile->description,
                'status' => $profile->status,
                'rejection_reason' => $profile->rejection_reason,
                'approved_at' => $profile->approved_at?->toISOString(),
                'created_at' => $profile->created_at?->toISOString(),
                'updated_at' => $profile->updated_at?->toISOString(),
            ],
        ];
    }

    protected function resolveBusinessTypeId(array $data): ?int
    {
        if (! empty($data['business_type_id'])) {
            return (int) $data['business_type_id'];
        }

        if (! empty($data['business_type'])) {
            $typeName = trim($data['business_type']);

            $foundType = BusinessType::where('name', $typeName)
                ->orWhere('slug', Str::slug($typeName))
                ->orWhere('name', 'LIKE', "%{$typeName}%")
                ->first();

            if ($foundType) {
                return $foundType->id;
            }
        }

        return BusinessType::first()?->id;
    }

    /**
     * Store license file(s) or URLs into private storage and return an array of paths.
     *
     * @param  array<int, UploadedFile>|UploadedFile|null  $files
     * @return array<int, string>
     */
    protected function resolveLicensePaths(
        array|UploadedFile|null $files,
        array|string|null $licenseUrlOrBase64,
        array|string|null $existingPaths
    ): array {
        $paths = [];

        // 1. Process binary files
        if ($files instanceof UploadedFile) {
            $uploaded = $this->mediaService->uploadPrivateFile($files, 'kyc_license');
            $paths[] = $uploaded['file_path'];
        } elseif (is_array($files)) {
            foreach ($files as $file) {
                if ($file instanceof UploadedFile) {
                    $uploaded = $this->mediaService->uploadPrivateFile($file, 'kyc_license');
                    $paths[] = $uploaded['file_path'];
                }
            }
        }

        if (! empty($paths)) {
            return $paths;
        }

        // 2. Process URLs or Base64 strings
        if (! empty($licenseUrlOrBase64)) {
            $rawItems = $licenseUrlOrBase64;
            if (is_string($rawItems) && str_starts_with($rawItems, '[') && str_ends_with($rawItems, ']')) {
                $rawItems = json_decode($rawItems, true) ?: [$rawItems];
            } elseif (! is_array($rawItems)) {
                $rawItems = [$rawItems];
            }

            foreach ($rawItems as $item) {
                if (! is_string($item) || empty(trim($item))) {
                    continue;
                }

                $item = trim($item);

                // Reject browser-local blob URLs that cannot exist on backend filesystem or network
                if (str_starts_with($item, 'blob:')) {
                    continue;
                }

                // Base64 Data URL
                if (str_starts_with($item, 'data:')) {
                    $paths[] = $this->storeBase64PrivateLicense($item);

                    continue;
                }

                // External or internal URL
                if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
                    if (str_contains($item, '/storage/') || str_contains($item, '/api/v1/media/private/')) {
                        $paths[] = $this->mediaService->cleanRelativePath($item);
                    } else {
                        try {
                            $paths[] = $this->downloadAndStorePrivateLicense($item);
                        } catch (\Throwable) {
                            $paths[] = $item;
                        }
                    }

                    continue;
                }

                // Relative path
                $paths[] = $this->mediaService->cleanRelativePath($item);
            }
        }

        if (! empty($paths)) {
            return $paths;
        }

        // 3. Fallback to existing paths
        if (! empty($existingPaths)) {
            return is_array($existingPaths) ? $existingPaths : [$existingPaths];
        }

        return [];
    }

    protected function storeBase64PrivateLicense(string $base64Data): string
    {
        if (! preg_match('/^data:(image\/[a-zA-Z0-9.+]+|application\/pdf);base64,(.+)$/', $base64Data, $matches)) {
            throw new \InvalidArgumentException('Dữ liệu tệp tin Base64 không đúng định dạng cho phép.');
        }

        $mimeType = $matches[1];
        $binaryContent = base64_decode($matches[2], true);

        if ($binaryContent === false) {
            throw new \InvalidArgumentException('Không thể giải mã dữ liệu tệp tin Base64.');
        }

        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
            default => 'jpg',
        };

        $fileName = Str::uuid()->toString().'.'.$extension;
        $relativePath = 'kyc/licenses/'.$fileName;

        Storage::disk('local')->put($relativePath, $binaryContent);

        return $relativePath;
    }

    protected function downloadAndStorePrivateLicense(string $url): string
    {
        $response = Http::timeout(10)->get($url);

        if (! $response->successful()) {
            return $url;
        }

        $body = $response->body();

        if (strlen($body) > 10 * 1024 * 1024) {
            return $url;
        }

        $contentType = strtolower($response->header('Content-Type') ?? '');
        $urlPath = strtolower(parse_url($url, PHP_URL_PATH) ?? '');

        $extension = 'jpg';
        if (str_contains($contentType, 'pdf') || str_ends_with($urlPath, '.pdf')) {
            $extension = 'pdf';
        } elseif (str_contains($contentType, 'png') || str_ends_with($urlPath, '.png')) {
            $extension = 'png';
        } elseif (str_contains($contentType, 'webp') || str_ends_with($urlPath, '.webp')) {
            $extension = 'webp';
        }

        $fileName = Str::uuid()->toString().'.'.$extension;
        $relativePath = 'kyc/licenses/'.$fileName;

        Storage::disk('local')->put($relativePath, $body);

        return $relativePath;
    }
}
