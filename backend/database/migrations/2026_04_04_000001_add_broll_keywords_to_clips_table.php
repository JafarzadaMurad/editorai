<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('clips', function (Blueprint $table) {
            $table->json('broll_keywords')->nullable()->after('broll_items');
            $table->string('sound_fx_type')->nullable()->after('sound_effects');
        });
    }

    public function down(): void
    {
        Schema::table('clips', function (Blueprint $table) {
            $table->dropColumn(['broll_keywords', 'sound_fx_type']);
        });
    }
};
