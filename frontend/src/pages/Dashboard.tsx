import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Users, Video } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { meetingApi } from "../services/api";
import type { Meeting } from "../types";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingId, setMeetingId] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    meetingApi.list()
      .then(({ data }) => {
        // Sort meetings by most recent first
        const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setMeetings(sorted);
      })
      .catch(() => setMeetings([]));
  }, []);
  const [joinError, setJoinError] = useState("");
  const join = async () => {
    if (!meetingId.trim()) return;
    setJoinError("");
    try {
      const { data } = await meetingApi.join(meetingId.trim());
      navigate(`/meeting/${data.meeting_id}`);
    } catch (err: any) {
      if (err.response?.status === 410) {
        setJoinError("This meeting is over.");
      } else {
        setJoinError("Meeting not found or could not join.");
      }
    }
  };
  return (
    <div className="bg-premium min-h-screen text-slate-900 dark:text-white transition-colors">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Welcome, {user?.name}</h1>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Create a room, invite teammates, or jump back into a recent conversation.</p>
          </div>
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => setShowCalendar(true)}>
            <CalendarDays size={18} /> View Calendar
          </Button>
        </header>
        <section className={`grid gap-4 ${["pavitarsangwan023@gmail.com"].includes(user?.email || "") ? "lg:grid-cols-[1.2fr_0.8fr]" : "mx-auto max-w-lg"}`}>
          {["pavitarsangwan023@gmail.com"].includes(user?.email || "") && (
            <Card className="bg-gradient-to-br from-cyan-100 to-fuchsia-100 dark:from-cyan-400/25 dark:to-fuchsia-400/15 p-6 border-cyan-200 dark:border-transparent"><div className="mb-8 flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-500 text-white dark:bg-cyan-300 dark:text-slate-950"><Video size={28} /></div><h2 className="text-2xl font-bold">Create Meeting</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Start a secure room with waiting room and host controls.</p><Link to="/create"><Button className="mt-6"><Plus size={18} /> Create button</Button></Link></Card>
          )}
          <Card className="p-6"><h2 className="text-2xl font-bold">Join Meeting</h2><p className="mt-2 text-slate-500 dark:text-slate-400">Enter a meeting ID shared by your host.</p><div className="mt-6 flex gap-2"><input value={meetingId} onChange={(e) => setMeetingId(e.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="ABCD-EF12-3456" /><Button onClick={join}>Join</Button></div>{joinError && <p className="mt-2 text-sm text-rose-500 dark:text-red-400">{joinError}</p>}</Card>
        </section>
        {meetings.filter(m => m.scheduled_for && !m.started_at).length > 0 && (
          <section className="mt-8"><div className="mb-4"><h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-300">Upcoming Scheduled Meetings</h2></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {meetings.filter(m => m.scheduled_for && !m.started_at).map((meeting) => <Card key={meeting.id} className="p-4 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/5"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-white">{meeting.title}</h3><span className="rounded bg-slate-200 dark:bg-white/10 px-2 py-1 text-xs text-slate-700 dark:text-slate-300">{meeting.meeting_id}</span></div><div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="flex items-center gap-2"><CalendarDays size={15} className="text-cyan-500 dark:text-cyan-400" /> {new Date(meeting.scheduled_for!).toLocaleString()}</span>{meeting.duration_limit_minutes && <span className="flex items-center gap-2 text-rose-500 dark:text-rose-300">⏱️ {meeting.duration_limit_minutes} min limit</span>}</div><Button variant="primary" className="mt-4 w-full" onClick={() => navigate(`/meeting/${meeting.meeting_id}`)}>Join Meeting</Button></Card>)}
          </div></section>
        )}
        <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Recent Meetings</h2><Link to="/join" className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">Join by ID</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {meetings.filter(m => !m.scheduled_for || m.started_at).slice(0, 6).map((meeting) => {
            const isHost = meeting.host.id === user?.id;
            const isOlderThan1Hour = (new Date().getTime() - new Date(meeting.created_at).getTime()) > 3600000;
            const isExpired = !isHost && (meeting.ended_at || !meeting.is_active || isOlderThan1Hour);
            return (
              <Card key={meeting.id} className="p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold truncate pr-2 text-slate-900 dark:text-white">{meeting.title}</h3><span className="rounded bg-slate-100 dark:bg-white/10 px-2 py-1 text-xs shrink-0 text-slate-600 dark:text-slate-300">{meeting.meeting_id}</span></div><div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400"><span className="flex items-center gap-1"><CalendarDays size={15} /> {new Date(meeting.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1"><Users size={15} /> {meeting.participants.length}</span></div>
                {isExpired ? (
                  <Button variant="danger" className="mt-4 w-full opacity-60 cursor-not-allowed" onClick={() => alert("The meeting is expired")}>Expired</Button>
                ) : (
                  <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate(`/meeting/${meeting.meeting_id}`)}>
                    {isHost && (meeting.ended_at || !meeting.is_active || isOlderThan1Hour) ? "View" : "Open"}
                  </Button>
                )}
              </Card>
            );
          })}
          {!meetings.filter(m => !m.scheduled_for || m.started_at).length && <Card className="p-6 text-slate-500 dark:text-slate-400">No meetings yet. Your meeting history will appear here.</Card>}
        </div></section>
        
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg"><CalendarDays size={24} /></div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Meeting Calendar & History</h2>
                </div>
                <button onClick={() => setShowCalendar(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5">✕</button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50 dark:bg-slate-950/30">
                {meetings.length === 0 && <p className="text-slate-500 dark:text-slate-400 text-center py-8">No meetings found.</p>}
                {meetings.map((meeting) => {
                  const isHost = meeting.host.id === user?.id;
                  const isOlderThan1Hour = (new Date().getTime() - new Date(meeting.created_at).getTime()) > 3600000;
                  const isExpired = !isHost && (meeting.ended_at || !meeting.is_active || isOlderThan1Hour);
                  const dateObj = new Date(meeting.scheduled_for || meeting.created_at);
                  return (
                    <div key={meeting.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-lg p-2 min-w-[70px] border border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-500 uppercase">{dateObj.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white">{dateObj.getDate()}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{meeting.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="flex items-center gap-1.5"><Users size={14} /> {meeting.participants.length} Participants</span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">ID: {meeting.meeting_id}</span>
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center sm:justify-end">
                        {isExpired ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 text-sm font-semibold border border-rose-500/20">Expired</span>
                        ) : (
                          <Button variant="primary" className="px-6" onClick={() => navigate(`/meeting/${meeting.meeting_id}`)}>
                            {isHost && (meeting.ended_at || !meeting.is_active || isOlderThan1Hour) ? "View" : "Join"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
