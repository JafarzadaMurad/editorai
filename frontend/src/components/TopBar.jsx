import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function TopBar() {
    const user = api.getUser();
    const navigate = useNavigate();

    return (
        <div className="top-bar">
            <input
                type="text"
                className="search-bar"
                placeholder="🔍  Search projects, assets, or ask AI..."
            />

            <div className="top-bar-right">
                <div className="ai-badge">AI Ready</div>

                <button className="notif-btn">
                    🔔
                    <span className="notif-dot"></span>
                </button>

                <div className="user-dropdown" onClick={() => navigate('/dashboard')}>
                    <div className="user-avatar">{user?.name?.[0] || 'U'}</div>
                    <div className="user-info">
                        <div className="name">{user?.name || 'User'}</div>
                        <div className="plan">Pro Plan</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
