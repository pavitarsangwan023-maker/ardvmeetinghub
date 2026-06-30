import { memo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoomParticipant } from "../types";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  localStream: MediaStream | null;
  localUser?: RoomParticipant;
  remoteStreams: Array<{ sid: string; stream: MediaStream; participant?: RoomParticipant }>;
  participants: RoomParticipant[];
  cameraEnabled: boolean;
  screenSharing: boolean;
  activeSpeakerId?: string | null;
}

export const VideoGrid = memo(function VideoGrid({ localStream, localUser, remoteStreams, participants, cameraEnabled, screenSharing, activeSpeakerId }: VideoGridProps) {
  const [currentDesktopPage, setCurrentDesktopPage] = useState(0);
  const remoteParticipants = [...participants.filter((p) => p.sid !== localUser?.sid)];
  
  // Sort: Active speaker comes first
  remoteParticipants.sort((a, b) => {
    if (a.sid === activeSpeakerId) return -1;
    if (b.sid === activeSpeakerId) return 1;
    return 0;
  });

  const total = remoteParticipants.length + 1;

  // Zoom-like grid columns based on participant count
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
        active: p.sid === activeSpeakerId, 
        screen: false 
      };
    })
  ];

  // Chunk for desktop (max 9 per page)
  const desktopPageSize = 9;
  const desktopPages: (typeof allStreams)[] = [];
  for (let i = 0; i < allStreams.length; i += desktopPageSize) {
    desktopPages.push(allStreams.slice(i, i + desktopPageSize));
  }

  // Ensure current page is valid if participants leave
  useEffect(() => {
    if (currentDesktopPage >= desktopPages.length && desktopPages.length > 0) {
      setCurrentDesktopPage(desktopPages.length - 1);
    }
  }, [desktopPages.length, currentDesktopPage]);

  // Determine grid class for current desktop page
  const currentDesktopStreams = desktopPages[currentDesktopPage] || [];
  const currentTotal = currentDesktopStreams.length;
  
  let gridClass: string;
  if (currentTotal === 1) {
    gridClass = "grid-cols-1";
  } else if (currentTotal === 2) {
    gridClass = "grid-cols-1 sm:grid-cols-2";
  } else if (currentTotal <= 4) {
    gridClass = "grid-cols-2";
  } else if (currentTotal <= 6) {
    gridClass = "grid-cols-2 lg:grid-cols-3";
  } else {
    gridClass = "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
  }

  // For 1-2 participants, make tiles larger and fill the screen better
  const sizeClass = currentTotal <= 2 ? "w-full max-w-7xl mx-auto" : "w-full";

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

      {/* Desktop Layout: Paginated Grid */}
      <div className="hidden sm:flex relative h-full w-full items-center justify-center pt-16 pb-20 overflow-hidden px-10">
        {desktopPages.length > 1 && (
          <button 
            onClick={() => setCurrentDesktopPage((p) => Math.max(0, p - 1))}
            disabled={currentDesktopPage === 0}
            className={`absolute left-2 z-20 p-2 rounded-full bg-slate-800/80 text-white backdrop-blur-md transition-all ${currentDesktopPage === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-700 hover:scale-110"}`}
            aria-label="Previous page"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div className={`grid w-full h-full gap-2 p-1 ${gridClass} ${sizeClass} items-center content-center overflow-y-auto hide-scrollbar`}>
          {currentDesktopStreams.map((item) => (
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

        {desktopPages.length > 1 && (
          <button 
            onClick={() => setCurrentDesktopPage((p) => Math.min(desktopPages.length - 1, p + 1))}
            disabled={currentDesktopPage === desktopPages.length - 1}
            className={`absolute right-2 z-20 p-2 rounded-full bg-slate-800/80 text-white backdrop-blur-md transition-all ${currentDesktopPage === desktopPages.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-700 hover:scale-110"}`}
            aria-label="Next page"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Pagination Dots */}
        {desktopPages.length > 1 && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
            {desktopPages.map((_, dotIdx) => (
              <div key={dotIdx} className={`h-2 rounded-full transition-all duration-300 ${currentDesktopPage === dotIdx ? "w-6 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "w-2 bg-white/30"}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
});
