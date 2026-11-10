<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusinessType extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'slug',
    ];

    /**
     * Danh sách nhà cung cấp thuộc loại hình này.
     */
    public function providerProfiles(): HasMany
    {
        return $this->hasMany(ProviderProfile::class, 'business_type_id');
    }
}
