import React, { useEffect, useRef, useState, useCallback } from "react";
import { Eraser, Pen, Trash2, X, Download, Plus, Minus } from "lucide-react";
import { Socket } from "socket.io-client";

interface WhiteboardProps {
  socket: Socket | null;
  isHost: boolean;
  onClose: () => void;
}

interface DrawData {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  isEraser: boolean;
}

export function Whiteboard({ socket, isHost, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  const currentPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pathsRef = useRef<DrawData[]>([]);

  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number, c: string, s: number, eraser: boolean, emit: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
    ctx.lineTo(x1 * canvas.width, y1 * canvas.height);
    ctx.strokeStyle = eraser ? "#0f172a" : c; 
    ctx.lineWidth = eraser ? s * 20 : s;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    const data: DrawData = { x0, y0, x1, y1, color: c, size: s, isEraser: eraser };
    pathsRef.current.push(data);
    socket?.emit("whiteboard-draw", data);
  }, [socket]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pathsRef.current.forEach((d) => {
      drawLine(d.x0, d.y0, d.x1, d.y1, d.color, d.size, d.isEraser, false);
    });
  }, [drawLine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawAll();
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);



  const clearBoard = (emit: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pathsRef.current = [];
    if (emit) socket?.emit("whiteboard-clear", {});
  };

  useEffect(() => {
    if (!socket) return;

    const onDraw = (data: DrawData) => {
      pathsRef.current.push(data);
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.isEraser, false);
    };

    const onClear = () => {
      clearBoard(false);
    };

    const onRequest = (data: any) => {
      if (isHost) {
        socket.emit("sync-whiteboard", { targetSid: data.requesterSid, state: pathsRef.current });
      }
    };

    const onSync = (data: any) => {
      pathsRef.current = data.state || [];
      redrawAll();
    };

    socket.on("whiteboard-draw", onDraw);
    socket.on("whiteboard-clear", onClear);
    socket.on("request-whiteboard", onRequest);
    socket.on("sync-whiteboard", onSync);

    socket.emit("request-whiteboard", {});

    return () => {
      socket.off("whiteboard-draw", onDraw);
      socket.off("whiteboard-clear", onClear);
      socket.off("request-whiteboard", onRequest);
      socket.off("sync-whiteboard", onSync);
    };
  }, [socket, isHost]);

  const getEventPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvas.width,
      y: (e.clientY - rect.top) / canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    currentPos.current = getEventPos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const newPos = getEventPos(e);
    drawLine(currentPos.current.x, currentPos.current.y, newPos.x, newPos.y, color, size, isEraser, true);
    currentPos.current = newPos;
  };

  const onPointerUp = () => {
    setIsDrawing(false);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;
    
    tCtx.fillStyle = "#0f172a"; 
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = `pymeet-whiteboard-${new Date().getTime()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  const colors = ["#ffffff", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Top Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/90 border border-slate-700 p-2 rounded-2xl shadow-2xl backdrop-blur-lg z-50">
        <button onClick={() => setIsEraser(false)} className={`p-3 rounded-xl transition ${!isEraser ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-slate-700"} flex items-center justify-center`} title="Pen">
          <Pen size={20} />
        </button>
        <button onClick={() => setIsEraser(true)} className={`p-3 rounded-xl transition ${isEraser ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:bg-slate-700"} flex items-center justify-center`} title="Eraser">
          <Eraser size={20} />
        </button>

        <div className="w-px h-8 bg-slate-600 mx-1"></div>

        <div className="flex gap-1.5 px-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setIsEraser(false); }}
              className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${color === c && !isEraser ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-600 mx-1"></div>

        <div className="flex items-center gap-2 px-2 text-slate-300">
          <button onClick={() => setSize(Math.max(1, size - 1))} className="hover:bg-slate-700 p-1.5 rounded-lg"><Minus size={16} /></button>
          <div className="w-4 text-center font-bold text-sm">{size}</div>
          <button onClick={() => setSize(Math.min(20, size + 1))} className="hover:bg-slate-700 p-1.5 rounded-lg"><Plus size={16} /></button>
        </div>

        <div className="w-px h-8 bg-slate-600 mx-1"></div>

        <button onClick={() => { if(window.confirm("Clear board for everyone?")) clearBoard(true); }} className="p-3 rounded-xl text-rose-400 hover:bg-rose-500/20 transition flex items-center justify-center" title="Clear All">
          <Trash2 size={20} />
        </button>
        
        <button onClick={downloadCanvas} className="p-3 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition flex items-center justify-center" title="Save PNG">
          <Download size={20} />
        </button>
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-rose-500 transition z-50 shadow-xl">
        <X size={24} />
      </button>

      {/* Canvas Area */}
      <div 
        ref={containerRef} 
        className="w-full h-full max-w-6xl max-h-[80vh] bg-[#0f172a] border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden cursor-crosshair relative mt-16"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOut={onPointerUp}
          className="w-full h-full block"
        />
      </div>

    </div>
  );
}
