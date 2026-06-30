import { useState, useEffect, useRef } from "react";

export function useActiveSpeaker(remoteStreams: Array<{ sid: string; stream: MediaStream }>) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const sourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const requestRef = useRef<number>();

  useEffect(() => {
    // We only need an audio context if there are remote streams
    if (remoteStreams.length === 0) {
      setActiveSpeakerId(null);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current && AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    } catch (e) {
      console.error("AudioContext creation failed", e);
      return;
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Clean up disconnected streams
    const currentSids = new Set(remoteStreams.map(s => s.sid));
    for (const [sid, source] of sourcesRef.current.entries()) {
      if (!currentSids.has(sid)) {
        source.disconnect();
        sourcesRef.current.delete(sid);
        analysersRef.current.delete(sid);
      }
    }

    // Add new streams
    remoteStreams.forEach(({ sid, stream }) => {
      if (!analysersRef.current.has(sid)) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            // Need a new MediaStream just for this track to avoid cross-contamination
            const trackStream = new MediaStream([audioTracks[0].clone()]);
            const source = ctx.createMediaStreamSource(trackStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            
            sourcesRef.current.set(sid, source);
            analysersRef.current.set(sid, analyser);
          } catch (e) {
            console.error("Failed to connect audio source for sid:", sid, e);
          }
        }
      }
    });

    const updateActiveSpeaker = () => {
      let maxVolume = 0;
      let speakerId: string | null = null;
      const dataArray = new Uint8Array(128); // half of fftSize

      for (const [sid, analyser] of analysersRef.current.entries()) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / dataArray.length;

        if (avgVolume > maxVolume) {
          maxVolume = avgVolume;
          speakerId = sid;
        }
      }

      // Threshold to avoid random noise triggering active speaker
      // Usually normal speaking gives avgVolume > 10
      if (maxVolume > 15) {
        setActiveSpeakerId((prev) => {
          // Add a little debounce/stickiness so it doesn't flicker too fast
          return speakerId;
        });
      }

      requestRef.current = requestAnimationFrame(updateActiveSpeaker);
    };

    requestRef.current = requestAnimationFrame(updateActiveSpeaker);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [remoteStreams]);

  // Global cleanup
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      sourcesRef.current.forEach(source => source.disconnect());
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return activeSpeakerId;
}
