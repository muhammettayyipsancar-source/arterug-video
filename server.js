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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/render', upload.single('video'), async (req, res) => {
  const tmpFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: 'Video gerekli' });

    const inputPath  = req.file.path;
    const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.mp4`);
    tmpFiles.push(inputPath, outputPath);

    const trimStart = parseFloat(req.body.trimStart || '0');
    const trimEnd   = parseFloat(req.body.trimEnd   || '9999');

    // Sadece drawbox ile overlay — metin yok, SVG yok
    // Gradient efekti için çakışan yarı saydam kutular
    const vf = [
      'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
      // Üst koyu bant
      'drawbox=x=0:y=0:w=1080:h=300:color=black@0.6:t=fill',
      // Alt koyu bant
      'drawbox=x=0:y=1150:w=1080:h=770:color=black@0.8:t=fill',
      // Yeşil çizgi
      'drawbox=x=60:y=1195:w=960:h=3:color=0x5D7A42:t=fill',
      // Yeşil çerçeve
      'drawbox=x=38:y=38:w=1004:h=1844:color=0x5D7A42@0.4:t=2'
    ].join(',');

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      if (trimStart > 0) cmd = cmd.setStartTime(trimStart);
      if (trimEnd < 9999) cmd = cmd.setDuration(trimEnd - trimStart);
      cmd
        .videoFilters(vf)
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

app.listen(PORT, () => console.log(`Arte Rug Video Server: port ${PORT}`));
