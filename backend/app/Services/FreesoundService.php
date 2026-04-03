<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FreesoundService
{
    private string $token;
    private string $baseUrl;

    public function __construct()
    {
        $this->token = config('services_external.freesound.token');
        $this->baseUrl = config('services_external.freesound.base_url');
    }

    /**
     * Search sound effects (CC0 license, short duration)
     */
    public function searchSoundEffects(
        string $query,
        float $minDuration = 0,
        float $maxDuration = 5,
        int $pageSize = 5
    ): array {
        $filter = "license:\"Creative Commons 0\" duration:[{$minDuration} TO {$maxDuration}]";

        $response = Http::get("{$this->baseUrl}/search/text/", [
            'query' => $query,
            'filter' => $filter,
            'page_size' => $pageSize,
            'fields' => 'id,name,description,duration,previews,tags,license',
            'token' => $this->token,
        ]);

        $data = $response->json();
        $results = [];

        foreach ($data['results'] ?? [] as $sound) {
            $results[] = [
                'id' => $sound['id'],
                'name' => $sound['name'],
                'description' => $sound['description'] ?? '',
                'duration' => round($sound['duration'], 2),
                'src' => $sound['previews']['preview-hq-mp3'] ?? null,
                'tags' => $sound['tags'] ?? [],
                'license' => $sound['license'] ?? '',
                'source' => 'freesound',
            ];
        }

        return $results;
    }

    /**
     * Search background music (longer duration, CC0)
     */
    public function searchBackgroundMusic(
        string $mood = 'energetic',
        float $minDuration = 30,
        float $maxDuration = 300,
        int $pageSize = 5
    ): array {
        $moodKeywords = [
            'energetic' => 'energetic upbeat electronic beat',
            'calm' => 'calm ambient peaceful background',
            'dramatic' => 'dramatic cinematic epic orchestral',
            'motivational' => 'motivational inspiring uplifting',
            'funny' => 'funny comedy playful quirky',
            'sad' => 'sad emotional melancholic piano',
        ];

        $query = $moodKeywords[$mood] ?? $mood . ' music background';

        return $this->searchSoundEffects($query, $minDuration, $maxDuration, $pageSize);
    }

    /**
     * Get hook/transition sounds based on AI-suggested type
     */
    public function getHookSound(string $type = 'whoosh'): ?array
    {
        $typeKeywords = [
            'whoosh' => 'whoosh fast transition',
            'ding' => 'ding notification bell',
            'bass_drop' => 'bass drop impact',
            'swoosh' => 'swoosh sweep fast',
            'pop' => 'pop bubble notification',
            'impact' => 'cinematic impact hit',
            'rise' => 'riser build up transition',
        ];

        $query = $typeKeywords[$type] ?? $type;
        $results = $this->searchSoundEffects($query, 0, 3, 3);

        return $results[0] ?? null;
    }
}
