const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 200 * 1024 * 1024 } });

app.get('/health', (req, res) => res.json({ status: 'ok', ffmpeg: ffmpegStatic }));

app.post('/render', upload.single('video'), async (req, res) => {
  const tmpFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: 'Video gerekli' });

    const inputPath  = req.file.path;
    const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.mp4`);
    tmpFiles.push(inputPath, outputPath);

    const brand      = (req.body.brand      || 'ARTE RUG').toUpperCase();
    const product    = req.body.product    || '';
    const collection = (req.body.collection || '').toUpperCase();
    const detail     = req.body.detail     || '';
    const tagline    = req.body.tagline    || '';
    const trimStart  = parseFloat(req.body.trimStart || '0');
    const trimEnd    = parseFloat(req.body.trimEnd   || '9999');

    const detailStr = detail ? detail.split('·').map(s=>s.trim()).filter(Boolean).join(' - ') : '';

    // SVG overlay oluştur (canvas gerektirmez)
    const W = 1080, H = 1920;
    const svgOverlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(10,15,8,0.78)"/>
      <stop offset="100%" stop-color="rgba(10,15,8,0)"/>
    </linearGradient>
    <linearGradient id="gb" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="rgba(10,15,8,0.95)"/>
      <stop offset="50%" stop-color="rgba(10,15,8,0.6)"/>
      <stop offset="100%" stop-color="rgba(10,15,8,0)"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${Math.round(H*0.35)}" fill="url(#gt)"/>
  <rect y="${Math.round(H*0.45)}" width="${W}" height="${Math.round(H*0.55)}" fill="url(#gb)"/>
  <rect x="38" y="38" width="${W-76}" height="${H-76}" fill="none" stroke="rgba(93,122,66,0.45)" stroke-width="2"/>
  <rect x="60" y="1195" width="960" height="2" fill="rgba(93,122,66,0.8)"/>
  <text x="60" y="1310" font-family="Arial,sans-serif" font-size="96" font-style="italic" fill="white" opacity="0.97">${escXml(product)}</text>
  <text x="60" y="1360" font-family="Arial,sans-serif" font-size="36" fill="rgba(245,240,232,0.70)">${escXml(collection)}</text>
  ${detailStr ? `<text x="60" y="1400" font-family="Arial,sans-serif" font-size="28" fill="rgba(245,240,232,0.45)">${escXml(detailStr)}</text>` : ''}
  <text x="185" y="115" font-family="Arial,sans-serif" font-size="46" letter-spacing="8" fill="rgba(245,240,232,0.92)">${escXml(brand)}</text>
  ${tagline ? `<text x="185" y="155" font-family="Arial,sans-serif" font-size="30" font-style="italic" fill="rgba(245,240,232,0.55)">${escXml(tagline)}</text>` : ''}
</svg>`;

    function escXml(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const svgPath = path.join(os.tmpdir(), `svg_${Date.now()}.svg`);
    fs.writeFileSync(svgPath, svgOverlay);
    tmpFiles.push(svgPath);

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      if (trimStart > 0) cmd = cmd.setStartTime(trimStart);
      if (trimEnd < 9999) cmd = cmd.setDuration(trimEnd - trimStart);
      cmd
        .input(svgPath)
        .complexFilter([
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]',
          '[bg][1:v]overlay=0:0[out]'
        ], 'out')
        .videoCodec('libx264')
        .outputOptions(['-preset ultrafast', '-crf 26', '-pix_fmt yuv420p', '-movflags +faststart', '-an'])
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

function escXml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

app.listen(PORT, () => console.log(`Arte Rug Video Server: port ${PORT}`));
