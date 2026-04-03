import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        api.logout();
        navigate('/');
    };

    return (
        <div className="sidebar">
            <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>🎬</div>

            <div className="sidebar-nav">
                <NavLink to="/dashboard" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} title="Layihələr">
                    📁
                </NavLink>
                <NavLink to="/editor/1" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} title="Editor">
                    🖥️
                </NavLink>
                <button className="sidebar-item" title="AI Tools">✨</button>
                <button className="sidebar-item" title="Tarixçə">🕐</button>
            </div>

            <div className="sidebar-bottom">
                <button className="sidebar-item" title="Ayarlar">⚙️</button>
                <button className="sidebar-item" title="Çıxış" onClick={handleLogout}>🚪</button>
            </div>
        </div>
    );
}
