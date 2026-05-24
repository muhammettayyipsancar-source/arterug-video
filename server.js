const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 200 * 1024 * 1024 } });

const LOGO_B64 = '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';

async function buildOverlayPng(W, H, { brand, product, collection, detail, tagline }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Üst gradient
  const gt = ctx.createLinearGradient(0, 0, 0, H * 0.35);
  gt.addColorStop(0, 'rgba(10,15,8,0.78)');
  gt.addColorStop(1, 'rgba(10,15,8,0)');
  ctx.fillStyle = gt;
  ctx.fillRect(0, 0, W, H * 0.35);

  // Alt gradient
  const gb = ctx.createLinearGradient(0, H, 0, H * 0.38);
  gb.addColorStop(0, 'rgba(10,15,8,0.97)');
  gb.addColorStop(0.45, 'rgba(10,15,8,0.75)');
  gb.addColorStop(1, 'rgba(10,15,8,0)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, H * 0.38, W, H * 0.62);

  // Çerçeve
  const fp = Math.round(W * 0.035);
  ctx.strokeStyle = 'rgba(93,122,66,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(fp, fp, W - fp * 2, H - fp * 2);

  // Logo
  try {
    const logoImg = await loadImage(Buffer.from(LOGO_B64, 'base64'));
    const ls = Math.round(W * 0.12);
    const bPad = Math.round(W * 0.055);
    const ly = Math.round(fp * 1.5);
    ctx.save();
    ctx.beginPath();
    ctx.arc(bPad + ls / 2, ly + ls / 2, ls / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, bPad, ly, ls, ls);
    ctx.restore();
    ctx.strokeStyle = 'rgba(93,122,66,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bPad + ls / 2, ly + ls / 2, ls / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Marka adı
    const txtX = bPad + ls + Math.round(W * 0.035);
    const brandFs = Math.round(W * 0.046);
    ctx.fillStyle = 'rgba(245,240,232,0.92)';
    ctx.font = `${brandFs}px sans-serif`;
    ctx.fillText((brand || 'ARTE RUG').toUpperCase(), txtX, ly + ls * 0.52);

    if (tagline) {
      const tagFs = Math.round(W * 0.030);
      ctx.fillStyle = 'rgba(245,240,232,0.55)';
      ctx.font = `italic ${tagFs}px serif`;
      ctx.fillText(tagline, txtX, ly + ls * 0.52 + brandFs * 0.3 + tagFs);
    }
  } catch(e) { console.error('Logo hatası:', e.message); }

  // Alt metin — aşağıdan yukarı
  const botPad = Math.round(W * 0.07);
  const botBot = Math.round(H * 0.048);
  const prodFs = Math.round(W * 0.115);
  const collFs = Math.round(W * 0.034);
  const detFs  = Math.round(W * 0.027);
  const gap1 = Math.round(H * 0.009);
  const gap2 = Math.round(H * 0.009);
  const lineGap = Math.round(H * 0.020);

  const detailParts = detail ? detail.split('·').map(s => s.trim()).filter(Boolean) : [];
  let blockH = prodFs + gap1 + collFs + lineGap;
  if (detailParts.length) blockH += gap2 + detFs;
  const lineY = H - botBot - blockH;

  ctx.fillStyle = 'rgba(93,122,66,0.75)';
  ctx.fillRect(botPad, lineY, W - botPad * 2, 1.5);

  let acy = lineY + lineGap + prodFs * 0.86;
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic ${prodFs}px serif`;
  ctx.fillText(product || '', botPad, acy);

  acy += gap1 + collFs;
  ctx.fillStyle = 'rgba(245,240,232,0.68)';
  ctx.font = `${collFs}px sans-serif`;
  ctx.fillText((collection || '').toUpperCase(), botPad, acy);

  if (detailParts.length) {
    acy += gap2 + detFs;
    ctx.fillStyle = 'rgba(245,240,232,0.42)';
    ctx.font = `${detFs}px sans-serif`;
    ctx.fillText(detailParts.join(' · '), botPad, acy);
  }

  return canvas.toBuffer('image/png');
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/render', upload.single('video'), async (req, res) => {
  const tmpFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: 'Video gerekli' });

    const inputPath   = req.file.path;
    const overlayPath = path.join(os.tmpdir(), `overlay_${Date.now()}.png`);
    const outputPath  = path.join(os.tmpdir(), `out_${Date.now()}.mp4`);
    tmpFiles.push(inputPath, overlayPath, outputPath);

    const W = 1080, H = 1920;
    const overlayPng = await buildOverlayPng(W, H, {
      brand:      req.body.brand      || 'ARTE RUG',
      product:    req.body.product    || '',
      collection: req.body.collection || '',
      detail:     req.body.detail     || '',
      tagline:    req.body.tagline    || '',
    });
    fs.writeFileSync(overlayPath, overlayPng);

    const trimStart = parseFloat(req.body.trimStart || '0');
    const trimEnd   = parseFloat(req.body.trimEnd   || '9999');

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      if (trimStart > 0) cmd = cmd.setStartTime(trimStart);
      if (trimEnd < 9999) cmd = cmd.setDuration(trimEnd - trimStart);
      cmd
        .input(overlayPath)
        .complexFilter([
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]',
          '[bg][1:v]overlay=0:0[out]'
        ], 'out')
        .videoCodec('libx264')
        .outputOptions(['-preset fast', '-crf 23', '-pix_fmt yuv420p', '-movflags +faststart', '-an'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err, stdout, stderr) => reject(new Error(stderr || err.message)))
        .run();
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="arterug-hikaye.mp4"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', () => tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} }));

  } catch (err) {
    console.error('Hata:', err.message);
    tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Arte Rug Video Server: port ${PORT}`));
