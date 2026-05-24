const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ffmpeg-static binary'yi kullan
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ffmpeg: ffmpegStatic });
});

app.post('/render', upload.single('video'), async (req, res) => {
  const tmpFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: 'Video gerekli' });

    const inputPath  = req.file.path;
    const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.mp4`);
    tmpFiles.push(inputPath, outputPath);

    const brand      = req.body.brand      || 'ARTE RUG';
    const product    = req.body.product    || '';
    const collection = req.body.collection || '';
    const detail     = req.body.detail     || '';
    const tagline    = req.body.tagline    || '';
    const trimStart  = parseFloat(req.body.trimStart || '0');
    const trimEnd    = parseFloat(req.body.trimEnd   || '9999');

    const esc = s => String(s||'')
      .replace(/\\/g,'\\\\').replace(/'/g,'\u2019')
      .replace(/:/g,'\\:').replace(/\[/g,'\\[')
      .replace(/\]/g,'\\]').replace(/,/g,'\\,');

    let vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
    vf += `,drawbox=x=0:y=0:w=1080:h=280:color=black@0.55:t=fill`;
    vf += `,drawbox=x=0:y=1150:w=1080:h=770:color=black@0.75:t=fill`;
    vf += `,drawbox=x=60:y=1195:w=960:h=2:color=0x5D7A42@0.85:t=fill`;
    if (product)    vf += `,drawtext=text='${esc(product)}':fontcolor=white:fontsize=88:x=60:y=1215`;
    if (collection) vf += `,drawtext=text='${esc(collection.toUpperCase())}':fontcolor=white@0.70:fontsize=34:x=60:y=1325`;
    if (detail) {
      const ds = detail.split('·').map(s=>s.trim()).filter(Boolean).join(' · ');
      vf += `,drawtext=text='${esc(ds)}':fontcolor=white@0.45:fontsize=27:x=60:y=1370`;
    }
    if (brand)   vf += `,drawtext=text='${esc(brand.toUpperCase())}':fontcolor=white@0.92:fontsize=44:x=190:y=72`;
    if (tagline) vf += `,drawtext=text='${esc(tagline)}':fontcolor=white@0.55:fontsize=28:x=190:y=126`;

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      if (trimStart > 0) cmd = cmd.setStartTime(trimStart);
      if (trimEnd < 9999) cmd = cmd.setDuration(trimEnd - trimStart);
      cmd
        .videoFilters(vf)
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
