import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, MessageSquare, Shield, Sparkles, Video } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

export function Login() {
  const { login, guestLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const isMeetingLink = redirectUrl.startsWith("/meeting/");
  const initialMeetingId = isMeetingLink ? redirectUrl.split("/meeting/")[1] : "";
  
  const [view, setView] = useState<"login" | "guest_join">(isMeetingLink ? "guest_join" : "login");
  const [guestName, setGuestName] = useState("");
  const [guestMeetingId, setGuestMeetingId] = useState(initialMeetingId);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetName, setResetName] = useState("");
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try { await login(email, password); navigate(redirectUrl || "/"); } catch { setError("Invalid email or password"); } finally { setBusy(false); }
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setResetBusy(true); setResetError(""); setResetSuccess("");
    try {
      await authApi.resetPassword({ email: resetEmail, name: resetName, new_password: resetPasswordInput });
      setResetSuccess("Password successfully reset! You can now log in.");
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess("");
      }, 1000);
    } catch (err: any) {
      setResetError(err.response?.data?.detail || "Verification failed. Check your email and name.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <main className="bg-premium grid min-h-screen grid-cols-1 text-slate-900 dark:text-white transition-colors lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between p-6 lg:p-12">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400 text-slate-950"><Video size={24} /></span><span className="text-2xl font-extrabold">PyMeet</span></div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="my-16 max-w-2xl">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl text-slate-900 dark:text-white">Premium meetings for teams that move fast.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">Launch secure video rooms, collaborate in real time, and keep every conversation close to the work.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[{ icon: Shield, label: "JWT secured" }, { icon: MessageSquare, label: "Live chat" }, { icon: Sparkles, label: "Screen share" }].map((item) => <Card key={item.label} className="p-4 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5"><item.icon className="mb-4 text-cyan-600 dark:text-cyan-300" size={22} /><p className="text-sm font-semibold">{item.label}</p></Card>)}
          </div>
        </motion.div>
        <p className="text-sm text-slate-500">Built with FastAPI, React, WebRTC, and Socket.IO.</p>
      </section>
      <section className="grid place-items-center p-6">
        {view === "login" ? (
          <Card className="w-full max-w-md p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/5">
            <div className="mb-6"><h2 className="text-2xl font-bold">Welcome back</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to create or join a meeting.</p></div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="you@company.com" /></label>
              <label className="block text-sm font-medium">
                <div className="flex justify-between items-center mb-2">
                  <span>Password</span>
                  <button type="button" onClick={() => setShowResetModal(true)} className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">Forgot password?</button>
                </div>
                <div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-500" size={18} /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-10 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="Your password" /></div>
              </label>
              {error && <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p>}
              <Button disabled={busy} className="w-full py-3">{busy ? "Signing in..." : "Login"}</Button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
              <span className="px-3 text-xs text-slate-500 uppercase">OR</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
            </div>
            <button onClick={() => setView("guest_join")} className="mt-4 w-full rounded-lg border border-slate-300 dark:border-line py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Join a Meeting as Guest</button>
            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">New to PyMeet? <Link to="/register" className="font-semibold text-cyan-600 dark:text-cyan-300">Create an account</Link></p>
          </Card>
        ) : (
          <Card className="w-full max-w-md p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/5">
            <div className="mb-6"><h2 className="text-2xl font-bold">Join Meeting</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter your name to join directly.</p></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true); setError("");
              try { 
                await guestLogin(guestName); 
                navigate(`/meeting/${guestMeetingId}`); 
              } catch { 
                setError("Failed to join meeting."); 
              } finally { 
                setBusy(false); 
              }
            }} className="space-y-4">
              <label className="block text-sm font-medium">Meeting ID<input value={guestMeetingId} onChange={(e) => setGuestMeetingId(e.target.value)} type="text" required disabled={isMeetingLink && initialMeetingId.length > 0} className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="ABC-DEF-GHI" /></label>
              <label className="block text-sm font-medium">Your Name<input value={guestName} onChange={(e) => setGuestName(e.target.value)} type="text" required minLength={2} className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="e.g. John Doe" /></label>
              {error && <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p>}
              <Button disabled={busy} className="w-full py-3">{busy ? "Joining..." : "Join Meeting"}</Button>
            </form>
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => setView("login")} className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline">Back to Login</button>
            </div>
          </Card>
        )}

        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
              <button onClick={() => setShowResetModal(false)} className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enter your registered email and the exact Name on your account to verify your identity.</p>
              
              <form onSubmit={handleReset} className="space-y-4">
                <label className="block text-sm font-medium">Email
                  <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="you@company.com" />
                </label>
                <label className="block text-sm font-medium">Account Name (Exact)
                  <input value={resetName} onChange={(e) => setResetName(e.target.value)} type="text" required className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="e.g. Pavitar Sangwan" />
                </label>
                <label className="block text-sm font-medium">New Password
                  <input value={resetPasswordInput} onChange={(e) => setResetPasswordInput(e.target.value)} type="password" required minLength={8} className="mt-2 w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="Min 8 characters" />
                </label>

                {resetError && <p className="text-sm text-rose-500 dark:text-rose-300">{resetError}</p>}
                {resetSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{resetSuccess}</p>}

                <Button disabled={resetBusy} className="w-full py-3 mt-4">{resetBusy ? "Resetting..." : "Reset Password"}</Button>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
