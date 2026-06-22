import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Video } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await register(form.name, form.email, form.password); navigate("/"); } catch (err: any) { setError(err.response?.data?.detail || "Unable to create account. Please try again."); } finally { setBusy(false); }
  };
  return (
    <main className="bg-premium grid min-h-screen place-items-center p-6 text-slate-900 dark:text-white transition-colors">
      <Card className="w-full max-w-md p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/5">
        <div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950"><Video size={22} /></span><div><h1 className="text-2xl font-bold">Create your PyMeet account</h1><p className="text-sm text-slate-500 dark:text-slate-400">Start meeting in under a minute.</p></div></div>
        <form onSubmit={submit} className="space-y-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="Full name" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required className="w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="Email" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required className="w-full rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-white/10 px-4 py-3 outline-none focus:border-cyan-500 dark:focus:border-cyan-300 text-slate-900 dark:text-white" placeholder="Password" />
          {error && <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p>}
          <Button disabled={busy} className="w-full py-3">{busy ? "Creating..." : "Register"}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">Already registered? <Link to="/login" className="font-semibold text-cyan-600 dark:text-cyan-300">Login</Link></p>
      </Card>
    </main>
  );
}
