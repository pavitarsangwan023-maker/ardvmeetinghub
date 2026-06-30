import { memo } from "react";
import type { RoomParticipant } from "../types";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  localStream: MediaStream | null;
  localUser?: RoomParticipant;
  remoteStreams: Array<{ sid: string; stream: MediaStream; participant?: RoomParticipant }>;
  participants: RoomParticipant[];
  cameraEnabled: boolean;
  screenSharing: boolean;
}

export const VideoGrid = memo(function VideoGrid({ localStream, localUser, remoteStreams, participants, cameraEnabled, screenSharing }: VideoGridProps) {
  const remoteParticipants = participants.filter((p) => p.sid !== localUser?.sid);
  const total = remoteParticipants.length + 1;

  // Zoom-like grid columns based on participant count
  let gridClass: string;
  if (total === 1) {
    gridClass = "grid-cols-1";
  } else if (total === 2) {
    gridClass = "grid-cols-1 sm:grid-cols-2";
  } else if (total <= 4) {
    gridClass = "grid-cols-2";
  } else if (total <= 6) {
    gridClass = "grid-cols-2 lg:grid-cols-3";
  } else if (total <= 9) {
    gridClass = "grid-cols-2 md:grid-cols-3";
  } else {
    gridClass = "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
  }

  // For 1-2 participants, make tiles larger and fill the screen better
  const sizeClass = total <= 2 ? "w-full max-w-7xl mx-auto" : "w-full";

  const allStreams = [
    { id: "local", stream: localStream, participant: localUser, isLocal: true, muted: true, cameraEnabled, active: total === 1, screen: screenSharing },
    ...remoteParticipants.map((p) => {
      const rs = remoteStreams.find((s) => s.sid === p.sid);
      return { 
        id: p.sid, 
        stream: rs ? rs.stream : null, 
        participant: p, 
        isLocal: false, 
        muted: !(p.mic_enabled ?? true), 
        cameraEnabled: p.camera_enabled ?? true, 
        active: false, 
        screen: false 
      };
    })
  ];

  // Chunk for mobile (max 2 per page)
  const mobilePages: (typeof allStreams)[] = [];
  for (let i = 0; i < allStreams.length; i += 2) {
    mobilePages.push(allStreams.slice(i, i + 2));
  }

  return (
    <>
      {/* Mobile Layout: Horizontal Swiper */}
      <div className="flex sm:hidden overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full h-full pb-20 pt-16">
        {mobilePages.map((page, pageIdx) => (
          <div key={`page-${pageIdx}`} className="min-w-full flex-shrink-0 snap-center flex flex-col gap-2 p-2 justify-center h-full">
            {page.map((item) => (
              <div key={item.id} className="w-full flex-1 min-h-0">
                <VideoTile
                  stream={item.stream}
                  participant={item.participant}
                  isLocal={item.isLocal}
                  muted={item.muted}
                  cameraEnabled={item.cameraEnabled}
                  active={item.active}
                  screen={item.screen}
                />
              </div>
            ))}
            {/* Pagination Dots */}
            {mobilePages.length > 1 && (
              <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {mobilePages.map((_, dotIdx) => (
                  <div key={dotIdx} className={`h-1.5 rounded-full ${pageIdx === dotIdx ? "w-4 bg-cyan-400" : "w-1.5 bg-white/30"}`} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Layout: Standard Grid */}
      <div className={`hidden sm:grid h-full gap-2 p-1 ${gridClass} ${sizeClass} items-center content-center pt-16 pb-20 overflow-y-auto hide-scrollbar`}>
        {allStreams.map((item) => (
          <VideoTile
            key={item.id}
            stream={item.stream}
            participant={item.participant}
            isLocal={item.isLocal}
            muted={item.muted}
            cameraEnabled={item.cameraEnabled}
            active={item.active}
            screen={item.screen}
          />
        ))}
      </div>
    </>
  );
});
