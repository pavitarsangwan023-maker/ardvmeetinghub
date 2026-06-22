import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Shield } from "lucide-react";
import { ChatPanel } from "../components/ChatPanel";
import { MeetingControls } from "../components/MeetingControls";
import { ParticipantPanel } from "../components/ParticipantPanel";
import { Reaction, ReactionsOverlay } from "../components/ReactionsOverlay";
import { VideoGrid } from "../components/VideoGrid";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { meetingApi } from "../services/api";
import type { Meeting, RoomParticipant } from "../types";
import { PreJoinScreen, type JoinConfig } from "../components/PreJoinScreen";
import { Whiteboard } from "../components/Whiteboard";

export function MeetingRoom() {
  const { meetingId = "" } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const socket = useSocket(token);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "participants" | "reactions" | "whiteboard" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<RoomParticipant[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [durationLimit, setDurationLimit] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "requesting" | "approved" | "recording">("idle");
  const [recordingRequests, setRecordingRequests] = useState<{ sid: string; userName: string }[]>([]);
  const [coHostActionRequests, setCoHostActionRequests] = useState<{ sid: string; action: string; target_sid: string; target_name: string; co_host_name: string; co_host_sid: string; meetingId: string; }[]>([]);
  const [joinConfig, setJoinConfig] = useState<JoinConfig | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { localStream, remoteStreams, participants, micEnabled, cameraEnabled, screenSharing, toggleMic, toggleCamera, shareScreen, leave } = useWebRTC(socket, meetingId, Boolean(meeting) && Boolean(joinConfig), joinConfig);

  const updateBackground = (type: any, src?: string) => {
    setJoinConfig((prev: any) => prev ? { ...prev, backgroundType: type, backgroundSrc: src } : null);
  };

  useEffect(() => {
    meetingApi.get(meetingId)
      .then(({ data }) => {
        if (!data.is_active && data.host.id !== user?.id) {
          setIsEnded(true);
        } else {
          setMeeting(data);
        }
      })
      .catch((err) => {
        if (err.response?.status === 410 || err.response?.status === 404) {
          setIsEnded(true);
        } else {
          navigate("/");
        }
      })
      .finally(() => setIsLoading(false));
  }, [meetingId, navigate, user?.id]);
  useEffect(() => {
    if (!socket) return;
    const onWaiting = () => setWaiting(true);
    const onJoined = (payload: any) => {
      setWaiting(false);
      if (payload?.durationLimit && payload?.startedAt) {
        setDurationLimit(payload.durationLimit);
        setStartedAt(payload.startedAt);
      }
    };
    const onRemoved = () => navigate("/");
    const onWaitingList = ({ participants: next }: { participants: RoomParticipant[] }) => setWaitingParticipants(next);
    socket.on("waiting-room", onWaiting);
    socket.on("room-joined", onJoined);
    socket.on("removed-from-room", onRemoved);
    socket.on("waiting-list", onWaitingList);
    
    const onReaction = (data: { emoji: string; userId: number; userName: string }) => {
      const id = crypto.randomUUID();
      const left = 10 + Math.random() * 80;
      setReactions((current) => [...current, { ...data, id, left }]);
      setTimeout(() => setReactions((current) => current.filter((r) => r.id !== id)), 3500);
    };
    socket.on("receive-reaction", onReaction);
    
    const onMeetingEnded = () => {
      leave();
      setShowThankYou(true);
      setTimeout(() => navigate("/"), 5000);
    };
    socket.on("meeting-ended", onMeetingEnded);

    const onChatStatusChanged = ({ enabled }: { enabled: boolean }) => setChatEnabled(enabled);
    socket.on("chat-status-changed", onChatStatusChanged);

    const onRecordingRequested = (data: { sid: string; userName: string }) => {
      setRecordingRequests((current) => [...current, data]);
    };
    socket.on("recording-requested", onRecordingRequested);

    const onRecordingApproved = () => {
      setRecordingState("approved");
      alert("The host approved your recording request. Click the Record button again to start recording.");
    };
    socket.on("recording-approved", onRecordingApproved);

    const onRecordingDenied = () => {
      setRecordingState("idle");
      alert("The host denied your recording request.");
    };
    socket.on("recording-denied", onRecordingDenied);

    const onCoHostActionRequest = (data: any) => {
      data.sid = crypto.randomUUID();
      setCoHostActionRequests((current) => [...current, data]);
    };
    socket.on("cohost-action-request", onCoHostActionRequest);

    const onCoHostActionDenied = (data: any) => {
      alert(`The host denied your request to ${data.action === "remove-participant" ? "remove" : "admit"} ${data.target_name}.`);
    };
    socket.on("cohost-action-denied", onCoHostActionDenied);

    const timer = window.setInterval(() => socket.emit("waiting-list", { meetingId }), 2000);
    return () => { 
      window.clearInterval(timer); 
      socket.off("waiting-room", onWaiting); 
      socket.off("room-joined", onJoined); 
      socket.off("removed-from-room", onRemoved); 
      socket.off("waiting-list", onWaitingList); 
      socket.off("receive-reaction", onReaction);
      socket.off("meeting-ended", onMeetingEnded);
      socket.off("recording-requested", onRecordingRequested);
      socket.off("recording-approved", onRecordingApproved);
      socket.off("recording-denied", onRecordingDenied);
      socket.off("cohost-action-request", onCoHostActionRequest);
      socket.off("cohost-action-denied", onCoHostActionDenied);
    };
  }, [meetingId, navigate, socket]);

  const localParticipant = useMemo<RoomParticipant | undefined>(() => participants.find((p) => p.id === user?.id) || (user ? { sid: socket?.id || "local", id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color, is_host: meeting?.host.id === user.id } : undefined), [meeting?.host.id, participants, socket?.id, user]);

  const allParticipants = useMemo(() => {
    if (localParticipant && !participants.some((p) => p.sid === localParticipant.sid)) {
      return [localParticipant, ...participants];
    }
    return participants.length > 0 ? participants : (localParticipant ? [localParticipant] : []);
  }, [participants, localParticipant]);

  const exit = () => { 
    if (localParticipant?.is_host) {
      if (window.confirm("End meeting for all participants?")) {
        socket?.emit("end-meeting", { meetingId });
      }
    }
    leave(); 
    setShowThankYou(true);
    setTimeout(() => navigate("/"), 5000);
  };

  useEffect(() => {
    if (!durationLimit || !startedAt) return;
    const end = new Date(startedAt).getTime() + durationLimit * 60000;
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeftStr("00:00");
        exit();
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [durationLimit, startedAt]);

  const handleReact = (emoji: string) => {
    if (!socket) return;
    socket.emit("send-reaction", { emoji });
    const id = crypto.randomUUID();
    const left = 10 + Math.random() * 80;
    setReactions((current) => [...current, { emoji, userId: user?.id || 0, userName: user?.name || "You", id, left }]);
    setTimeout(() => setReactions((current) => current.filter((r) => r.id !== id)), 3000);
  };

  if (isLoading) {
    return <div className="bg-premium grid min-h-screen place-items-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (isEnded) {
    return (
      <div className="bg-premium grid min-h-screen place-items-center p-6 text-center text-white relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-rose-500 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-amber-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl p-12 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 mb-3 tracking-tight">
            This meeting is over
          </h2>
          <p className="text-slate-300 mb-8 max-w-sm text-lg font-medium">
            The meeting is ended or the link is expired. You can no longer join it.
          </p>
          <button 
            onClick={() => navigate("/")} 
            className="rounded-xl bg-cyan-500 px-8 py-3.5 font-bold text-slate-950 hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:-translate-y-1"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (waiting) return <div className="bg-premium grid min-h-screen place-items-center p-6 text-center text-white"><div><Shield className="mx-auto mb-4 text-cyan-300" size={42} /><h1 className="text-3xl font-bold">You are in the waiting room</h1><p className="mt-3 text-slate-300">The host will admit you shortly.</p></div></div>;

  if (showThankYou) {
    return (
      <div className="bg-premium grid min-h-screen place-items-center p-6 text-center text-white relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-cyan-500 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-fuchsia-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl p-12 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
          <img 
            src="/3d_wave_emoji.png" 
            alt="Thank You Emoji" 
            className="w-40 h-40 mb-6 drop-shadow-2xl animate-bounce" 
            style={{ animationDuration: "3s" }} 
          />
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-3 tracking-tight">
            Thank You for using PyMeet!
          </h2>
          <p className="text-slate-300 mb-8 max-w-sm text-lg font-medium">
            Your meeting has ended successfully. Have a great day ahead!
          </p>
          <button 
            onClick={() => navigate("/")} 
            className="rounded-xl bg-cyan-500 px-8 py-3.5 font-bold text-slate-950 hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:-translate-y-1"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pre-Join Screen
  if (!joinConfig && meeting) {
    return (
      <PreJoinScreen
        meetingTitle={meeting.title}
        isHost={meeting.host.id === user?.id}
        onJoin={(config) => setJoinConfig(config)}
      />
    );
  }

  const togglePanel = (panel: "chat" | "participants" | "reactions" | "whiteboard") => {
    setActivePanel((current) => (current === panel ? null : panel));
    if (panel === "chat") setUnreadChatCount(0);
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen recording is only supported on Desktop browsers.");
        setRecordingState("idle");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = `PyMeet_Recording_${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        setRecordingState("idle");
      };

      stream.getVideoTracks()[0].onended = () => mediaRecorder.stop();
      mediaRecorder.start();
      setRecordingState("recording");
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      setRecordingState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleRecordToggle = () => {
    if (recordingState === "recording") {
      stopRecording();
      return;
    }
    if (localParticipant?.is_host || recordingState === "approved") {
      startRecording();
    } else {
      socket?.emit("request-record", {});
      setRecordingState("requesting");
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-100 dark:bg-[#050914] text-slate-900 dark:text-white transition-colors">
      {recordingRequests.length > 0 && (
        <div className="fixed right-4 top-20 z-50 flex flex-col gap-2">
          {recordingRequests.map((req) => (
            <div key={req.sid} className="flex items-center gap-3 rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/90 p-3 shadow-sm dark:shadow-soft backdrop-blur-xl">
              <span className="text-sm text-slate-900 dark:text-white"><b>{req.userName}</b> wants to record</span>
              <div className="flex gap-2">
                <button onClick={() => { socket?.emit("approve-record", { sid: req.sid }); setRecordingRequests((r) => r.filter((x) => x.sid !== req.sid)); }} className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950">Approve</button>
                <button onClick={() => { socket?.emit("deny-record", { sid: req.sid }); setRecordingRequests((r) => r.filter((x) => x.sid !== req.sid)); }} className="rounded-md border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400">Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {coHostActionRequests.length > 0 && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2">
          {coHostActionRequests.map((req) => (
            <div key={req.sid} className="flex flex-col gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/95 dark:bg-slate-900/95 p-4 shadow-lg backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Shield size={18} />
                <span className="text-sm font-semibold">Co-Host Action Required</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <b>{req.co_host_name}</b> wants to {req.action === "remove-participant" ? <span className="text-rose-500 font-semibold">remove</span> : <span className="text-cyan-500 font-semibold">admit</span>} <b>{req.target_name}</b>.
              </p>
              <div className="flex justify-end gap-2 mt-1">
                <button 
                  onClick={() => { 
                    socket?.emit(req.action, { meetingId: req.meetingId, sid: req.target_sid }); 
                    setCoHostActionRequests((r) => r.filter((x) => x.sid !== req.sid)); 
                  }} 
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  Approve
                </button>
                <button 
                  onClick={() => { 
                    socket?.emit("deny-cohost-action", { action: req.action, target_name: req.target_name, co_host_sid: req.co_host_sid }); 
                    setCoHostActionRequests((r) => r.filter((x) => x.sid !== req.sid)); 
                  }} 
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <header className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-line bg-white/70 dark:bg-slate-950/70 px-4 py-3 backdrop-blur-xl transition-colors">
        <div><h1 className="font-semibold text-slate-900 dark:text-white">{meeting?.title || "PyMeet Meeting"}</h1><p className="text-xs text-slate-500 dark:text-slate-400">{meetingId}</p></div>
        {timeLeftStr && (
          <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${parseInt(timeLeftStr.split(":")[0]) < 5 ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300"}`}>
            ⏱️ {timeLeftStr} left
          </div>
        )}
        <button onClick={() => { navigator.clipboard.writeText(meetingId); alert("Meeting ID copied to clipboard!"); }} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-line bg-slate-50 dark:bg-white/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"><Copy size={16} /> Copy ID</button>
      </header>
      <section className="fixed inset-0 flex h-full w-full items-center justify-center p-4"><VideoGrid localStream={localStream} localUser={localParticipant} remoteStreams={remoteStreams} cameraEnabled={cameraEnabled} screenSharing={screenSharing} /></section>
      <ReactionsOverlay reactions={reactions} />
      {activePanel === "whiteboard" && <Whiteboard socket={socket} isHost={localParticipant?.is_host ?? false} onClose={() => setActivePanel(null)} />}
      <MeetingControls localStream={localStream} isHost={localParticipant?.is_host ?? false} micEnabled={micEnabled} cameraEnabled={cameraEnabled} screenSharing={screenSharing} recordingState={recordingState} unreadChatCount={unreadChatCount} unreadParticipantsCount={activePanel !== "participants" ? waitingParticipants.length : 0} showReactions={activePanel === "reactions"} onToggleMic={toggleMic} onToggleCamera={toggleCamera} onShareScreen={() => { setActivePanel(null); shareScreen(); }} onToggleRecord={handleRecordToggle} onToggleChat={() => togglePanel("chat")} onToggleParticipants={() => togglePanel("participants")} onToggleReactions={() => togglePanel("reactions")} onToggleWhiteboard={() => togglePanel("whiteboard")} onLeave={exit} onReact={handleReact} currentBgType={joinConfig?.backgroundType} currentBgSrc={joinConfig?.backgroundSrc} onUpdateBackground={updateBackground} />
      <ChatPanel meetingId={meetingId} open={activePanel === "chat"} socket={socket} localUser={localParticipant} participants={allParticipants} chatEnabled={chatEnabled} onClose={() => setActivePanel(null)} onNewMessage={() => { if (activePanel !== "chat") setUnreadChatCount((c) => c + 1); }} />
      <ParticipantPanel open={activePanel === "participants"} participants={allParticipants} waitingParticipants={waitingParticipants} socket={socket} meetingId={meetingId} currentSid={socket?.id || "local"} onClose={() => setActivePanel(null)} />
    </main>
  );
}
