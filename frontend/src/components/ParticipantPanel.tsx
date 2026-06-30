import { AnimatePresence, motion } from "framer-motion";
import { Crown, UserCheck, UserMinus, X, Shield, ShieldOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { RoomParticipant } from "../types";
import { Avatar } from "./Avatar";

export function ParticipantPanel({ open, participants, waitingParticipants = [], socket, meetingId, currentSid, onClose, localMicEnabled, localCameraEnabled }: { open: boolean; participants: RoomParticipant[]; waitingParticipants?: RoomParticipant[]; socket: Socket | null; meetingId: string; currentSid?: string; onClose: () => void; localMicEnabled?: boolean; localCameraEnabled?: boolean }) {
  const self = participants.find((p) => p.sid === currentSid);
  const canManage = Boolean(self?.is_host || self?.is_co_host);
  const isPrimaryHost = Boolean(self?.is_host);
  return (
    <AnimatePresence>
      {open && <motion.aside initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }} className="fixed right-0 top-0 z-40 h-full w-full max-w-sm overflow-y-auto border-l border-line bg-slate-950/90 p-4 text-white shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Participants ({participants.length})</h2><button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close participants"><X size={18} /></button></div>
        
        {canManage && participants.length > 1 && (
           <div className="mb-4 flex gap-2">
             <button onClick={() => socket?.emit("mute-all", { meetingId, type: "mic" })} className="flex-1 rounded-lg bg-slate-200 dark:bg-white/10 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors flex justify-center items-center gap-2"><MicOff size={14} /> Mute All Mics</button>
           </div>
        )}
        {canManage && waitingParticipants.length > 0 && <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">Waiting room</h3>
            <button onClick={() => waitingParticipants.forEach(p => socket?.emit("admit-participant", { meetingId, sid: p.sid }))} className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">Admit All</button>
          </div>
          <div className="space-y-2">{waitingParticipants.map((participant) => <motion.div layout key={participant.sid} className="flex items-center gap-3 rounded-lg border border-cyan-200 dark:border-cyan-300/20 bg-cyan-50 dark:bg-cyan-300/10 p-3"><Avatar user={participant} size="sm" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-900 dark:text-white">{participant.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">Waiting for admission</div></div><button onClick={() => socket?.emit("admit-participant", { meetingId, sid: participant.sid })} className="rounded-lg p-2 text-cyan-600 dark:text-cyan-100 hover:bg-cyan-100 dark:hover:bg-cyan-300/15" title="Admit participant"><UserCheck size={17} /></button></motion.div>)}</div>
        </div>}
        <div className="space-y-2">
          {participants.map((participant) => <motion.div layout key={participant.sid} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 p-3">
            <Avatar user={participant} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{participant.name} {participant.sid === currentSid && "(You)"}</div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {participant.is_host && <span className="flex items-center gap-1 text-amber-500 dark:text-amber-300"><Crown size={13} /> Host</span>}
                {participant.is_co_host && !participant.is_host && <span className="flex items-center gap-1 text-slate-400 dark:text-slate-300"><Crown size={13} /> Co-Host</span>}
              </div>
            </div>
            <div className="flex items-center mr-2">
              {(() => {
                const isMicOn = participant.sid === currentSid && localMicEnabled !== undefined ? localMicEnabled : participant.mic_enabled;
                const canControl = canManage && participant.sid !== currentSid;
                const handleMicClick = () => {
                  if (!canControl) return;
                  if (isMicOn) {
                    socket?.emit("force-mute", { meetingId, targetSid: participant.sid, type: "mic" });
                  } else {
                    socket?.emit("request-unmute", { meetingId, targetSid: participant.sid, type: "mic" });
                  }
                };
                return (
                  <button onClick={handleMicClick} disabled={!canControl} className={`rounded-md p-1.5 ${canControl ? "hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer" : "cursor-default"} ${isMicOn ? "text-slate-400" : "text-rose-500"}`} title={canControl ? (isMicOn ? "Force mute microphone" : "Ask to unmute") : undefined}>
                    {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                  </button>
                );
              })()}
              {(() => {
                const isCamOn = participant.sid === currentSid && localCameraEnabled !== undefined ? localCameraEnabled : participant.camera_enabled;
                const canControl = canManage && participant.sid !== currentSid;
                const handleCamClick = () => {
                  if (!canControl) return;
                  if (isCamOn) {
                    socket?.emit("force-mute", { meetingId, targetSid: participant.sid, type: "camera" });
                  } else {
                    socket?.emit("request-unmute", { meetingId, targetSid: participant.sid, type: "camera" });
                  }
                };
                return (
                  <button onClick={handleCamClick} disabled={!canControl} className={`rounded-md p-1.5 ${canControl ? "hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer" : "cursor-default"} ${isCamOn ? "text-slate-400" : "text-rose-500"}`} title={canControl ? (isCamOn ? "Force turn off camera" : "Ask to start video") : undefined}>
                    {isCamOn ? <Video size={16} /> : <VideoOff size={16} />}
                  </button>
                );
              })()}
            </div>
            <div className="flex items-center gap-1">
              {isPrimaryHost && !participant.is_host && participant.sid !== currentSid && (
                participant.is_co_host ? (
                  <button onClick={() => socket?.emit("revoke-co-host", { meetingId, sid: participant.sid })} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10" title="Revoke Co-Host"><ShieldOff size={17} /></button>
                ) : (
                  <button onClick={() => socket?.emit("grant-co-host", { meetingId, sid: participant.sid })} className="rounded-lg p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-white/10" title="Make Co-Host"><Shield size={17} /></button>
                )
              )}
              {canManage && participant.sid !== currentSid && <button onClick={() => socket?.emit("remove-participant", { meetingId, sid: participant.sid })} className="rounded-lg p-2 text-rose-500 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-500/15" title="Remove participant"><UserMinus size={17} /></button>}
            </div>
          </motion.div>)}
        </div>
      </motion.aside>}
    </AnimatePresence>
  );
}
