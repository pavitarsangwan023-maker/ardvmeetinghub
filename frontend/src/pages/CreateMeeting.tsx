import { FormEvent, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { Copy, Share2, CheckCircle2 } from "lucide-react";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { meetingApi } from "../services/api";

const ALLOWED_EMAILS = ["amit.siss2024@gmail.com", "pavitarsangwan023@gmail.com"];

export function CreateMeeting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("PyMeet Meeting");
  const [waiting, setWaiting] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [hasLimit, setHasLimit] = useState(false);
  const [durationLimit, setDurationLimit] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && !ALLOWED_EMAILS.includes(user.email)) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || !ALLOWED_EMAILS.includes(user.email)) {
    return null;
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let scheduled_for = null;
      if (isScheduled && scheduledDate && scheduledTime) {
        scheduled_for = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }
      const { data } = await meetingApi.create({ 
        title, 
        waiting_room_enabled: waiting,
        scheduled_for,
        duration_limit_minutes: hasLimit ? parseInt(durationLimit) : null
      });
      setCreatedMeeting(data);
      setBusy(false);
    } catch {
      setError("Failed to create meeting. Please try again.");
      setBusy(false);
    }
  };
  return <div className="bg-premium min-h-screen text-slate-900 dark:text-white transition-colors"><Navbar /><main className="mx-auto grid max-w-3xl place-items-center px-4 py-12"><Card className="w-full p-6"><h1 className="text-3xl font-bold">Create a meeting</h1>{error && <p className="mt-3 text-sm text-rose-500 dark:text-red-400">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-5">
    <label className="block text-sm font-medium">Meeting title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" /></label>
    
    <div className="space-y-3">
      <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-4"><span><span className="block font-medium">Schedule for later</span><span className="text-sm text-slate-500 dark:text-slate-400">Plan a meeting for a future date.</span></span><input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="h-5 w-5 accent-cyan-500 dark:accent-cyan-300" /></label>
      {isScheduled && (
        <div className="flex gap-4 rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-4">
          <label className="flex-1 text-sm font-medium">Date<input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" /></label>
          <label className="flex-1 text-sm font-medium">Time<input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" /></label>
        </div>
      )}
    </div>

    <div className="space-y-3">
      <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-4"><span><span className="block font-medium">Time Limit</span><span className="text-sm text-slate-500 dark:text-slate-400">Automatically end meeting after a set time.</span></span><input type="checkbox" checked={hasLimit} onChange={(e) => setHasLimit(e.target.checked)} className="h-5 w-5 accent-cyan-500 dark:accent-cyan-300" /></label>
      {hasLimit && (
        <div className="rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-4">
          <label className="block text-sm font-medium">Duration (in minutes)<input type="number" min="1" max="1440" value={durationLimit} onChange={(e) => setDurationLimit(e.target.value)} required placeholder="e.g. 30" className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" /></label>
        </div>
      )}
    </div>

    <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-4"><span><span className="block font-medium">Waiting room</span><span className="text-sm text-slate-500 dark:text-slate-400">Let the host admit participants.</span></span><input type="checkbox" checked={waiting} onChange={(e) => setWaiting(e.target.checked)} className="h-5 w-5 accent-cyan-500 dark:accent-cyan-300" /></label>
    
    <Button disabled={busy}>{busy ? "Creating..." : isScheduled ? "Schedule Meeting" : "Create and launch"}</Button>
  </form></Card></main>
  
  {createdMeeting && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Meeting Created!</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Share this link with your participants so they can join.</p>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-line bg-slate-50 dark:bg-white/5 p-3">
            <span className="flex-1 truncate font-mono text-sm text-slate-700 dark:text-slate-300">
              {window.location.origin}/meeting/{createdMeeting.meeting_id}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/meeting/${createdMeeting.meeting_id}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }} 
              className="flex items-center gap-1 rounded bg-cyan-100 dark:bg-white/10 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-slate-300 hover:bg-cyan-200 dark:hover:bg-white/20 transition"
            >
              {copied ? "Copied!" : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button className="flex-1" onClick={() => navigate(`/meeting/${createdMeeting.meeting_id}`)}>
              Join Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )}
  
  </div>;
}
