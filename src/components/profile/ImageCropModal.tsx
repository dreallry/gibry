import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, RotateCw, RefreshCw, ZoomIn, ZoomOut, Lightbulb } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  outputSize?: number;
}

export function ImageCropModal({ isOpen, imageSrc, onClose, onConfirm, outputSize = 400 }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImgLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImgLoaded(true); setZoom(1); setOffset({ x: 0, y: 0 }); setRotation(0); };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const size = Math.min(container.clientWidth, 280);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Draw circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply rotation
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    // Scale image to fill the crop area
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }

    const x = (size - drawW) / 2 + offset.x;
    const y = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    // Border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(166, 124, 82, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [zoom, offset, rotation]);

  useEffect(() => { if (imgLoaded) drawPreview(); }, [drawPreview, imgLoaded]);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.offsetX + dx, y: dragStart.current.offsetY + dy });
  }

  function handlePointerUp() { setDragging(false); }

  function handleRotate90() { setRotation(prev => (prev + 90) % 360); }

  function handleReset() { setZoom(1); setOffset({ x: 0, y: 0 }); setRotation(0); }

  function handleConfirm() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    setConfirming(true);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = outputSize;
    outCanvas.height = outputSize;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) { setConfirming(false); return; }

    const size = canvas.width;

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply rotation
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outputSize / 2, -outputSize / 2);

    const scale = outputSize / size;
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }
    const x = (size - drawW) / 2 + offset.x;
    const y = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, x * scale, y * scale, drawW * scale, drawH * scale);

    const dataUrl = outCanvas.toDataURL("image/jpeg", 0.85);
    setConfirming(false);
    onConfirm(dataUrl);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#faf6f0", border: "1px solid #dbd0ba" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "#4a3f35" }}>Potong & Atur Foto Profil</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "#8a7e72" }}>Geser, putar, atau ubah ukuran foto Anda</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
            <X size={16} style={{ color: "#8a7e72" }} />
          </button>
        </div>

        {/* Crop Preview */}
        <div className="flex items-center justify-center px-5 pt-2 pb-1">
          <div
            ref={containerRef}
            className="relative cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas ref={canvasRef} className="rounded-full" style={{ width: 200, height: 200 }} />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#a67c52", borderTopColor: "transparent" }} />
              </div>
            )}
          </div>
        </div>

        {/* Hint Text */}
        <div className="flex items-center justify-center gap-1.5 px-5 pb-2">
          <Lightbulb size={12} className="text-amber-500" />
          <p className="text-[10px]" style={{ color: "#8a7e72" }}>
            Tahan & geser gambar di dalam lingkaran untuk menyesuaikan posisi
          </p>
        </div>

        {/* Zoom Slider */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2">
            <ZoomOut size={14} style={{ color: "#8a7e72" }} />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: "#dbd0ba" }}
            />
            <ZoomIn size={14} style={{ color: "#8a7e72" }} />
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-center gap-3 px-5 pb-2">
          <button
            onClick={handleRotate90}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors hover:bg-black/5"
            style={{ color: "#a67c52", border: "1px solid #dbd0ba" }}
          >
            <RotateCw size={13} />
            Putar 90°
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors hover:bg-black/5"
            style={{ color: "#a67c52", border: "1px solid #dbd0ba" }}
          >
            <RefreshCw size={13} />
            Reset Posisi
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 pt-2" style={{ borderTop: "1px solid #dbd0ba" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-black/5"
            style={{ borderColor: "#dbd0ba", color: "#4a3f35" }}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !imgLoaded}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            style={{ background: "#a67c52", color: "#fff" }}
          >
            {confirming ? <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#fff", borderTopColor: "transparent" }} /> : <Check size={14} />}
            {confirming ? "Memproses..." : "Simpan Foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
