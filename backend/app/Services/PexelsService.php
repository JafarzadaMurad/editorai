<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
     * Filters: 5-60 seconds duration, prefers HD (720-1080p)
     */
    public function searchVideos(string $query, string $orientation = 'portrait', int $perPage = 5): array
    {
        $response = Http::withHeaders(['Authorization' => $this->apiKey])
            ->get("{$this->baseUrl}/videos/search", [
                'query' => $query,
                'per_page' => max($perPage * 3, 15), // Request more to filter
                'orientation' => $orientation,
                'size' => 'medium', // Prefer medium-sized videos (not 4K)
            ]);

        $data = $response->json();
        $results = [];

        foreach ($data['videos'] ?? [] as $video) {
            $duration = $video['duration'] ?? 0;

            // Filter: only 5-60 second videos (good B-roll length)
            if ($duration < 5 || $duration > 60) {
                continue;
            }

            // Get HD quality video file (prefer 720p-1080p, not 4K)
            $videoFile = collect($video['video_files'] ?? [])
                ->filter(fn($f) => ($f['width'] ?? 0) >= 640 && ($f['width'] ?? 0) <= 1920)
                ->sortByDesc('width')
                ->first();

            // Fallback: any video file sorted by width
            if (!$videoFile) {
                $videoFile = collect($video['video_files'] ?? [])
                    ->sortByDesc('width')
                    ->first();
            }

            if ($videoFile) {
                $results[] = [
                    'type' => 'video',
                    'src' => $videoFile['link'],
                    'width' => $videoFile['width'] ?? 0,
                    'height' => $videoFile['height'] ?? 0,
                    'duration' => $duration,
                    'thumbnail' => $video['image'] ?? null,
                    'source' => 'pexels',
                    'pexels_id' => $video['id'],
                ];
            }

            // Stop when we have enough
            if (count($results) >= $perPage) {
                break;
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
     * Get B-roll suggestions based on keywords
     * Returns 2 videos per keyword, filtered for good B-roll duration
     */
    public function getBrollSuggestions(array $keywords, string $orientation = 'portrait', int $perKeyword = 2): array
    {
        $results = [];

        foreach ($keywords as $keyword) {
            Log::info('Pexels B-roll search', ['keyword' => $keyword, 'orientation' => $orientation, 'perKeyword' => $perKeyword]);

            $videos = $this->searchVideos($keyword, $orientation, $perKeyword);

            Log::info('Pexels B-roll results', [
                'keyword' => $keyword,
                'count' => count($videos),
                'videos' => array_map(fn($v) => [
                    'id' => $v['pexels_id'],
                    'duration' => $v['duration'],
                    'resolution' => $v['width'] . 'x' . $v['height'],
                ], $videos),
            ]);

            foreach ($videos as &$v) {
                $v['keyword'] = $keyword;
            }
            $results = array_merge($results, $videos);
        }

        return $results;
    }
}
