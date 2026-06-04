import { useEffect, useRef } from 'react'
import { CANVAS_W, CANVAS_H, DEFAULT_FONT_SIZE, drawSlide, loadImage } from '../lib/renderSlide.js'

const DISPLAY_W = 270
const SCALE = DISPLAY_W / CANVAS_W
const DISPLAY_H = CANVAS_H * SCALE

export default function TikTokPreview({
  slides,
  currentSlide,
  imageBase64,
  fontSize = DEFAULT_FONT_SIZE,
  offsetX = 0,
  offsetY = 0,
  onOffsetChange
}) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const slide = slides?.[currentSlide] || slides?.[0]
    const text = slide?.text || ''
    let cancelled = false

    loadImage(imageBase64).then(img => {
      if (cancelled) return
      drawSlide(ctx, { text, index: currentSlide, total: slides?.length || 0, img, fontSize, offsetX, offsetY })
    })

    return () => { cancelled = true }
  }, [slides, currentSlide, imageBase64, fontSize, offsetX, offsetY])

  const handlePointerDown = (e) => {
    if (!onOffsetChange) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offsetX, baseY: offsetY }
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    // Convert displayed-pixel movement into canvas pixels (canvas is CSS-scaled by SCALE)
    const dx = (e.clientX - dragRef.current.startX) / SCALE
    const dy = (e.clientY - dragRef.current.startY) / SCALE
    onOffsetChange(Math.round(dragRef.current.baseX + dx), Math.round(dragRef.current.baseY + dy))
  }

  const endDrag = (e) => {
    if (dragRef.current && e.pointerId != null) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    }
    dragRef.current = null
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        width: DISPLAY_W,
        height: DISPLAY_H,
        overflow: 'hidden',
        borderRadius: 16,
        position: 'relative',
        flexShrink: 0,
        cursor: onOffsetChange ? 'move' : 'default',
        touchAction: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          display: 'block'
        }}
      />
    </div>
  )
}
