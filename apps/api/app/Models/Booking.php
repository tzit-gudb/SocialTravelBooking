<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_code',
        'qr_checkin_token',
        'user_id',
        'service_id',
        'provider_id',
        'room_type_id',
        'coupon_id',
        'affiliate_post_id',
        'check_in_date',
        'check_out_date',
        'checked_in_at',
        'num_adults',
        'num_children',
        'unit_price',
        'subtotal',
        'discount_amount',
        'coupon_code',
        'total_amount',
        'status',
        'contact_name',
        'contact_phone',
        'contact_email',
        'special_requests',
        'cancel_reason',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'check_in_date' => 'date',
            'check_out_date' => 'date',
            'checked_in_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'num_adults' => 'integer',
            'num_children' => 'integer',
            'unit_price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class, 'provider_id');
    }

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(HotelRoomType::class, 'room_type_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function affiliatePost(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'affiliate_post_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /**
     * Kiểm tra trạng thái đã check-in hay chưa.
     */
    public function isCheckedIn(): bool
    {
        return ! is_null($this->checked_in_at);
    }
}
