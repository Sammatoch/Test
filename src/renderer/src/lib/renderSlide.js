export const CANVAS_W = 1080
export const CANVAS_H = 1920
export const DEFAULT_FONT_SIZE = 85
// Default Y offsets for dialog mode (canvas pixels from center)
export const DIALOG_OFFSET_Y1 = -380
export const DIALOG_OFFSET_Y2 = 380

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

// Returns the centerY of the rendered text block (used for avatar placement)
function drawTextBlock(ctx, text, { fontSize, offsetX, offsetY, maxWidth, color = '#ffffff', align = 'center' }) {
  const rawLines = text.split('\n')
  const allLines = []
  for (const rawLine of rawLines) {
    // Preserve intentionally blank lines (e.g. a double Enter) instead of dropping them
    if (rawLine.trim() === '') { allLines.push(''); continue }
    const wrapped = wrapText(ctx, rawLine, maxWidth)
    allLines.push(...wrapped)
  }
  const lineHeight = fontSize * 1.3
  const totalHeight = allLines.length * lineHeight
  // Left-aligned text starts at the left edge of the centered text column; centered text uses the middle
  ctx.textAlign = align === 'left' ? 'left' : 'center'
  const x = align === 'left'
    ? (CANVAS_W - maxWidth) / 2 + offsetX
    : CANVAS_W / 2 + offsetX
  const startY = CANVAS_H / 2 - totalHeight / 2 + fontSize + offsetY

  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3

  allLines.forEach((line, i) => {
    ctx.fillStyle = color
    ctx.fillText(line, x, startY + i * lineHeight)
  })

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  return startY + totalHeight / 2 - fontSize / 2
}

export function drawSlide(ctx, {
  text, text2,
  index, total, img,
  fontSize = DEFAULT_FONT_SIZE,
  offsetX = 0, offsetY = 0,
  offsetX2 = 0, offsetY2 = 0,
  textColor = '#ffffff',
  textAlign = 'center'
}) {
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

  if (!text) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Vorschau', CANVAS_W / 2, CANVAS_H / 2)
    return
  }

  const padding = 80
  const maxWidth = CANVAS_W - padding * 2
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`
  ctx.textAlign = 'center'

  drawTextBlock(ctx, text, { fontSize, offsetX, offsetY, maxWidth, color: textColor, align: textAlign })

  if (text2) {
    // Separator line between the two speakers
    const sepY = CANVAS_H / 2 + (offsetY + offsetY2) / 2
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.setLineDash([12, 10])
    ctx.beginPath()
    ctx.moveTo(padding * 2, sepY)
    ctx.lineTo(CANVAS_W - padding * 2, sepY)
    ctx.stroke()
    ctx.restore()

    drawTextBlock(ctx, text2, { fontSize, offsetX: offsetX2, offsetY: offsetY2, maxWidth, color: textColor, align: textAlign })
  }
}

export function loadImage(base64) {
  return new Promise((resolve) => {
    if (!base64) return resolve(null)
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = 'data:image/png;base64,' + base64
  })
}

export async function renderSlideToDataURL(text, index, total, base64, textOpts = {}) {
  const img = await loadImage(base64)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  drawSlide(ctx, { text, index, total, img, ...textOpts })
  return canvas.toDataURL('image/png')
}
