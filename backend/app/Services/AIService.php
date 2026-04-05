<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Clip;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services_external.openai.api_key');
        $this->model = config('services_external.openai.model');
    }

    /**
     * Chat with GPT (generic)
     */
    public function chat(array $messages, bool $jsonMode = false): string
    {
        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 4096,
        ];

        if ($jsonMode) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type' => 'application/json',
        ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', $payload);

        $data = $response->json();

        return $data['choices'][0]['message']['content'] ?? '';
    }

    /**
     * Analyze SRT and extract interesting clips
     */
    public function analyzeAndSelectClips(string $srtContent, array $settings): array
    {
        $clipCount = $settings['clip_count'] ?? 10;
        $clipDuration = $settings['clip_duration'] ?? 'short';

        $durationGuide = $clipDuration === 'short' ? '30-60 seconds' : '1-3 minutes';

        $messages = [
            [
                'role' => 'system',
                'content' => "You are a professional video editor AI. You analyze video transcripts (SRT format) and select the most interesting, engaging, and viral-worthy segments for short-form content.

You MUST respond with valid JSON only. No extra text.",
            ],
            [
                'role' => 'user',
                'content' => "Analyze this SRT transcript and select the top {$clipCount} most interesting segments. Each segment should be {$durationGuide}.

For each segment, provide:
- trim_start: start time in seconds
- trim_end: end time in seconds  
- title: catchy short title for the clip (max 50 chars)
- hook_text: attention-grabbing text for the first 3 seconds (max 80 chars, UPPERCASE preferred, use emoji)
- interest_score: 0-100 score of how interesting/viral this segment is
- broll_keywords: 2-3 keywords for B-roll search (in English)
- sound_fx_type: recommended sound effect type: 'whoosh', 'ding', 'bass_drop', 'swoosh', 'impact', 'rise'
- summary: 1-sentence description of what happens in this segment

Respond as JSON: {\"clips\": [...]}

SRT TRANSCRIPT:
{$srtContent}",
            ],
        ];

        $response = $this->chat($messages, true);
        $data = json_decode($response, true);

        return $data['clips'] ?? [];
    }

    /**
     * Analyze SRT and plan where B-roll should be placed
     * Returns timestamped B-roll suggestions with English keywords
     */
    public function planBrollPlacements(string $srtContent, int $count = 3, float $videoDuration = 37): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => "You are a professional video editor. You analyze video transcripts and decide where B-roll footage should be placed to make the video more engaging.

B-roll is supplementary footage that replaces the main video temporarily to illustrate what the speaker is talking about.

Rules:
- Each B-roll placement should be 5-8 seconds long
- Space them evenly throughout the video (don't cluster them)
- Choose moments where the speaker is describing something visual
- Keywords MUST be in English (for Pexels stock video search)
- Keywords should be specific and visual (e.g. 'microphone close up' not 'technology')
- Don't place B-roll in the first 3 seconds or last 3 seconds

You MUST respond with valid JSON only. No extra text.",
            ],
            [
                'role' => 'user',
                'content' => "Analyze this SRT transcript and suggest exactly {$count} B-roll placements.
Video total duration: {$videoDuration} seconds.

For each placement provide:
- start: start time in seconds (when B-roll begins)
- end: end time in seconds (when B-roll ends, should be 5-8 seconds after start)
- keyword: one English search term for Pexels (be specific and visual)
- reason: very short reason why this B-roll fits here (in Azerbaijani)

Respond as JSON: {\"broll_plan\": [...]}

SRT TRANSCRIPT:
{$srtContent}",
            ],
        ];

        $response = $this->chat($messages, true);
        $data = json_decode($response, true);

        return $data['broll_plan'] ?? [];
    }

    /**
     * Process a user message in the context of a project
     * Returns AI response + UI action
     */
    public function processUserMessage(Project $project, string $userMessage): array
    {
        $conversation = $project->conversation_history ?? [];

        // Build system prompt with project context
        $systemPrompt = $this->buildConversationSystemPrompt($project);

        // Add system message
        $messages = [['role' => 'system', 'content' => $systemPrompt]];

        // Add conversation history (last 20 messages max)
        $recentHistory = array_slice($conversation, -20);
        foreach ($recentHistory as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content'],
            ];
        }

        // Add current user message
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = $this->chat($messages, true);
        $data = json_decode($response, true);

        // Update conversation history
        $conversation[] = ['role' => 'user', 'content' => $userMessage];
        $conversation[] = ['role' => 'assistant', 'content' => $data['message'] ?? $response];
        $project->update(['conversation_history' => $conversation]);

        return [
            'message' => $data['message'] ?? $response,
            'action' => $data['action'] ?? ['type' => 'none', 'params' => []],
        ];
    }

    private function buildConversationSystemPrompt(Project $project): string
    {
        $settings = json_encode($project->settings ?? [], JSON_PRETTY_PRINT);
        $status = $project->status;
        $clipCount = $project->clips()->count();
        $srtAvailable = !empty($project->srt_content) ? 'Yes' : 'No';

        $clipsSummary = '';
        if ($clipCount > 0) {
            $clips = $project->clips()->orderBy('order')->get();
            foreach ($clips as $clip) {
                $brollCount = is_array($clip->broll_items) ? count($clip->broll_items) : 0;
                $sfxCount = is_array($clip->sound_effects) ? count($clip->sound_effects) : 0;
                $clipsSummary .= "  - #{$clip->order} \"{$clip->title}\" ({$clip->trim_start}s-{$clip->trim_end}s, score: {$clip->interest_score}, brolls: {$brollCount}, sfx: {$sfxCount})\n";
            }
        }

        return "You are an AI video editing assistant. You help users edit videos through conversation.
You speak in Azerbaijani language, naturally and friendly. Use emoji occasionally.

CURRENT PROJECT STATE:
- Title: {$project->title}
- Status: {$status}
- SRT transcript available: {$srtAvailable}
- Settings: {$settings}
- Clips found: {$clipCount}
{$clipsSummary}

You MUST respond with valid JSON:
{
  \"message\": \"Your conversational response\",
  \"action\": {
    \"type\": \"action_type\",
    \"params\": {}
  }
}

