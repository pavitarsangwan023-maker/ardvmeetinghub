import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X, Lock, Unlock, MessageCircleHeart } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { ChatMessage, RoomParticipant } from "../types";
import { meetingApi } from "../services/api";
import { Avatar } from "./Avatar";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { Smile } from "lucide-react";

export function ChatPanel({ meetingId, open, socket, localUser, participants = [], chatEnabled = true, onClose, onNewMessage }: { meetingId: string; open: boolean; socket: Socket | null; localUser?: Partial<RoomParticipant>; participants?: RoomParticipant[]; chatEnabled?: boolean; onClose: () => void; onNewMessage?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [recipient, setRecipient] = useState<string>("everyone");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!meetingId || !open) return;
    meetingApi.getChatHistory(meetingId).then((data) => setMessages(data)).catch(() => {});
  }, [meetingId, open]);
  useEffect(() => {
    if (!socket) return;
    const onMessage = (message: Omit<ChatMessage, "id">) => {
      setMessages((current) => [...current, { ...message, id: crypto.randomUUID() }]);
      if (onNewMessage) onNewMessage();
    };
    socket.on("chat-message", onMessage);
    return () => { socket.off("chat-message", onMessage); };
  }, [socket, onNewMessage]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !socket || (!chatEnabled && !localUser?.is_host)) return;
    const sentAt = new Date().toISOString();
    const message = draft.trim();
    
    if (recipient === "everyone") {
      socket.emit("chat-message", { message, sentAt });
      if (localUser) {
        setMessages((current) => [...current, { id: crypto.randomUUID(), message, user: localUser as RoomParticipant, sentAt }]);
      }
    } else {
      socket.emit("chat-message", { message, sentAt, to: recipient });
      const targetUser = participants.find(p => p.sid === recipient);
      if (localUser && targetUser) {
        setMessages((current) => [...current, { id: crypto.randomUUID(), message, user: localUser as RoomParticipant, sentAt, isPrivate: true, toUser: targetUser.name }]);
      }
    }
    setDraft("");
  };

  const toggleChat = () => {
    if (localUser?.is_host && socket) {
      socket.emit("toggle-chat", { enabled: !chatEnabled });
    }
  };
  return (
    <AnimatePresence>
      {open && <motion.aside initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }} className="fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-l border-line bg-slate-950/90 p-4 text-white shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Meeting chat</h2>
            {localUser?.is_host && (
              <button onClick={toggleChat} className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition ${chatEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`} title={chatEnabled ? "Disable Chat" : "Enable Chat"}>
                {chatEnabled ? <Unlock size={12} /> : <Lock size={12} />}
                {chatEnabled ? "Enabled" : "Disabled"}
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close chat"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <Avatar user={msg.user} size="sm" />
              <div className="flex-1">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-sm font-medium">{msg.user.name}</span>
                  <span className="text-[11px] text-slate-400">{new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${msg.isIntercepted ? "border border-rose-500/30 bg-rose-500/20 text-rose-50" : msg.isPrivate ? "border border-indigo-500/30 bg-indigo-500/20 text-indigo-50" : "bg-white/10 text-slate-100"}`}>
                  {msg.isIntercepted && <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-rose-300"><MessageCircleHeart size={12} /> Secret: {msg.user.name} ➡️ {msg.toUser}</div>}
                  {msg.isPrivate && !msg.isIntercepted && <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-300"><MessageCircleHeart size={12} /> {msg.toUser ? `Private to ${msg.toUser}` : "Direct Message"}</div>}
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {(!chatEnabled && !localUser?.is_host) ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-center text-sm text-rose-300">Chat has been disabled by the host.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>To:</span>
                <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="rounded border border-line bg-slate-900 px-2 py-1 outline-none focus:border-cyan-400">
                  <option value="everyone">Everyone</option>
                  {participants.filter(p => p.sid !== localUser?.sid).map(p => (
                    <option key={p.sid} value={p.sid}>{p.name} (Direct)</option>
                  ))}
                </select>
              </div>
              <div className="relative flex gap-2">
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2">
                    <EmojiPicker theme={Theme.DARK} emojiStyle={EmojiStyle.NATIVE} onEmojiClick={(e) => setDraft((d) => d + e.emoji)} />
                  </div>
                )}
                <button type="button" onClick={() => setShowEmojiPicker((v) => !v)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Emoji">
                  <Smile size={18} />
                </button>
                <form onSubmit={submit} className="flex min-w-0 flex-1 gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onClick={() => setShowEmojiPicker(false)} className="min-w-0 flex-1 rounded-lg border border-line bg-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-300" placeholder="Type @ai to ask the bot, or type a message..." />
                  <button type="submit" disabled={!draft.trim()} onClick={() => setShowEmojiPicker(false)} className="rounded-lg bg-cyan-400 px-3 text-slate-950 disabled:opacity-50" aria-label="Send"><Send size={18} /></button>
                </form>
              </div>
            </>
          )}
        </div>
      </motion.aside>}
    </AnimatePresence>
  );
}
