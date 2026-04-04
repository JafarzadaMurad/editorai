import { useState, useRef, useEffect } from 'react';

// Process step definitions based on user message keywords
const PROCESS_FLOWS = {
    analyze: [
        { icon: '📝', label: 'Transkripsiya oxunur...', duration: 1500 },
        { icon: '🔍', label: 'Maraqlı hissələr tapılır...', duration: 2000 },
        { icon: '✂️', label: 'Kliplərə bölünür...', duration: 1500 },
        { icon: '⭐', label: 'Hər klipin maraqlılığı qiymətləndirilir...', duration: 1000 },
    ],
    broll: [
        { icon: '🔍', label: 'Uyğun B-roll axtarılır...', duration: 1500 },
        { icon: '🎞️', label: 'Pexels-dən videolar yüklənir...', duration: 2000 },
        { icon: '📐', label: 'Timeline-a yerləşdirilir...', duration: 1000 },
    ],
    sound: [
        { icon: '🔊', label: 'Sound effektlər axtarılır...', duration: 1500 },
        { icon: '🎵', label: 'Freesound-dan yüklənir...', duration: 2000 },
        { icon: '🎛️', label: 'Ses səviyyələri tənzimlənir...', duration: 1000 },
    ],
    subtitle: [
        { icon: '📝', label: 'Subtitrlər yaradılır...', duration: 1500 },
        { icon: '🎨', label: 'Stil tətbiq edilir...', duration: 1500 },
        { icon: '⏱️', label: 'Zamanlaması tənzimlənir...', duration: 1000 },
    ],
    render: [
        { icon: '🎬', label: 'Payload hazırlanır...', duration: 1000 },
        { icon: '📤', label: 'Render serverinə göndərilir...', duration: 2000 },
        { icon: '🔄', label: 'Video render edilir...', duration: 3000 },
    ],
    transcribe: [
        { icon: '📤', label: 'Video göndərilir...', duration: 2000 },
        { icon: '🎙️', label: 'Audio ayrılır...', duration: 3000 },
        { icon: '📝', label: 'Nitq tanınır...', duration: 5000 },
        { icon: '✍️', label: 'SRT yaradılır...', duration: 3000 },
    ],
    general: [
        { icon: '🤔', label: 'Sorğu analiz edilir...', duration: 1000 },
        { icon: '⚙️', label: 'İşlənir...', duration: 2000 },
    ],
};

function detectProcessType(message) {
    const lower = message.toLowerCase();
    if (lower.includes('transkrip') || lower.includes('transkri')) return 'transcribe';
    if (lower.includes('analiz') || lower.includes('böl') || lower.includes('hissə') || lower.includes('klip') || lower.includes('maraqlı')) return 'analyze';
    if (lower.includes('broll') || lower.includes('b-roll') || lower.includes('görüntü')) return 'broll';
    if (lower.includes('sound') || lower.includes('səs') || lower.includes('effekt') || lower.includes('musiqi')) return 'sound';
    if (lower.includes('subtit') || lower.includes('altyazı') || lower.includes('yazı')) return 'subtitle';
    if (lower.includes('render') || lower.includes('export') || lower.includes('hazırla')) return 'render';
    return 'general';
}

function ProcessSteps({ steps, activeStep }) {
    return (
        <div className="process-card">
            <div className="process-title">⚡ İşlənir</div>
            {steps.map((step, i) => (
                <div key={i} className={`process-step ${i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'}`}>
                    <span className="process-step-icon">
                        {i < activeStep ? '✅' : i === activeStep ? step.icon : '⏳'}
                    </span>
                    <span className="process-step-label">{step.label}</span>
                    {i === activeStep && <span className="process-spinner"></span>}
                </div>
            ))}
        </div>
    );
}

