<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Clip extends Model
{
    protected $fillable = [
        'project_id',
        'order',
        'title',
        'hook_text',
        'interest_score',
        'trim_start',
        'trim_end',
        'duration',
        'srt_content',
        'broll_items',
        'broll_keywords',
        'sound_effects',
        'sound_fx_type',
        'background_music',
        'render_status',
        'render_job_id',
        'render_url',
        'render_payload',
    ];

    protected $casts = [
        'trim_start' => 'decimal:3',
        'trim_end' => 'decimal:3',
        'duration' => 'decimal:3',
        'interest_score' => 'integer',
        'broll_items' => 'array',
        'broll_keywords' => 'array',
        'sound_effects' => 'array',
        'background_music' => 'array',
        'render_payload' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
