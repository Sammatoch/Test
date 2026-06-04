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

function drawAvatar(ctx, label, cx, cy) {
  const r = 62
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = label === 'A' ? 'rgba(255,255,255,0.18)' : 'rgba(100,212,255,0.18)'
  ctx.fill()
  ctx.strokeStyle = label === 'A' ? 'rgba(255,255,255,0.45)' : 'rgba(100,212,255,0.55)'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = label === 'A' ? 'rgba(255,255,255,0.9)' : 'rgba(100,212,255,0.9)'
  ctx.font = `bold 62px -apple-system, BlinkMacSystemFont, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.fillText(label, cx, cy + 4)
  ctx.restore()
}

// Returns the centerY of the rendered text block (used for avatar placement)
function drawTextBlock(ctx, text, { fontSize, offsetX, offsetY, maxWidth }) {
  const rawLines = text.split('\n')
  const allLines = []
  for (const rawLine of rawLines) {
    const wrapped = wrapText(ctx, rawLine, maxWidth)
    allLines.push(...wrapped)
  }
  const lineHeight = fontSize * 1.3
  const totalHeight = allLines.length * lineHeight
  const centerX = CANVAS_W / 2 + offsetX
  const startY = CANVAS_H / 2 - totalHeight / 2 + fontSize + offsetY

  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3

  allLines.forEach((line, i) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillText(line, centerX, startY + i * lineHeight)
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
  offsetX2 = 0, offsetY2 = 0
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

  const centerY1 = drawTextBlock(ctx, text, { fontSize, offsetX, offsetY, maxWidth })

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

    const centerY2 = drawTextBlock(ctx, text2, { fontSize, offsetX: offsetX2, offsetY: offsetY2, maxWidth })

    // Person avatar circles — placed to the left of each text block
    const avatarX = padding - 10
    drawAvatar(ctx, 'A', avatarX, centerY1)
    drawAvatar(ctx, 'B', avatarX, centerY2)
  }

  if (total > 1) {
    const dotR = 18
    const dotSpacing = 52
    const dotsTotal = total * dotSpacing - (dotSpacing - dotR * 2)
    const dotsStartX = CANVAS_W / 2 - dotsTotal / 2 + dotR
    const dotsY = CANVAS_H - 100

    for (let i = 0; i < total; i++) {
      ctx.beginPath()
      ctx.arc(dotsStartX + i * dotSpacing, dotsY, dotR, 0, Math.PI * 2)
      ctx.fillStyle = i === index ? '#fe2c55' : 'rgba(255,255,255,0.4)'
      ctx.fill()
    }
  }

  const slideLabel = `${index + 1} / ${total}`
  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(slideLabel, CANVAS_W - 60, 80)
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
