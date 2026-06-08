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
  offsetX2 = 0,
  offsetY2 = 0,
  textColor = '#ffffff',
  textAlign = 'center',
  onOffsetChange,
  onOffset2Change
}) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const slide = slides?.[currentSlide] || slides?.[0]
    const text = slide?.text || ''
    const text2 = slide?.text2 || ''
    let cancelled = false

    loadImage(imageBase64).then(img => {
      if (cancelled) return
      drawSlide(ctx, {
        text, text2,
        index: currentSlide, total: slides?.length || 0, img,
        fontSize, offsetX, offsetY, offsetX2, offsetY2, textColor, textAlign
      })
    })

    return () => { cancelled = true }
  }, [slides, currentSlide, imageBase64, fontSize, offsetX, offsetY, offsetX2, offsetY2, textColor, textAlign])

  const handlePointerDown = (e) => {
    if (!onOffsetChange && !onOffset2Change) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }

    // Use getBoundingClientRect so relY is in display-pixel space (0..DISPLAY_H),
    // not in canvas-pixel space — e.nativeEvent.offsetY is unreliable on a scaled canvas.
    const rect = e.currentTarget.getBoundingClientRect()
    const relY = e.clientY - rect.top

    const slide = slides?.[currentSlide]
    const hasText2 = !!(slide?.text2 && slide.text2.trim())
    const inBottomHalf = relY > DISPLAY_H / 2

    if (hasText2 && inBottomHalf && onOffset2Change) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offsetX2, baseY: offsetY2, which: 2 }
    } else if (onOffsetChange) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offsetX, baseY: offsetY, which: 1 }
    }
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.startX) / SCALE
    const dy = (e.clientY - dragRef.current.startY) / SCALE
    if (dragRef.current.which === 2) {
      onOffset2Change(Math.round(dragRef.current.baseX + dx), Math.round(dragRef.current.baseY + dy))
    } else {
      onOffsetChange(Math.round(dragRef.current.baseX + dx), Math.round(dragRef.current.baseY + dy))
    }
  }

  const endDrag = (e) => {
    if (dragRef.current && e.pointerId != null) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    }
    dragRef.current = null
  }

  const slide = slides?.[currentSlide]
  const hasText2 = !!(slide?.text2 && slide.text2.trim())
  const canDrag = onOffsetChange || onOffset2Change

  return (
    <div style={{ position: 'relative', width: DISPLAY_W, flexShrink: 0 }}>
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
          cursor: canDrag ? 'move' : 'default',
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
        {/* Dialog zone labels */}
        {hasText2 && canDrag && (
          <>
            <div style={{
              position: 'absolute', top: 6, left: 8,
              fontSize: 10, color: 'rgba(255,255,255,0.55)',
              pointerEvents: 'none', fontWeight: 700
            }}>A ↕</div>
            <div style={{
              position: 'absolute', bottom: 6, left: 8,
              fontSize: 10, color: 'rgba(100,212,255,0.7)',
              pointerEvents: 'none', fontWeight: 700
            }}>B ↕</div>
          </>
        )}
      </div>
    </div>
  )
}
