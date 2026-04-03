import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import './index.css';

// Protected route wrapper
function ProtectedRoute({ children }) {
    if (!api.isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

// Public-only route
function PublicRoute({ children }) {
    if (api.isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

// Layout with sidebar for authenticated pages
function AppShell({ children }) {
    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-area">
                <TopBar />
                {children}
            </div>
        </div>
    );
}

// Layout wrapper that hides sidebar on editor (editor has its own full layout)
function AppShellEditor({ children }) {
    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-area">
                {children}
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public (no sidebar) */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Protected with sidebar + topbar */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <AppShell><Dashboard /></AppShell>
                    </ProtectedRoute>
                } />

                {/* Editor — sidebar but no topbar (full-height editor) */}
                <Route path="/editor/:projectId" element={
                    <ProtectedRoute>
                        <AppShellEditor><Editor /></AppShellEditor>
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
