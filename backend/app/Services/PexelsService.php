<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PexelsService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services_external.pexels.api_key');
        $this->baseUrl = config('services_external.pexels.base_url');
    }

    /**
     * Search videos by keyword (for B-roll)
     */
    public function searchVideos(string $query, string $orientation = 'portrait', int $perPage = 5): array
    {
        $response = Http::withHeaders(['Authorization' => $this->apiKey])
            ->get("{$this->baseUrl}/videos/search", [
                'query' => $query,
                'per_page' => $perPage,
                'orientation' => $orientation,
            ]);

        $data = $response->json();
        $results = [];

        foreach ($data['videos'] ?? [] as $video) {
            // Get the best quality video file (HD preferred)
            $videoFile = collect($video['video_files'] ?? [])
                ->sortByDesc('width')
                ->first();

            if ($videoFile) {
                $results[] = [
                    'type' => 'video',
                    'src' => $videoFile['link'],
                    'width' => $videoFile['width'] ?? 0,
                    'height' => $videoFile['height'] ?? 0,
                    'duration' => $video['duration'] ?? 0,
                    'thumbnail' => $video['image'] ?? null,
                    'source' => 'pexels',
                    'pexels_id' => $video['id'],
                ];
            }
        }

        return $results;
    }

    /**
     * Search photos by keyword (for B-roll images)
     */
    public function searchPhotos(string $query, string $orientation = 'portrait', int $perPage = 5): array
    {
        $response = Http::withHeaders(['Authorization' => $this->apiKey])
            ->get("{$this->baseUrl}/v1/search", [
                'query' => $query,
                'per_page' => $perPage,
                'orientation' => $orientation,
            ]);

        $data = $response->json();
        $results = [];

        foreach ($data['photos'] ?? [] as $photo) {
            $results[] = [
                'type' => 'image',
                'src' => $photo['src']['large'] ?? $photo['src']['original'],
                'width' => $photo['width'] ?? 0,
                'height' => $photo['height'] ?? 0,
                'thumbnail' => $photo['src']['medium'] ?? null,
                'source' => 'pexels',
                'pexels_id' => $photo['id'],
                'photographer' => $photo['photographer'] ?? null,
            ];
        }

        return $results;
    }

    /**
     * Get B-roll suggestions based on keywords (mix of videos and photos)
     */
    public function getBrollSuggestions(array $keywords, string $orientation = 'portrait', int $perKeyword = 2): array
    {
        $results = [];

        foreach ($keywords as $keyword) {
            $videos = $this->searchVideos($keyword, $orientation, $perKeyword);
            foreach ($videos as &$v) {
                $v['keyword'] = $keyword;
            }
            $results = array_merge($results, $videos);
        }

        return $results;
    }
}
