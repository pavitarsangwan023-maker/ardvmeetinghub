import { useEffect, useState } from "react";
import { Copy, Settings, Calendar as CalendarIcon, ExternalLink, Clock, Plus, Lock } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { schedulerApi, meetingApi } from "../services/api";
import type { Meeting } from "../types";

export function SchedulerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const loadData = async () => {
    try {
      const [{ data: prof }, { data: mtgs }] = await Promise.all([
        schedulerApi.getProfile(),
        meetingApi.list()
      ]);
      setProfile(prof);
      setEditData(prof);
      const sorted = mtgs.filter(m => m.scheduled_for && !m.started_at && m.is_active).sort((a: any, b: any) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
      setMeetings(sorted);
    } catch (err) {
      console.error("Failed to load scheduler data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const { data } = await schedulerApi.updateProfile(editData);
      setProfile(data);
      setIsEditing(false);
      alert("Settings saved!");
    } catch (err: any) {
      alert("Failed to save settings: " + (err.response?.data?.detail || err.message));
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const url = `${window.location.origin}/book/${profile.slug}`;
    navigator.clipboard.writeText(url);
    alert("Booking link copied to clipboard!");
  };

  const updateAvailability = (day: number, field: string, value: any) => {
    setEditData((prev: any) => {
      const avs = [...prev.availabilities];
      const idx = avs.findIndex((a: any) => a.day_of_week === day);
      if (idx >= 0) {
        avs[idx] = { ...avs[idx], [field]: value };
      }
      return { ...prev, availabilities: avs };
    });
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="bg-premium min-h-screen text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <p className="text-sm font-semibold text-fuchsia-400">Zoom-Style Scheduler</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Booking Settings</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Let others book time with you easily without back-and-forth emails.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Settings Panel */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Booking Page</h2>
                <Button variant="secondary" onClick={copyLink} className="text-sm px-3 py-1.5"><Copy size={14} className="mr-2" /> Copy Link</Button>
              </div>
              
              {profile && !isEditing ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-400 mb-1">Public URL</p>
                    <a href={`/book/${profile.slug}`} target="_blank" className="text-cyan-400 font-mono hover:underline flex items-center gap-2">
                      {window.location.origin}/book/{profile.slug} <ExternalLink size={14} />
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Page Title</p>
                    <p className="font-semibold">{profile.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Duration</p>
                    <p className="flex items-center gap-2"><Clock size={16} className="text-cyan-400" /> {profile.duration_minutes} mins</p>
                  </div>
                  <Button variant="secondary" className="w-full mt-4" onClick={() => setIsEditing(true)}>
                    <Settings size={16} className="mr-2" /> Edit Configuration
                  </Button>
                </div>
              ) : isEditing && editData ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">URL Slug</label>
                    <input value={editData.slug} onChange={e => setEditData({...editData, slug: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Page Title</label>
                    <input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" rows={2} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Duration (minutes)</label>
                    <input type="number" value={editData.duration_minutes} onChange={e => setEditData({...editData, duration_minutes: parseInt(e.target.value)})} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <h3 className="font-bold mb-3">Weekly Availability</h3>
                    <div className="space-y-3">
                      {editData.availabilities.map((av: any) => (
                        <div key={av.day_of_week} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <label className="flex items-center gap-3 w-32">
                            <input type="checkbox" checked={av.is_enabled} onChange={e => updateAvailability(av.day_of_week, 'is_enabled', e.target.checked)} className="accent-fuchsia-500 w-4 h-4" />
                            <span className={av.is_enabled ? "text-white" : "text-slate-500"}>{days[av.day_of_week].substring(0, 3)}</span>
                          </label>
                          {av.is_enabled ? (
                            <div className="flex items-center gap-2">
                              <input type="time" value={av.start_time} onChange={e => updateAvailability(av.day_of_week, 'start_time', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm outline-none" />
                              <span className="text-slate-500">-</span>
                              <input type="time" value={av.end_time} onChange={e => updateAvailability(av.day_of_week, 'end_time', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm outline-none" />
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">Unavailable</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveSettings} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white">Save Changes</Button>
                    <Button variant="secondary" onClick={() => { setEditData(profile); setIsEditing(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">Loading...</div>
              )}
            </Card>

            {profile && !isEditing && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl relative animate-fade-in">
                {/* Mock Browser Header */}
                <div className="bg-slate-800 flex items-center px-4 py-3 border-b border-slate-700">
                  <div className="flex gap-2 w-1/3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="w-1/3 flex justify-center">
                    <div className="bg-slate-900 text-slate-400 text-xs px-6 py-1.5 rounded-full truncate max-w-sm flex items-center gap-2">
                      <Lock size={12} className="text-slate-500" />
                      {window.location.origin}/book/{profile.slug}
                    </div>
                  </div>
                  <div className="w-1/3"></div>
                </div>
                {/* Embedded Iframe */}
                <iframe 
                  src={`/book/${profile.slug}?preview=true`} 
                  className="w-full h-[600px] border-none bg-slate-950" 
                  title="Booking Page Preview"
                />
              </div>
            )}
          </div>

          {/* Upcoming Booked Meetings */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><CalendarIcon size={20} className="text-cyan-400" /> Upcoming Bookings</h2>
            
            {meetings.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-700/50 bg-transparent flex flex-col items-center justify-center">
                <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                  <CalendarIcon size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-300">No meetings scheduled.</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs">Share your booking page link with others to let them schedule time with you.</p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {meetings.map(meeting => {
                  const dt = new Date(meeting.scheduled_for!);
                  return (
                    <Card key={meeting.id} className="p-4 flex flex-row items-center gap-4 bg-slate-900/40 hover:bg-slate-800/60 transition">
                      <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-3 min-w-[75px] border border-slate-800 shrink-0">
                        <span className="text-xs font-bold text-cyan-500 uppercase">{dt.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-2xl font-black text-white leading-none my-0.5">{dt.getDate()}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{days[dt.getDay() - 1 < 0 ? 6 : dt.getDay() - 1].substring(0,3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-200 truncate">{meeting.title}</h3>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                          <Clock size={14} className="text-cyan-400/70" /> 
                          {dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
