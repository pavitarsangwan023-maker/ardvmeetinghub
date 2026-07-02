import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Download, Copy, CheckCircle2, QrCode } from "lucide-react";

interface QRModalProps {
  meetingId: string;
  onClose: () => void;
}

export function QRModal({ meetingId, onClose }: QRModalProps) {
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const joinUrl = `${window.location.origin}/meeting/${meetingId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 320;
      canvas.height = 320;
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, 320, 320);
      ctx!.drawImage(img, 10, 10, 300, 300);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `meeting-${meetingId}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 0 80px rgba(34,211,238,0.15), 0 25px 50px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <QrCode className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Join via QR Code</h2>
              <p className="text-slate-400 text-xs">Scan to join this meeting instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center px-6 py-6 gap-5">
          <div className="relative p-4 rounded-2xl bg-white shadow-[0_0_40px_rgba(34,211,238,0.3)]">
            <QRCodeSVG
              ref={svgRef}
              value={joinUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={false}
            />
            {/* Corner decorations */}
            <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-500 rounded-tl-lg" />
            <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg" />
            <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg" />
            <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-500 rounded-br-lg" />
          </div>

          {/* Meeting ID badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 border border-white/10">
            <span className="text-slate-400 text-xs font-medium">Meeting ID</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">{meetingId}</span>
          </div>

          {/* Instructions */}
          <div className="w-full rounded-xl bg-slate-800/60 border border-white/10 p-3">
            <p className="text-slate-300 text-xs text-center leading-relaxed">
              📷 Open your camera app or any QR scanner<br />
              Point it at this code to join instantly
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              <Download size={16} />
              Save QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
