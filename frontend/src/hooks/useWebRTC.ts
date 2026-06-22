import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { RoomParticipant } from "../types";
import { useVirtualBackground } from "./useVirtualBackground";

interface RemoteStream {
  sid: string;
  stream: MediaStream;
  participant?: RoomParticipant;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
};

import type { JoinConfig } from "../components/PreJoinScreen";

export function useWebRTC(socket: Socket | null, meetingId: string, enabled: boolean, joinConfig?: JoinConfig | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [micEnabled, setMicEnabled] = useState(joinConfig?.micEnabled ?? true);
  const [cameraEnabled, setCameraEnabled] = useState(joinConfig?.cameraEnabled ?? true);
  const [screenSharing, setScreenSharing] = useState(false);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const participantsRef = useRef<RoomParticipant[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);

  const processedStream = useVirtualBackground(localStream, joinConfig?.backgroundType || "none", joinConfig?.backgroundSrc);

  useEffect(() => {
    const finalStream = processedStream || localStream;
    if (finalStream && finalStream !== localStreamRef.current && localStreamRef.current) {
      localStreamRef.current = finalStream;
      
      // Replace tracks for all existing peers
      peers.current.forEach((pc) => {
        const senders = pc.getSenders();
        finalStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(console.error);
          }
        });
      });
    }
  }, [processedStream, localStream]);

  const updateParticipants = useCallback((next: RoomParticipant[]) => {
    participantsRef.current = next;
    setParticipants(next);
    setRemoteStreams((streams) => streams.map((item) => ({ ...item, participant: next.find((p) => p.sid === item.sid) })));
  }, []);

  const createPeer = useCallback((targetSid: string) => {
    if (!socket) throw new Error("Socket is not connected");
    const existing = peers.current.get(targetSid);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    (processedStream || localStreamRef.current)?.getTracks().forEach((track) => pc.addTrack(track, (processedStream || localStreamRef.current) as MediaStream));
    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit("ice-candidate", { to: targetSid, candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((current) => {
        if (current.some((item) => item.sid === targetSid)) return current.map((item) => item.sid === targetSid ? { ...item, stream } : item);
        return [...current, { sid: targetSid, stream, participant: participantsRef.current.find((p) => p.sid === targetSid) }];
      });
    };
    pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
        setRemoteStreams((current) => current.filter((item) => item.sid !== targetSid));
      }
    };
    peers.current.set(targetSid, pc);
    return pc;
  }, [socket, processedStream]);

  const callPeer = useCallback(async (targetSid: string) => {
    if (!socket || targetSid === socket.id) return;
    const pc = createPeer(targetSid);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { to: targetSid, offer });
  }, [createPeer, socket]);

  useEffect(() => {
    if (!enabled || !socket || !joinConfig) return;
    let cancelled = false;
    
    const constraints: MediaStreamConstraints = {
      audio: joinConfig.audioDeviceId ? { deviceId: { exact: joinConfig.audioDeviceId } } : true,
      video: joinConfig.videoDeviceId ? { deviceId: { exact: joinConfig.videoDeviceId } } : true,
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        
        navigator.mediaDevices.enumerateDevices().then(devices => {
          knownAudioDevices.current = devices.filter(d => d.kind === 'audioinput');
        });
        
        // Apply initial mic/camera states
        stream.getAudioTracks().forEach((t) => (t.enabled = joinConfig.micEnabled));
        stream.getVideoTracks().forEach((t) => (t.enabled = joinConfig.cameraEnabled));

        localStreamRef.current = stream;
        setLocalStream(stream);
        socket.emit("join-room", { meetingId });
      })
      .catch(() => {
        socket.emit("join-room", { meetingId });
      });

    return () => {
      cancelled = true;

      peers.current.forEach((peer) => peer.close());
      peers.current.clear();
    };
  }, [enabled, meetingId, socket, joinConfig]);

  useEffect(() => {
    if (!socket) return;
    const onRoomJoined = async ({ participants: joined }: { participants: RoomParticipant[] }) => {
      updateParticipants(joined);
      const others = joined.filter((p) => p.sid !== socket.id);
      for (const participant of others) await callPeer(participant.sid);
    };
    const onParticipantList = ({ participants: next }: { participants: RoomParticipant[] }) => updateParticipants(next);
    const onOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    };
    const onAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peers.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const onIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peers.current.get(from);
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };
    const onLeft = ({ sid }: { sid: string }) => {
      peers.current.get(sid)?.close();
      peers.current.delete(sid);
      setRemoteStreams((current) => current.filter((item) => item.sid !== sid));
      updateParticipants(participantsRef.current.filter((p) => p.sid !== sid));
    };
    socket.on("room-joined", onRoomJoined);
    socket.on("participant-list", onParticipantList);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("user-left", onLeft);
    return () => {
      socket.off("room-joined", onRoomJoined);
      socket.off("participant-list", onParticipantList);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("user-left", onLeft);
    };
  }, [callPeer, createPeer, socket, updateParticipants]);

  const knownAudioDevices = useRef<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let timeoutId: number;
    const handleDeviceChange = async () => {
      if (!localStreamRef.current) return;
      
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(async () => {
        try {
          const oldAudioTrack = localStreamRef.current?.getAudioTracks()[0];
          if (oldAudioTrack) {
            oldAudioTrack.stop();
            localStreamRef.current?.removeTrack(oldAudioTrack);
          }

          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const newAudioInputs = allDevices.filter(d => d.kind === 'audioinput');
          const newlyAdded = newAudioInputs.find(a => !knownAudioDevices.current.some(k => k.deviceId === a.deviceId));
          knownAudioDevices.current = newAudioInputs;

          const targetDeviceId = newlyAdded ? newlyAdded.deviceId : joinConfig?.audioDeviceId;

          const constraints = {
            audio: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true
          };
          const newAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newAudioTrack = newAudioStream.getAudioTracks()[0];
          
          if (newAudioTrack) {
            newAudioTrack.enabled = micEnabled;
            
            localStreamRef.current?.addTrack(newAudioTrack);
            
            peers.current.forEach((peer) => {
              const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
              if (sender) {
                sender.replaceTrack(newAudioTrack);
              }
            });
            
            if (localStreamRef.current) {
              setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }
          }
        } catch (error) {
          console.error("Error handling device change:", error);
        }
      }, 1500);
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      clearTimeout(timeoutId);
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [micEnabled]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !track.enabled; setMicEnabled(track.enabled); });
  };

  const toggleCamera = async () => {
  if (!localStreamRef.current) return;

  const track = localStreamRef.current.getVideoTracks()[0];

  if (!track) return;

  // Turn OFF
  if (track.enabled) {
    track.enabled = false;
    setCameraEnabled(false);
    return;
  }

  // Turn ON
  track.enabled = true;

  peers.current.forEach((peer) => {
    const sender = peer
      .getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) {
      sender.replaceTrack(track);
    }
  });

  setCameraEnabled(true);
};

  const shareScreen = async () => {
  if (!localStreamRef.current) return;

  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    const screenTrack = displayStream.getVideoTracks()[0];
    const screenAudioTrack = displayStream.getAudioTracks()[0];
    const originalMicTrack = localStreamRef.current.getAudioTracks()[0];
    let activeAudioTrack = originalMicTrack;
    let audioContext: AudioContext | null = null;

    if (screenAudioTrack && originalMicTrack) {
      audioContext = new window.AudioContext();
      const dest = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(new MediaStream([originalMicTrack])).connect(dest);
      audioContext.createMediaStreamSource(new MediaStream([screenAudioTrack])).connect(dest);
      activeAudioTrack = dest.stream.getAudioTracks()[0];

      peers.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
        sender?.replaceTrack(activeAudioTrack);
      });
    }

    // Replace video track for every peer
    peers.current.forEach((peer) => {
      const sender = peer
        .getSenders()
        .find((s) => s.track?.kind === "video");

      sender?.replaceTrack(screenTrack);
    });

    // Update local preview
    const screenStreamWithAudio = new MediaStream([
     screenTrack,
     activeAudioTrack,
    ]);

    localStreamRef.current = screenStreamWithAudio;
    setLocalStream(screenStreamWithAudio);

    setScreenSharing(true);

    screenTrack.onended = async () => {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      const newCameraTrack = cameraStream.getVideoTracks()[0];

      peers.current.forEach((peer) => {
        const videoSender = peer
          .getSenders()
          .find((s) => s.track?.kind === "video");
        videoSender?.replaceTrack(newCameraTrack);

        if (screenAudioTrack) {
          const audioSender = peer.getSenders().find((s) => s.track?.kind === "audio");
          audioSender?.replaceTrack(originalMicTrack);
        }
      });

      if (audioContext) {
        audioContext.close().catch(() => {});
      }

      const restoredStream = new MediaStream([
        newCameraTrack,
        originalMicTrack,
      ]);

      localStreamRef.current = restoredStream;

      setLocalStream(restoredStream);

      setScreenSharing(false);
    };

  } catch (err) {
    console.error(err);
  }
};

  const leave = () => {
    socket?.emit("user-left", { meetingId });
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peers.current.forEach((peer) => peer.close());
  };

  return { localStream: processedStream || localStream, remoteStreams, participants, micEnabled, cameraEnabled, screenSharing, toggleMic, toggleCamera, shareScreen, leave };
}
