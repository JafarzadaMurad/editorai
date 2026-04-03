<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();

            $table->integer('order')->default(0);             // Display order
            $table->string('title')->nullable();               // AI-generated clip title
            $table->text('hook_text')->nullable();              // Hook text (first 3 seconds)
            $table->integer('interest_score')->default(0);     // AI score 0-100

            // Trim points in source video
            $table->decimal('trim_start', 10, 3);  // seconds (e.g. 120.500)
            $table->decimal('trim_end', 10, 3);    // seconds (e.g. 180.250)
            $table->decimal('duration', 10, 3)->nullable();

            // SRT for this clip
            $table->text('srt_content')->nullable();

            // B-roll
            $table->json('broll_items')->nullable();
            /*
             * broll_items JSON:
             * [
             *   {"type": "video", "src": "https://...", "keyword": "business meeting", "source": "pexels", "duration": 3},
             *   {"type": "image", "src": "https://...", "keyword": "handshake", "source": "pexels", "duration": 2, "effect": "ken-burns"}
             * ]
             */

            // Sound effects
            $table->json('sound_effects')->nullable();
            /*
             * sound_effects JSON:
             * [
             *   {"type": "hook", "src": "https://cdn.freesound.org/...", "name": "whoosh", "timestamp": 0, "volume": 0.6},
             *   {"type": "transition", "src": "https://...", "name": "swoosh", "timestamp": 15.5, "volume": 0.5}
             * ]
             */

            // Background music
            $table->json('background_music')->nullable();
            /*
             * {"src": "https://cdn.freesound.org/...", "name": "energetic beat", "volume": 0.2}
             */

            // Render
            $table->enum('render_status', ['pending', 'rendering', 'done', 'failed'])->default('pending');
            $table->string('render_job_id')->nullable();       // JSON2Video job ID
            $table->text('render_url')->nullable();            // Final video URL
            $table->json('render_payload')->nullable();        // JSON2Video payload (for debugging)

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clips');
    }
};
