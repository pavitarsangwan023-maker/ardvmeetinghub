import { LogOut, Settings, Video, CalendarDays, Home, Bell, ChevronDown, User as UserIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useState, useEffect, useRef } from "react";
import { ProfileSettings } from "./ProfileSettings";
import { meetingApi } from "../services/api";
import type { Meeting } from "../types";

export function Navbar() {
  const { user, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Meeting[]>([]);
  const [hasUnread, setHasUnread] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && showNotifications) {
      meetingApi.list()
        .then(({ data }) => {
          const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setNotifications(sorted.slice(0, 5));
        })
        .catch(() => {});
    }
  }, [user, showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-white/75 dark:bg-ink/75 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-400 text-slate-950">
              <Video size={20} />
            </span>
            <span className="text-lg font-bold">PyMeet</span>
          </Link>
          {user && (
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Home">
              <div className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"><Home size={18} /></div>
              <span className="text-sm font-medium hidden sm:block">Home</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={toggleTheme} 
            className="rounded-full p-2 hover:bg-white/10 transition-all text-2xl drop-shadow-lg"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {user && (
            <>
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all relative" aria-label="Notifications">
                  <Bell size={20} />
                  {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border border-white dark:border-ink"></span>}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-line bg-white dark:bg-slate-900 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-line mb-2 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                      {hasUnread && <span onClick={() => setHasUnread(false)} className="text-xs text-cyan-400 cursor-pointer hover:underline">Mark all read</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto px-2 space-y-1">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No new notifications</div>
                      ) : (
                        notifications.map(m => (
                          <div key={m.id} className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors" onClick={() => { setShowNotifications(false); navigate(`/meeting/${m.meeting_id}`); }}>
                            <p className="text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold text-cyan-600 dark:text-cyan-400">Meeting:</span> {m.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/scheduler" className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all" title="Calendar">
                <CalendarDays size={20} />
              </Link>

              <div className="relative ml-2" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)} 
                  className="flex items-center gap-2 rounded-full border border-line bg-slate-100 dark:bg-white/5 p-1 pr-3 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold shadow-sm relative" style={{ background: user.avatar_color }}>
                    {user.name[0]}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-ink"></span>
                  </span>
                  <span className="hidden text-sm font-medium sm:block max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown size={14} className={`text-slate-500 dark:text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-white dark:bg-slate-900 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-line mb-2 flex items-start gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl font-bold shadow-sm relative" style={{ background: user.avatar_color, color: "#fff" }}>
                        {user.name[0]}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-slate-900"></span>
                      </span>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-base">{user.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="px-2 py-1">
                      <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500"></span> Available</span>
                      </button>
                    </div>
                    
                    <div className="my-1 border-t border-line"></div>
                    
                    <div className="px-2 py-1 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                        <UserIcon size={16} /> Profile
                      </button>
                      <button 
                        onClick={() => { setShowProfileMenu(false); setShowSettings(true); }} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                      >
                        <Settings size={16} /> Settings
                      </button>
                    </div>
                    
                    <div className="my-1 border-t border-line"></div>
                    
                    <div className="px-2 py-1">
                      <button 
                        onClick={() => { setShowProfileMenu(false); logout(); }} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors"
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showSettings && user && (
        <ProfileSettings 
          user={user} 
          onClose={() => setShowSettings(false)} 
          onUpdate={(updatedUser) => {
            setUser(updatedUser);
            setShowSettings(false);
          }} 
        />
      )}
    </nav>
  );
}
