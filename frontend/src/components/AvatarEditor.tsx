import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface AvatarEditorProps {
  file: File;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export function AvatarEditor({ file, onConfirm, onCancel }: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);

  const CANVAS_SIZE = 280;
  const OUTPUT_SIZE = 320; // TS3 avatar max

  // Load image from file
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Auto-fit: zoom so the smaller dimension fills the circle
      const scale = CANVAS_SIZE / Math.min(img.width, img.height);
      setZoom(scale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image centered + offset + zoom
    const w = image.width * zoom;
    const h = image.height * zoom;
    const x = (CANVAS_SIZE - w) / 2 + offset.x;
    const y = (CANVAS_SIZE - h) / 2 + offset.y;

    ctx.save();
    // Clip to circle
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x, y, w, h);
    ctx.restore();

    // Draw circle border overlay
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Darken corners outside circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.restore();
  }, [image, zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse/touch drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.1, Math.min(5, z + delta)));
  };

  const handleReset = () => {
    if (!image) return;
    const scale = CANVAS_SIZE / Math.min(image.width, image.height);
    setZoom(scale);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    if (!image) return;
    setExporting(true);

    // Render at OUTPUT_SIZE
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext('2d')!;

    const scaleFactor = OUTPUT_SIZE / CANVAS_SIZE;
    const w = image.width * zoom * scaleFactor;
    const h = image.height * zoom * scaleFactor;
    const x = (OUTPUT_SIZE - w) / 2 + offset.x * scaleFactor;
    const y = (OUTPUT_SIZE - h) / 2 + offset.y * scaleFactor;

    ctx.drawImage(image, x, y, w, h);

    outCanvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
        setExporting(false);
      },
      'image/png',
    );
  };

  const minZoom = image ? Math.min(0.1, CANVAS_SIZE / Math.max(image.width, image.height) * 0.5) : 0.1;
  const maxZoom = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-lg p-5 space-y-4 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Edit Avatar</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Drag to reposition, scroll to zoom. The circle shows how it looks in TeamSpeak.
        </p>

        {/* Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-md cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Slider
            min={minZoom * 100}
            max={maxZoom * 100}
            step={1}
            value={[zoom * 100]}
            onValueChange={([v]) => setZoom(v / 100)}
          />
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={exporting || !image}>
            {exporting ? 'Exporting...' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
