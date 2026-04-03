import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Landing() {
    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-logo">
                    <div className="logo-badge">🎬</div>
                    <span>AI Video Editor</span>
                </div>
                <div className="nav-links">
                    {api.isAuthenticated() ? (
                        <Link to="/dashboard" className="btn-primary">Dashboard →</Link>
                    ) : (
                        <>
                            <Link to="/login">Giriş</Link>
                            <Link to="/register" className="btn-primary">Qeydiyyat →</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero */}
            <section className="hero">
                <h1>
                    Danışa-danışa<br />
                    <span className="gradient-text">Video Montaj Et</span>
                </h1>
                <p>
                    Uzun videolardan qısa kliplər, B-roll, sound effektlər, subtitrlər —
                    hamısını AI ilə danışaraq hazırla. Heç bir texniki bilik lazım deyil.
                </p>
                <div className="hero-buttons">
                    <Link to="/register" className="btn-primary">Pulsuz Başla →</Link>
                    <a href="#features" className="btn-outline">Necə İşləyir? ↓</a>
                </div>
            </section>

            {/* Features */}
            <section className="features" id="features">
                <h2 className="section-title">Necə İşləyir?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="icon">📹</div>
                        <h3>1. Video Yüklə</h3>
                        <p>Uzun videonu yüklə və ya URL ver. AI avtomatik transkripsiya edəcək.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon">🤖</div>
                        <h3>2. AI ilə Danış</h3>
                        <p>AI ən maraqlı hissələri tapır, sən danışaraq düzəliş edirsən.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon">🎬</div>
                        <h3>3. Avtomatik Montaj</h3>
                        <p>Hook, B-roll, subtitrlər, sound effektlər — hamısı avtomatik əlavə olunur.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon">📱</div>
                        <h3>4. Hazır Kliplər</h3>
                        <p>TikTok, Reels, Shorts üçün hazır vertikal videolar yüklə.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)' }}>
                <p>© 2026 AI Video Editor. Bütün hüquqlar qorunur.</p>
            </footer>
        </div>
    );
}
