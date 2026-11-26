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
        'service_promotion_id',
        'coupon_id',
        'start_date',
        'end_date',
        'quantity',
        'duration_units',
        'checked_in_at',
        'checkout_requested_at',
        'unit_price',
        'subtotal',
        'promotion_discount_amount',
        'coupon_discount_amount',
        'total_amount',
        'deposit_rate',
        'deposit_amount',
        'remaining_amount',
        'status',
        'payment_expires_at',
        'contact_name',
        'contact_phone',
        'contact_email',
        'special_requests',
        'metadata',
        'cancel_reason',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'checked_in_at' => 'datetime',
            'checkout_requested_at' => 'datetime',
            'payment_expires_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'quantity' => 'integer',
            'duration_units' => 'integer',
            'unit_price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'promotion_discount_amount' => 'decimal:2',
            'coupon_discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'deposit_rate' => 'integer',
            'deposit_amount' => 'decimal:2',
            'remaining_amount' => 'decimal:2',
            'metadata' => 'array',
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

    public function servicePromotion(): BelongsTo
    {
        return $this->belongsTo(ServicePromotion::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
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
