'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => Promise<void>;
}

export default function ImageCropperModal({ imageSrc, onClose, onSave }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleSave = async () => {
    if (!imageRef.current) return;
    setSaving(true);

    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.clearRect(0, 0, 300, 300);

      // Translate to canvas center to apply rotation and scale
      ctx.translate(150, 150);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image
      const drawWidth = img.naturalWidth;
      const drawHeight = img.naturalHeight;
      const baseScale = Math.min(300 / drawWidth, 300 / drawHeight);
      
      const width = drawWidth * baseScale;
      const height = drawHeight * baseScale;

      ctx.drawImage(img, -width / 2 + position.x / zoom, -height / 2 + position.y / zoom, width, height);

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            await onSave(blob);
          }
          setSaving(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-6 text-zinc-100">
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-white">Edit Photo</h3>
          <p className="text-xs text-zinc-400">Crop, zoom, rotate, and reposition your image.</p>
        </div>

        {/* Crop Window */}
        <div 
          ref={containerRef}
          className="relative h-64 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 cursor-move flex items-center justify-center select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Circular mask overlay to guide the crop */}
          <div className="absolute inset-0 border-[32px] border-zinc-950/70 pointer-events-none z-10 flex items-center justify-center">
            <div className="h-48 w-48 rounded-full border border-dashed border-cyan-400/50" />
          </div>

          <img
            ref={imageRef}
            src={imageSrc}
            alt="Source to crop"
            draggable={false}
            className="max-h-full max-w-full pointer-events-none transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Zoom Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Rotation & Quick buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90) % 360)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition flex items-center justify-center gap-1.5"
            >
              🔄 Rotate Left
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition flex items-center justify-center gap-1.5"
            >
              🔄 Rotate Right
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-transparent hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15"
          >
            {saving ? 'Saving...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
