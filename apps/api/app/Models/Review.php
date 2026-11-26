<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'service_id',
        'user_id',
        'rating',
        'cleanliness_rating',
        'service_rating',
        'location_rating',
        'value_rating',
        'content',
        'pros',
        'cons',
        'is_recommended',
        'images',
        'provider_reply',
        'provider_reply_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'cleanliness_rating' => 'integer',
            'service_rating' => 'integer',
            'location_rating' => 'integer',
            'value_rating' => 'integer',
            'is_recommended' => 'boolean',
            'images' => 'array',
            'provider_reply_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