export default function ChatPanel({ project, onProjectUpdate }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [processSteps, setProcessSteps] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const messagesEndRef = useRef(null);
    const stepTimerRef = useRef(null);

    // Initialize messages from project conversation_history
    useEffect(() => {
        if (project?.conversation_history?.length) {
            setMessages(project.conversation_history.map(m => ({
                role: m.role,
                content: m.content,
            })));
        } else if (project) {
            setMessages([{
                role: 'assistant',
                content: `"${project.title}" layihəsi açıldı 👋\n\nNə etmək istəyirsiniz?\n• "Maraqlı hissələri böl"\n• "B-roll əlavə et"\n• "Subtitrlər əlavə et"`,
            }]);
        }
    }, [project?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeStep]);

    // Cleanup timers
    useEffect(() => {
        return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
    }, []);

    const addMessage = (role, content) => {
        setMessages(prev => [...prev, { role, content }]);
    };

    // Animate through process steps
    const animateSteps = (steps) => {
        setProcessSteps(steps);
        setActiveStep(0);

        let step = 0;
        const advance = () => {
            step++;
            if (step < steps.length) {
                setActiveStep(step);
                stepTimerRef.current = setTimeout(advance, steps[step].duration);
            }
        };
        stepTimerRef.current = setTimeout(advance, steps[0].duration);
    };

    const stopSteps = () => {
        if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
        setProcessSteps(null);
        setActiveStep(0);
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isLoading || !project) return;
        const msg = inputText.trim();
        setInputText('');
        addMessage('user', msg);
        setIsLoading(true);

        // Detect process type and start animated steps
        const processType = detectProcessType(msg);
        const steps = PROCESS_FLOWS[processType];
        animateSteps(steps);

        try {
            const { api } = await import('../services/api');
            const result = await api.chat(project.id, msg);

            stopSteps();
            addMessage('assistant', result.message);

            // Show action badge if AI performed a real action
            const actionType = result.action?.type;
            if (actionType && actionType !== 'none') {
                // If transcribe started, poll for completion
                if (actionType === 'transcribe' && result.action_result?.status === 'started') {
                    const autoDescribe = result.action_result?.auto_describe;
                    addMessage('action', '🎙️ Transkripsiya başladı...');
                    animateSteps([
                        { icon: '📤', label: 'Video JSON2Video-ya göndərildi', duration: 3000 },
                        { icon: '🎙️', label: 'Audio ayrılır və nitq tanınır...', duration: 10000 },
                        { icon: '📝', label: 'Transkripsiya hazırlanır...', duration: 60000 },
                    ]);

                    const pollInterval = setInterval(async () => {
                        try {
                            const status = await api.transcriptionStatus(project.id);
                            if (status.status === 'done') {
                                clearInterval(pollInterval);
                                stopSteps();
                                addMessage('action', '🎙️ Transkripsiya tamamlandı! ✅');

                                if (onProjectUpdate) {
                                    const updated = await api.getProject(project.id);
                                    onProjectUpdate(updated, result);
                                }

                                // Auto-describe: send analysis request automatically
                                if (autoDescribe) {
                                    addMessage('system', '🔍 Video analiz edilir...');
                                    animateSteps([
                                        { icon: '🤖', label: 'AI videonu oxuyur...', duration: 5000 },
                                        { icon: '📊', label: 'Məzmun analiz edilir...', duration: 10000 },
                                    ]);
                                    try {
                                        const descResult = await api.chat(project.id, 'analiz et gör nə var videoda');
                                        stopSteps();
                                        addMessage('assistant', descResult.message);
                                        if (descResult.action_result) {
                                            addMessage('action', '🔍 Video analiz edildi');
                                        }
                                        if (onProjectUpdate && descResult.project) {
                                            onProjectUpdate(descResult.project, descResult);
                                        }
                                    } catch (e) {
                                        stopSteps();
                                        addMessage('system', `❌ Analiz xətası: ${e.message}`);
                                    }
                                }
                                setIsLoading(false);
                            } else if (status.status === 'failed') {
                                clearInterval(pollInterval);
                                stopSteps();
                                addMessage('system', '❌ Transkripsiya uğursuz oldu');
                                setIsLoading(false);
                            }
                        } catch (e) {
                            clearInterval(pollInterval);
                            stopSteps();
                            addMessage('system', `❌ Polling xətası: ${e.message}`);
                            setIsLoading(false);
                        }
                    }, 5000);
                    return;
                }

                const actionLabels = {
                    transcribe: '🎙️ Transkripsiya tamamlandı',
                    analyze_video: '🔍 Video analiz edildi',
                    split_clips: '✂️ Video kliplərə bölündü',
                    search_broll: '🎞️ B-roll əlavə edildi',
                    search_sound_fx: '🔊 Sound FX əlavə edildi',
                    update_settings: '⚙️ Ayarlar yeniləndi',
                    render: '🎬 Render başladı',
                };
                const label = actionLabels[actionType] || actionType;
                addMessage('action', label);

                // Add action result details
                if (result.action_result) {
                    // Special display for B-roll search details
                    if (actionType === 'search_broll' && result.action_result.search_details) {
                        result.action_result.search_details.forEach(d => {
                            const icon = d.found > 0 ? '✅' : '❌';
                            addMessage('system', `${icon} "${d.clip}" → 🔍 "${d.keywords}" → ${d.found} video tapıldı`);
                        });
                    } else {
                        const details = Object.entries(result.action_result)
                            .filter(([k]) => k !== 'search_details')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ');
                        if (details) addMessage('system', `📊 ${details}`);
                    }
                }
            }

            // Use project from response (already includes clips)
            if (onProjectUpdate && result.project) {
                onProjectUpdate(result.project, result);
            }
        } catch (err) {
            stopSteps();
            addMessage('system', `❌ Xəta: ${err.message}`);
        }
        setIsLoading(false);
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div>
                    <div className="chat-title">🤖 AI Köməkçi</div>
                    <div className="chat-subtitle">Videonuzu redaktə etmək üçün danışın</div>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, i) => {
                    if (msg.role === 'action') {
                        return (
                            <div key={i} className="chat-action-badge">
                                {msg.content}
                            </div>
                        );
                    }
                    return (
                        <div key={i} className={`chat-message ${msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'ai'}`}>
                            {msg.content}
                        </div>
                    );
                })}

                {/* Process steps indicator */}
                {isLoading && processSteps && (
                    <ProcessSteps steps={processSteps} activeStep={activeStep} />
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <input
                    type="text"
                    placeholder="AI ilə danışın..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    disabled={isLoading || !project}
                />
                <button className="btn-send" onClick={sendMessage} disabled={!inputText.trim() || isLoading}>↑</button>
            </div>
        </div>
    );
}
