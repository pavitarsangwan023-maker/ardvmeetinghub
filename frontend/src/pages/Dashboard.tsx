import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Video, Share, PenLine, ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, X, Minus, Square } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { meetingApi } from "../services/api";
import type { Meeting } from "../types";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(localStorage.getItem('ardvmeetinghub_notes') || '');
  const [saveText, setSaveText] = useState("Save Notes");

  useEffect(() => {
    localStorage.setItem('ardvmeetinghub_notes', notesText);
  }, [notesText]);

  useEffect(() => {
    meetingApi.list()
      .then(({ data }) => {
        const sorted = data.sort((a: any, b: any) => new Date(a.scheduled_for || a.created_at).getTime() - new Date(b.scheduled_for || b.created_at).getTime());
        setMeetings(sorted);
      })
      .catch(() => setMeetings([]));
  }, []);

  const today = new Date();
  const upcomingMeetings = meetings.filter(m => {
     if (!m.scheduled_for) return false;
     const d = new Date(m.scheduled_for);
     return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && !m.started_at;
  });

  return (
    <div className="bg-slate-50 dark:bg-ink min-h-screen text-slate-900 dark:text-white transition-colors">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-16 flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
        
        {/* LEFT ACTION GRID */}
        <div className="flex-1 w-full max-w-sm mx-auto md:mx-0">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
            {/* New Meeting */}
            <div 
              onClick={() => navigate('/create')}
              className="group cursor-pointer flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800"
            >
              <div className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-[1.25rem] bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Video size={34} className="sm:w-9 sm:h-9" />
              </div>
              <span className="font-medium text-sm sm:text-[15px] text-slate-700 dark:text-slate-200">New meeting</span>
            </div>
            
            {/* Join */}
            <div 
              onClick={() => navigate('/join')}
              className="group cursor-pointer flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800"
            >
              <div className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <Plus size={36} className="sm:w-10 sm:h-10" />
              </div>
              <span className="font-medium text-sm sm:text-[15px] text-slate-700 dark:text-slate-200">Join</span>
            </div>
            
            {/* Schedule */}
            <div 
              onClick={() => navigate('/scheduler')}
              className="group cursor-pointer flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800"
            >
              <div className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform relative">
                <span className="absolute top-1.5 sm:top-2 text-[10px] font-bold">12</span>
                <CalendarDays size={32} className="sm:w-9 sm:h-9 mt-2" />
              </div>
              <span className="font-medium text-sm sm:text-[15px] text-slate-700 dark:text-slate-200">Schedule</span>
            </div>

            {/* Share screen */}
            <div 
              onClick={() => alert("Screen sharing outside meeting is coming soon!")}
              className="group cursor-pointer flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800"
            >
              <div className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <Share size={30} className="sm:w-8 sm:h-8 -ml-1" />
              </div>
              <span className="font-medium text-sm sm:text-[15px] text-slate-700 dark:text-slate-200">Share screen</span>
            </div>
          </div>
          
          {/* My notes */}
          <div className="flex justify-center">
            <button onClick={() => setShowNotes(true)} className="flex flex-col items-center gap-2 group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <div className="h-12 w-12 rounded-[1rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:border-blue-500 group-hover:shadow-blue-500/10">
                <PenLine size={20} />
              </div>
              <span className="text-sm font-medium">My notes</span>
            </button>
          </div>
        </div>

        {/* RIGHT AGENDA */}
        <div className="flex-1 w-full max-w-md mx-auto md:max-w-none md:mx-0">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full min-h-[380px] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><Plus size={18} /></button>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded-md text-slate-800 dark:text-slate-200 font-semibold transition-colors">
                <span className="text-[15px]">Today, {today.toLocaleString('en-US', { month: 'short', day: 'numeric' })}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><ChevronLeft size={20} /></button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><ChevronRight size={20} /></button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors ml-1"><MoreHorizontal size={18} /></button>
              </div>
            </div>
            
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              {upcomingMeetings.length === 0 ? (
                <>
                  <div className="h-40 w-full mb-2 flex items-center justify-center">
                    <div className="h-32 w-32 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                      <CalendarDays size={64} strokeWidth={1} className="text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300 mb-1">No meetings scheduled.</h3>
                  <button onClick={() => navigate('/scheduler')} className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1 mt-1">
                    <Plus size={16} /> Schedule a meeting
                  </button>
                </>
              ) : (
                <div className="w-full space-y-3 mt-2">
                  {upcomingMeetings.map(meeting => {
                    const time = new Date(meeting.scheduled_for!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={meeting.id} className="flex flex-col text-left border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl bg-white dark:bg-slate-900 hover:shadow-md transition-all group">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{time}</span>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{meeting.title}</h4>
                        <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => navigate(`/meeting/${meeting.meeting_id}`)} className="text-xs py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Start</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Floating Notes Modal */}
      {showNotes && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-0.5 rounded-md"><Video size={12} /></div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">My notes</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <button className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><Minus size={14} /></button>
              <button className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><Square size={12} /></button>
              <button onClick={() => setShowNotes(false)} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-1"><X size={16} /></button>
            </div>
          </div>
          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">{user?.name}'s notes</h3>
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><MoreHorizontal size={18} /></button>
            </div>
            <textarea 
              value={notesText}
              onChange={(e) => { setNotesText(e.target.value); setSaveText("Save Notes"); }}
              placeholder="Type here if desired..."
              className="w-full flex-1 min-h-[250px] resize-none outline-none bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              autoFocus
            />
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">Auto-saved locally</span>
              <Button 
                onClick={() => {
                  localStorage.setItem('ardvmeetinghub_notes', notesText);
                  setSaveText("Saved! ✓");
                  setTimeout(() => setShowNotes(false), 800);
                }} 
                className="px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                {saveText}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
