import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, SmilePlus, Users, Video, VideoOff, Camera, Plus, Image as ImageIcon, PenTool } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";

function MicButton({ enabled, stream, onToggle }: { enabled: boolean; stream: MediaStream | null; onToggle: () => void }) {
  const [level, setLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !enabled) {
      setLevel(0);
      return;
    }
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Clone track to avoid mutating or locking the original track (fixes Safari/iOS audio issues)
      const clonedTrack = track.clone();
      const source = audioContextRef.current.createMediaStreamSource(new MediaStream([clonedTrack]));
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Exponential scale to make it more responsive to human voice
        const percentage = Math.min(100, Math.round((average / 80) * 100));
        setLevel(percentage);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [stream, enabled]);

  return (
    <button 
      onClick={onToggle} 
      className="flex flex-col items-center justify-center gap-1 min-w-[72px] h-full transition hover:bg-white/5 rounded-xl py-1 group"
    >
      <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition ${enabled ? "bg-slate-800 text-white group-hover:bg-slate-700" : "bg-rose-500 text-white hover:bg-rose-600"}`}>
        {enabled ? (
          <div className="relative h-6 w-6">
             {/* Base gray mic */}
             <Mic size={24} className="absolute inset-0 text-slate-400" />
             {/* Green fill that clips from top to bottom based on volume level */}
             <Mic size={24} className="absolute inset-0 text-green-500 transition-all duration-75" style={{ clipPath: `inset(${100 - level}% 0 0 0)` }} />
          </div>
        ) : (
          <MicOff size={24} />
        )}
      </div>
      <span className={`text-[11px] font-semibold tracking-wide ${enabled ? "text-slate-300" : "text-rose-400"}`}>{enabled ? "Mute" : "Unmute"}</span>
    </button>
  );
}

function ControlButton({ icon: Icon, label, active, danger, onClick, badge, animate, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`relative flex flex-col items-center justify-center gap-1 min-w-[72px] h-full transition hover:bg-white/5 rounded-xl py-1 group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${danger ? "bg-rose-500 text-white hover:bg-rose-600" : active ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-white group-hover:bg-slate-700"} ${animate ? "animate-pulse" : ""}`}>
        <Icon size={24} />
      </div>
      <span className={`text-[11px] font-semibold tracking-wide whitespace-nowrap ${danger ? "text-rose-400" : "text-slate-300"}`}>{label}</span>
      {badge > 0 && <span className="absolute right-3 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-rose-500 text-[10px] font-bold text-white shadow-sm">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
}

export function MeetingControls({ localStream, isHost, micEnabled, cameraEnabled, screenSharing, recordingState = "idle", unreadChatCount = 0, unreadParticipantsCount = 0, showReactions, onToggleMic, onToggleCamera, onShareScreen, onToggleRecord, onToggleChat, onToggleParticipants, onToggleReactions, onToggleWhiteboard, onLeave, onReact, currentBgType, currentBgSrc, onUpdateBackground }: any) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const emojis = ["👍", "❤️", "😂", "😮", "👏", "🎉"];
  
  const ANIMATED_EMOJIS: Record<string, string> = {
    "👍": "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif",
    "❤️": "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif",
    "😂": "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif",
    "😮": "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif",
    "👏": "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif",
    "🎉": "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif"
  };
  
  const backgrounds = [
    { type: "none", label: "None", src: "" },
    { type: "blur", label: "Blur", src: "" },
    { type: "image", label: "Cafe", src: "/backgrounds/cafe.jpg" },
    { type: "image", label: "Library", src: "/backgrounds/library.jpg" },
    { type: "image", label: "Nature", src: "/backgrounds/nature.jpg" },
    { type: "starlight", label: "Night Sky", src: "" },
    { type: "synthwave", label: "3D Synthwave", src: "" },
    { type: "gradient", label: "Neon Pulse", src: "" }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-4 pt-16 bg-gradient-to-t from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent pointer-events-none px-2">
      <div className="pointer-events-auto flex flex-wrap justify-center items-center gap-1 sm:gap-2 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-2 px-3 shadow-2xl backdrop-blur-2xl max-w-full">
        <div className="shrink-0"><MicButton enabled={micEnabled} stream={localStream} onToggle={onToggleMic} /></div>
        <div className="shrink-0"><ControlButton icon={cameraEnabled ? Video : VideoOff} label={cameraEnabled ? "Stop Video" : "Start Video"} danger={!cameraEnabled} onClick={onToggleCamera} /></div>
        
        <div className="h-8 sm:h-10 w-px bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />
        
        {isHost && <div className="shrink-0"><ControlButton icon={MonitorUp} label="Share" active={screenSharing} onClick={onShareScreen} /></div>}
        <div className="shrink-0"><ControlButton icon={PenTool} label="Whiteboard" onClick={() => { onToggleWhiteboard(); setShowBgPicker(false); setShowEmojiPicker(false); if(showReactions) onToggleReactions(); }} /></div>
        
        <div className="shrink-0">
          <ControlButton 
            icon={Camera} 
            label={recordingState === "recording" ? "Stop Rec" : recordingState === "requesting" ? "Requesting" : "Record"} 
            danger={recordingState === "recording"} 
            active={recordingState === "approved"}
            animate={recordingState === "recording"}
            disabled={recordingState === "requesting"}
            onClick={onToggleRecord}
          />
        </div>
        
        <div className="shrink-0">
          <ControlButton icon={SmilePlus} label="React" active={showReactions} onClick={() => { onToggleReactions(); setShowEmojiPicker(false); }} />
        </div>

        <div className="relative shrink-0">
          <ControlButton icon={ImageIcon} label="Background" active={showBgPicker} onClick={() => { setShowBgPicker(!showBgPicker); setShowEmojiPicker(false); if (showReactions) onToggleReactions(); }} />
        </div>

        <div className="shrink-0"><ControlButton icon={MessageSquare} label="Chat" badge={unreadChatCount} onClick={() => { onToggleChat(); setShowBgPicker(false); }} /></div>
        <div className="shrink-0"><ControlButton icon={Users} label="People" badge={isHost ? unreadParticipantsCount : 0} onClick={() => { onToggleParticipants(); setShowBgPicker(false); }} /></div>
        
        <div className="h-10 w-px bg-slate-300 dark:bg-white/10 mx-1 sm:mx-2 shrink-0" />
        
        <button onClick={onLeave} className="flex h-12 sm:h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-rose-600 px-4 sm:px-6 font-semibold text-white transition hover:bg-rose-700 ml-1 sm:ml-2 shadow-lg shadow-rose-500/20 pointer-events-auto shrink-0">
          <PhoneOff size={20} />
          Leave
        </button>
      </div>

      {/* Popovers attached to the root of MeetingControls */}
      {showReactions && (
        <div className="pointer-events-auto absolute bottom-[100px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-3xl border border-line bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl z-50">
          {emojis.map((emoji) => (
            <button key={emoji} onClick={() => { onReact(emoji); setShowEmojiPicker(false); }} className="transform rounded-full p-2 transition hover:scale-125 hover:bg-white/10 active:scale-95 group">
              {ANIMATED_EMOJIS[emoji] ? (
                <img src={ANIMATED_EMOJIS[emoji]} alt={emoji} className="w-10 h-10 object-contain drop-shadow-md group-hover:drop-shadow-xl" />
              ) : (
                <span className="text-3xl">{emoji}</span>
              )}
            </button>
          ))}
          <div className="w-px h-10 bg-white/10 mx-1"></div>
          <button onClick={() => setShowEmojiPicker((v) => !v)} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-cyan-400 transition hover:scale-110 hover:bg-slate-700 active:scale-95 border border-slate-700">
            <Plus size={24} />
          </button>
        </div>
      )}

      {showEmojiPicker && showReactions && (
        <div className="pointer-events-auto absolute bottom-[170px] left-1/2 -translate-x-1/2 shadow-2xl rounded-2xl overflow-hidden z-50 border border-slate-800">
          <EmojiPicker theme={Theme.DARK} emojiStyle={EmojiStyle.NATIVE} onEmojiClick={(e) => { onReact(e.emoji); setShowEmojiPicker(false); }} />
        </div>
      )}

      {showBgPicker && (
        <div className="pointer-events-auto absolute bottom-[100px] left-1/2 flex -translate-x-1/2 flex-col gap-2 rounded-3xl border border-line bg-slate-900/95 p-4 shadow-2xl w-[260px] h-[300px] overflow-y-auto backdrop-blur-xl z-50 hide-scrollbar">
          <h3 className="text-sm font-bold text-slate-300 mb-2 px-1 flex items-center gap-2">
            <ImageIcon size={16} className="text-cyan-400" />
            Virtual Background
          </h3>
          <div className="grid grid-cols-2 gap-2 pb-2">
            {backgrounds.map((bg) => (
              <button
                key={bg.label}
                onClick={() => {
                  onUpdateBackground(bg.type, bg.src);
                }}
                className={`relative flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-300 ${
                  currentBgType === bg.type && currentBgSrc === bg.src
                    ? "bg-cyan-500/20 ring-2 ring-cyan-500 scale-105"
                    : "bg-slate-800/50 hover:bg-slate-700/80 hover:scale-105"
                }`}
              >
                <div className="h-16 w-full rounded-lg bg-slate-900/50 overflow-hidden relative shadow-inner">
                  {bg.type === "image" && bg.src ? (
                    <img src={bg.src} className="h-full w-full object-cover" alt={bg.label} />
                  ) : bg.type === "none" ? (
                    <div className="grid h-full w-full place-items-center"><VideoOff size={16} className="text-slate-500"/></div>
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-tr from-cyan-900/40 to-fuchsia-900/40"><Camera size={16} className="text-cyan-400 opacity-50"/></div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-300 w-full text-center truncate px-1">{bg.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
