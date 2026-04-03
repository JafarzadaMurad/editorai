<?php

return [
    'json2video' => [
        'api_url' => env('JSON2VIDEO_API_URL', 'http://168.231.108.200:2993/api/v1'),
        'api_key' => env('JSON2VIDEO_API_KEY'),
    ],

    'pexels' => [
        'api_key' => env('PEXELS_API_KEY'),
        'base_url' => 'https://api.pexels.com',
    ],

    'freesound' => [
        'token' => env('FREESOUND_API_TOKEN'),
        'base_url' => 'https://freesound.org/apiv2',
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o'),
    ],
];
