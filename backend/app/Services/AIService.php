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

AVAILABLE ACTIONS (use these to actually DO things):

1. \"analyze_video\" — Run AI analysis on the video transcript to find interesting clips
   Use when: user says analyze, split, find interesting parts, böl, analiz et
   params: {} (no params needed)

2. \"search_broll\" — Search and add B-roll footage for all clips
   Use when: user says add B-roll, broll əlavə et, görüntü əlavə et
   params: {\"keywords\": [\"optional\", \"specific\", \"keywords\"]}

3. \"search_sound_fx\" — Search and add sound effects for all clips
   Use when: user says add sound, sound effekt, səs effekti
   params: {\"type\": \"whoosh|impact|notification|transition\"}

4. \"update_settings\" — Update project settings
   Use when: user wants to change clip count, format, etc.
   params: {\"key\": \"value\"} — settings to update

5. \"render\" — Start rendering all clips
   Use when: user says render, export, hazırla
   params: {}

6. \"none\" — No action needed (just conversation)
   Use when: user is asking questions, chatting, not requesting a specific action

SETTINGS KEYS: clip_count (1-20), clip_duration ('short'|'medium'), format ('vertical'|'horizontal'), broll_enabled (true/false), sound_fx_enabled (true/false), subtitles_enabled (true/false), background_music ('energetic'|'calm'|'dramatic'|'motivational'|null)

IMPORTANT RULES:
- When user asks to split/analyze video, use action type 'analyze_video'
- When user asks for B-roll, use action type 'search_broll'
- When user just asks questions or chats, use action type 'none'
- Always respond in Azerbaijani
- If SRT is not available and user asks to analyze, tell them transcript is needed first";
    }
}
