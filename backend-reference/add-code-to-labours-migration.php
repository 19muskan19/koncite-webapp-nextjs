<?php

/**
 * Migration: Add code column to labours table
 * Run: php artisan make:migration add_code_to_labours_table --table=labours
 * Then replace the generated migration content with the up/down below.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('labours', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('labours', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
