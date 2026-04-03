import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== passwordConfirm) { setError('Şifrələr uyğun deyil'); return; }
        setLoading(true);
        const { ok, data } = await api.register(name, email, password, passwordConfirm);
        if (ok) {
            navigate('/dashboard');
        } else {
            setError(data.message || Object.values(data.errors || {}).flat()[0] || 'Qeydiyyat uğursuz oldu');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Qeydiyyat</h1>
                <p className="subtitle">Yeni hesab yaradın</p>

                {error && <div className="error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Ad</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Adınız" required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
                    </div>
                    <div className="form-group">
                        <label>Şifrə</label>
                        <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <div className="form-group">
                        <label>Şifrəni təsdiqləyin</label>
                        <input type="password" className="form-input" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn-primary btn-full" disabled={loading}>
                        {loading ? 'Yaradılır...' : 'Qeydiyyatdan Keç →'}
                    </button>
                </form>

                <p className="auth-footer">
                    Hesabınız var? <Link to="/login">Giriş</Link>
                </p>
            </div>
        </div>
    );
}
