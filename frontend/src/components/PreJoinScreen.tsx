import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { BackgroundType, useVirtualBackground } from "../hooks/useVirtualBackground";

export interface JoinConfig {
  micEnabled: boolean;
  cameraEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
  backgroundType?: "none" | "blur" | "image" | "video" | "synthwave" | "gradient" | "starlight";
  backgroundSrc?: string;
}

interface PreJoinScreenProps {
  meetingTitle: string;
  isHost: boolean;
  onJoin: (config: JoinConfig) => void;
}

const MicTestIndicator = ({ stream, enabled }: { stream: MediaStream | null; enabled: boolean }) => {
  const levelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stream || !enabled) {
      if (levelRef.current) levelRef.current.style.width = "0%";
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const audioStream = new MediaStream([audioTrack]);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    let source: MediaStreamAudioSourceNode;
    try {
      source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);
    } catch (e) {
      console.error("Audio processing failed", e);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      const percentage = Math.min(100, Math.round((average / 128) * 100));
      
      if (levelRef.current) {
        levelRef.current.style.width = `${percentage}%`;
        if (percentage > 80) {
          levelRef.current.style.backgroundColor = "#ef4444";
        } else if (percentage > 50) {
          levelRef.current.style.backgroundColor = "#eab308";
        } else {
          levelRef.current.style.backgroundColor = "#22c55e";
        }
      }

      animationId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream, enabled]);

  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
      <div
        ref={levelRef}
        className="h-full w-0 bg-green-500 transition-all duration-75"
      ></div>
    </div>
  );
};

export function PreJoinScreen({ meetingTitle, isHost, onJoin }: PreJoinScreenProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("none");
  const [backgroundSrc, setBackgroundSrc] = useState<string>("");

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const processedStream = useVirtualBackground(stream, backgroundType, backgroundSrc);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = processedStream || stream;
    }
  }, [processedStream, stream]);

  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInput = devices.filter((d) => d.kind === "audioinput");
      const videoInput = devices.filter((d) => d.kind === "videoinput");
      
      setAudioDevices((prev) => {
        // Auto-select newly added audio device
        if (prev.length > 0 && audioInput.length > prev.length) {
          const newDevice = audioInput.find(a => !prev.some(p => p.deviceId === a.deviceId));
          if (newDevice) {
            setSelectedAudioId(newDevice.deviceId);
          }
        }
        return audioInput;
      });
      
      setVideoDevices(videoInput);

      if (audioInput.length > 0 && !selectedAudioId) {
        setSelectedAudioId(audioInput[0].deviceId);
      }
      if (videoInput.length > 0 && !selectedVideoId) {
        setSelectedVideoId(videoInput[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate devices", err);
    }
  }, [selectedAudioId, selectedVideoId]);

  useEffect(() => {
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
  }, [loadDevices]);

  // Acquire media stream for preview
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    const startPreview = async () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
        };
        
        // Always request both initially to get permissions, then we can toggle tracks
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = mediaStream;
        
        // Sync tracks with current toggle state
        mediaStream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
        mediaStream.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));

        setStream(mediaStream);

        // We load devices again after getting permissions to get real device names
        await loadDevices();
      } catch (err) {
        console.error("Preview getUserMedia failed", err);
      }
    };

    startPreview();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId, selectedVideoId]); // Re-run when device selection changes

  // Update track enabled state without re-acquiring stream
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));
    }
  }, [stream, micEnabled, cameraEnabled]);

  const handleJoin = () => {
    onJoin({
      micEnabled,
      cameraEnabled,
      audioDeviceId: selectedAudioId || undefined,
      videoDeviceId: selectedVideoId || undefined,
      backgroundType,
      backgroundSrc,
    });
  };

  return (
    <div className="bg-premium flex min-h-screen items-center justify-center p-4 text-slate-900 dark:text-white transition-colors">
      <Card className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 p-8 backdrop-blur-xl border border-slate-200 dark:border-white/5">
        <h1 className="mb-6 text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
          {meetingTitle}
        </h1>
        
        <div className="relative mb-6 overflow-hidden rounded-2xl border-2 border-slate-700 bg-black aspect-video flex items-center justify-center shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted // Mute local video preview to avoid feedback loop
            className={`h-full w-full object-cover transition-opacity duration-300 ${cameraEnabled ? "opacity-100" : "opacity-0"}`}
            style={{ transform: backgroundType === "none" ? "scaleX(-1)" : "none" }} // Mirror effect only if raw
          />
          {!cameraEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-800 text-slate-400 shadow-lg border border-slate-700">
                <VideoOff size={32} />
              </div>
              <span className="mt-4 text-slate-400 font-medium">Camera is off</span>
            </div>
          )}

          {/* Floating Controls */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-4 rounded-full bg-slate-900/80 px-4 py-2 backdrop-blur-md border border-white/10 shadow-lg text-white">
            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                micEnabled ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              }`}
            >
              {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                cameraEnabled ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              }`}
            >
              {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-400">Microphone</label>
            <div className="relative">
              <select
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Mic Testing</span>
              <span>{micEnabled ? "Speak to test" : "Mic is off"}</span>
            </div>
            <MicTestIndicator stream={stream} enabled={micEnabled} />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-400">Camera</label>
            <div className="relative">
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400"
              >
                {videoDevices.length === 0 && <option value="">Default Camera</option>}
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-400">Background</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setBackgroundType("none")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "none" ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              None
            </button>
            <button
              onClick={() => setBackgroundType("blur")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "blur" ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Blur
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/office.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("office") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Office
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/beach.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("beach") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Beach
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/living-room.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("living") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Living Room
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/cafe.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("cafe") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Cozy Cafe
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/library.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("library") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Library
            </button>
            <button
              onClick={() => {
                setBackgroundType("image");
                setBackgroundSrc("/backgrounds/nature.jpg");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "image" && backgroundSrc.includes("nature") ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Nature
            </button>
            <button
              onClick={() => {
                setBackgroundType("starlight");
                setBackgroundSrc("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "starlight" ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Night Sky
            </button>
            <button
              onClick={() => {
                setBackgroundType("synthwave");
                setBackgroundSrc("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "synthwave" ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              3D Synthwave
            </button>
            <button
              onClick={() => {
                setBackgroundType("gradient");
                setBackgroundSrc("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${backgroundType === "gradient" ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Neon Pulse
            </button>
          </div>
        </div>

        <Button
          onClick={handleJoin}
          className="w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all"
        >
          {isHost ? "Start Meeting" : "Join Meeting"}
        </Button>
      </Card>
    </div>
  );
}
