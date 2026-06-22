import { useEffect, useRef, useState } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

export type BackgroundType = "none" | "blur" | "image" | "video" | "synthwave" | "gradient" | "starlight";

export function useVirtualBackground(
  rawStream: MediaStream | null,
  backgroundType: BackgroundType,
  backgroundSrc?: string // URL for image or video
) {
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!segmentationRef.current) {
      segmentationRef.current = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      segmentationRef.current.setOptions({
        modelSelection: 1,
      });
      segmentationRef.current.initialize().catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (backgroundType === "image" && backgroundSrc) {
      const img = new Image();
      img.src = backgroundSrc;
      img.crossOrigin = "anonymous";
      bgImageRef.current = img;
    } else {
      bgImageRef.current = null;
    }

    if (backgroundType === "video" && backgroundSrc) {
      const video = document.createElement("video");
      video.src = backgroundSrc;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(e => console.error("Auto-play prevented", e));
      bgVideoRef.current = video;
    } else {
      if (bgVideoRef.current) {
        bgVideoRef.current.pause();
        bgVideoRef.current.src = "";
      }
      bgVideoRef.current = null;
    }
  }, [backgroundType, backgroundSrc]);

  useEffect(() => {
    if (!rawStream || backgroundType === "none") {
      setOutputStream(null);
      return;
    }

    const sourceVideoElement = document.createElement("video");
    sourceVideoElement.srcObject = rawStream;
    sourceVideoElement.autoplay = true;
    sourceVideoElement.muted = true;
    sourceVideoElement.playsInline = true;
    sourceVideoElement.play().catch(e => console.error("Hidden video play error", e));

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const segmentation = segmentationRef.current;
    if (!segmentation) return;

    let animationId: number;
    let isProcessing = false;

    segmentation.onResults((results) => {
      canvas.width = results.image.width;
      canvas.height = results.image.height;
      
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw segmentation mask
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      
      // Draw person (only where mask is white)
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      
      // Draw background (only where mask is black/transparent)
      ctx.globalCompositeOperation = "destination-over";
      
      if (backgroundType === "blur") {
        ctx.filter = "blur(15px)";
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else if (backgroundType === "synthwave") {
        const time = Date.now() / 1000;
        
        // Grid (Front)
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 2;
        const gridY = canvas.height / 2 + 50;
        const numLines = 20;
        const offset = (time * 50) % 40;
        
        for (let i = 0; i < numLines; i++) {
          const y = gridY + Math.pow(i, 1.5) * 5 + offset;
          if (y < canvas.height) {
            ctx.globalAlpha = 1 - (canvas.height - y) / (canvas.height - gridY);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Sun (Middle)
        const sunGradient = ctx.createLinearGradient(0, canvas.height / 2 - 100, 0, canvas.height / 2 + 100);
        sunGradient.addColorStop(0, "#f9a826");
        sunGradient.addColorStop(1, "#e91e63");
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Sky (Back)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#0b0c10");
        gradient.addColorStop(1, "#2a0845");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

      } else if (backgroundType === "gradient") {
        const time = Date.now() / 2000;
        const r = Math.sin(time) * 127 + 128;
        const g = Math.sin(time + 2) * 127 + 128;
        const b = Math.sin(time + 4) * 127 + 128;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (backgroundType === "image" && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else if (backgroundType === "video" && bgVideoRef.current) {
        ctx.drawImage(bgVideoRef.current, 0, 0, canvas.width, canvas.height);
      } else if (backgroundType === "starlight") {
        const time = Date.now() / 1000;
        
        // Mist (Front)
        const mistGradient = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
        mistGradient.addColorStop(0, "rgba(15, 23, 42, 0)");
        mistGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
        ctx.fillStyle = mistGradient;
        ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

        // Stars (Middle)
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 200; i++) {
          const x = (Math.sin(i * 12.345) * 0.5 + 0.5) * canvas.width;
          const y = (Math.cos(i * 67.890) * 0.5 + 0.5) * canvas.height;
          // Twinkle effect
          const twinkle = (Math.sin(time * 2 + i) + 1) / 2; // 0 to 1
          ctx.globalAlpha = 0.2 + twinkle * 0.8;
          
          const starSize = (Math.sin(i * 99.99) * 0.5 + 0.5) * 2;
          ctx.beginPath();
          ctx.arc(x, y, starSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Moon (Behind stars)
        const moonX = canvas.width * 0.8;
        const moonY = canvas.height * 0.3;
        const moonRadius = 60;
        
        // Moon glow
        ctx.shadowBlur = 50 + Math.sin(time * 2) * 10; // Pulsing glow
        ctx.shadowColor = "#e2e8f0";
        
        const moonGradient = ctx.createRadialGradient(moonX - 10, moonY - 10, 10, moonX, moonY, moonRadius);
        moonGradient.addColorStop(0, "#ffffff");
        moonGradient.addColorStop(1, "#cbd5e1");
        
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fillStyle = moonGradient;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Deep blue sky gradient (Back)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, "#020617");
        skyGradient.addColorStop(1, "#0f172a");
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.restore();
      isProcessing = false;
    });
    
    const sendFrame = async () => {
      if (sourceVideoElement.readyState >= 2 && !sourceVideoElement.paused && !sourceVideoElement.ended) {
        if (!isProcessing) {
          isProcessing = true;
          try {
            await segmentation.send({ image: sourceVideoElement });
          } catch (e) {
            console.error("Segmentation failed", e);
            isProcessing = false;
          }
        }
      }
      
      if ('requestVideoFrameCallback' in sourceVideoElement) {
        animationId = (sourceVideoElement as any).requestVideoFrameCallback(sendFrame);
      } else {
        animationId = requestAnimationFrame(sendFrame);
      }
    };
    
    // Slight delay to ensure video has dimensions
    const startLoop = () => {
      if ('requestVideoFrameCallback' in sourceVideoElement) {
        animationId = (sourceVideoElement as any).requestVideoFrameCallback(sendFrame);
      } else {
        animationId = requestAnimationFrame(sendFrame);
      }
    };
    
    sourceVideoElement.addEventListener('loadeddata', startLoop);
    if (sourceVideoElement.readyState >= 2) {
      startLoop();
    }

    // Capture stream from canvas at 30 fps
    const newStream = canvas.captureStream(30);

    // Add audio tracks from rawStream to the new stream
    if (rawStream) {
      rawStream.getAudioTracks().forEach(track => {
        newStream.addTrack(track);
      });
    }

    setOutputStream(newStream);

    return () => {
      sourceVideoElement.pause();
      sourceVideoElement.srcObject = null;
      sourceVideoElement.removeEventListener('loadeddata', startLoop);
      if ('cancelVideoFrameCallback' in sourceVideoElement) {
        (sourceVideoElement as any).cancelVideoFrameCallback(animationId);
      } else {
        cancelAnimationFrame(animationId);
      }
    };
  }, [rawStream, backgroundType, backgroundSrc]);

  return outputStream;
}
