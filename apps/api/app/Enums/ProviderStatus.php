<?php

namespace App\Enums;

enum ProviderStatus: string
{
    case Draft = 'draft';
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
