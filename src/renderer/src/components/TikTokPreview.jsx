import { useEffect, useRef } from 'react'
import { CANVAS_W, CANVAS_H, drawSlide, loadImage } from '../lib/renderSlide.js'

const DISPLAY_W = 270
const SCALE = DISPLAY_W / CANVAS_W
const DISPLAY_H = CANVAS_H * SCALE

export default function TikTokPreview({ slides, currentSlide, imageBase64 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const slide = slides?.[currentSlide] || slides?.[0]
    const text = slide?.text || ''
    let cancelled = false

    loadImage(imageBase64).then(img => {
      if (cancelled) return
      drawSlide(ctx, { text, index: currentSlide, total: slides?.length || 0, img })
    })

    return () => { cancelled = true }
  }, [slides, currentSlide, imageBase64])

  return (
    <div
      style={{
        width: DISPLAY_W,
        height: DISPLAY_H,
        overflow: 'hidden',
        borderRadius: 16,
        position: 'relative',
        flexShrink: 0
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
