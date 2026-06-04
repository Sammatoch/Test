import { useEffect, useRef } from 'react'

const CANVAS_W = 1080
const CANVAS_H = 1920
const DISPLAY_W = 270
const DISPLAY_H = 480
const SCALE = DISPLAY_W / CANVAS_W

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export default function TikTokPreview({ slides, currentSlide, imageBase64 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = (img) => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      if (img) {
        const imgRatio = img.width / img.height
        const canvasRatio = CANVAS_W / CANVAS_H
        let sx = 0, sy = 0, sw = img.width, sh = img.height
        if (imgRatio > canvasRatio) {
          sw = img.height * canvasRatio
          sx = (img.width - sw) / 2
        } else {
          sh = img.width / canvasRatio
          sy = (img.height - sh) / 2
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H)
        const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
        overlay.addColorStop(0, 'rgba(0,0,0,0.35)')
        overlay.addColorStop(0.5, 'rgba(0,0,0,0.15)')
        overlay.addColorStop(1, 'rgba(0,0,0,0.65)')
        ctx.fillStyle = overlay
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
        grad.addColorStop(0, '#1a1a2e')
        grad.addColorStop(0.5, '#0a0a0a')
        grad.addColorStop(1, '#0d0d1a')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      }

      if (!slides || slides.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Vorschau', CANVAS_W / 2, CANVAS_H / 2)
        return
      }

      const slide = slides[currentSlide] || slides[0]
      const text = slide.text || ''

      const padding = 80
      const maxWidth = CANVAS_W - padding * 2
      const fontSize = 85
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`
      ctx.textAlign = 'center'

      const rawLines = text.split('\n')
      const allLines = []
      for (const rawLine of rawLines) {
        const wrapped = wrapText(ctx, rawLine, maxWidth)
        allLines.push(...wrapped)
      }

      const lineHeight = fontSize * 1.3
      const totalHeight = allLines.length * lineHeight
      const startY = CANVAS_H / 2 - totalHeight / 2 + fontSize

      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3

      allLines.forEach((line, i) => {
        ctx.fillStyle = '#ffffff'
        ctx.fillText(line, CANVAS_W / 2, startY + i * lineHeight)
      })

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      if (slides.length > 1) {
        const dotR = 18
        const dotSpacing = 52
        const dotsTotal = slides.length * dotSpacing - (dotSpacing - dotR * 2)
        const dotsStartX = CANVAS_W / 2 - dotsTotal / 2 + dotR
        const dotsY = CANVAS_H - 100

        slides.forEach((_, i) => {
          ctx.beginPath()
          ctx.arc(dotsStartX + i * dotSpacing, dotsY, dotR, 0, Math.PI * 2)
          ctx.fillStyle = i === currentSlide ? '#fe2c55' : 'rgba(255,255,255,0.4)'
          ctx.fill()
        })
      }

      const slideLabel = `${currentSlide + 1} / ${slides.length}`
      ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(slideLabel, CANVAS_W - 60, 80)
    }

    if (imageBase64) {
      const img = new window.Image()
      img.onload = () => draw(img)
      img.onerror = () => draw(null)
      img.src = 'data:image/png;base64,' + imageBase64
    } else {
      draw(null)
    }
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