AVAILABLE ACTIONS:

0. \"transcribe\" — Start video transcription only
   Use when: SRT is not available AND user explicitly says transcribe/transkripsiya et
   params: {}

1. \"analyze_video\" — Analyze the transcript and DESCRIBE what's in the video
   Use when: user says 'analiz et', 'nə var videoda', 'gör nə var', 'bax görək'
   IMPORTANT: This action ONLY describes/summarizes the video content. It does NOT split into clips!
   If SRT is not available, this action will auto-transcribe first, then describe.
   params: {}

2. \"split_clips\" — Split video into interesting clips on the timeline
   Use when: user EXPLICITLY says 'böl', 'kliplərə ayır', 'maraqlı hissələri tap', 'kliplər çıxar', 'parçala'
   params: {}

3. \"search_broll\" — Search and add B-roll footage from Pexels
   Use when: user says add B-roll, broll əlavə et, görüntü əlavə et
   IMPORTANT: Works without clips! AI analyzes transcript and finds perfect placement times automatically.
   params: {\"count\": 3}
   The 'count' field = how many B-roll clips to add (default 3). If user says '2-3 broll' use count:3, if '5 broll' use count:5.

4. \"search_sound_fx\" — Search and add sound effects for all clips
   Use when: user says add sound, sound effekt, səs effekti
   params: {\"type\": \"whoosh|impact|notification|transition\"}

5. \"update_settings\" — Update project settings
   Use when: user wants to change clip count, format, etc.
   params: {\"key\": \"value\"}

6. \"render\" — Start rendering all clips
   Use when: user says render, export, hazırla
   params: {}

7. \"none\" — No action needed (just conversation)
   Use when: user is asking questions, chatting

SETTINGS KEYS: clip_count (1-20), clip_duration ('short'|'medium'), format ('vertical'|'horizontal'), broll_enabled (true/false), sound_fx_enabled (true/false), subtitles_enabled (true/false), background_music ('energetic'|'calm'|'dramatic'|'motivational'|null)

CRITICAL RULES:
- 'analiz et' = analyze_video (describe what's in video, do NOT split into clips!)
- 'böl' / 'kliplərə ayır' / 'maraqlı kliplər tap' = split_clips (actually cut the video)
- NEVER use split_clips unless user EXPLICITLY asks to split/cut/divide
- analyze_video just tells the user what the video contains and suggests next steps
- search_broll does NOT need clips to exist. It works on the full video!
- When adding B-roll, ALWAYS provide English keywords in params! Use relevant terms based on video content.
- Always respond in Azerbaijani";
    }
}
