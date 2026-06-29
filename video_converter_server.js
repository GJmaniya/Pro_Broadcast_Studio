const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Set up storage for uploaded files
const upload = multer({ dest: 'uploads/' });

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'converted_videos');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Serve static files (like your broadcast studio HTML)
app.use(express.static(__dirname));

// Route to handle video upload and conversion
app.post('/convert', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    const inputPath = req.file.path;
    const outputFilename = `converted_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Received file: ${req.file.originalname}. Starting conversion...`);

    // Run FFmpeg conversion
    ffmpeg(inputPath)
        // Video Settings
        .videoCodec('libx264')
        .outputOptions([
            '-profile:v main',      // H.264 Main Profile
            '-pix_fmt yuv420p',     // YUV420p Pixel Format
            '-preset fast'          // Encoding speed preset
        ])
        .fps(30)                    // Strictly 30 FPS

        // Audio Settings
        .audioCodec('aac')          // AAC Audio

        // Output Format
        .format('mp4')              // Container: .mp4

        // Events
        .on('progress', (progress) => {
            if (progress.percent) {
                console.log(`Processing: ${Math.round(progress.percent)}% done`);
            }
        })
        .on('end', () => {
            console.log('Conversion finished successfully!');
            // Delete the original uploaded temporary file
            fs.unlinkSync(inputPath);
            
            // Send the converted video file back to the user
            res.download(outputPath, outputFilename, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                // Optional: Delete the converted file after sending it to save space
                // fs.unlinkSync(outputPath);
            });
        })
        .on('error', (err) => {
            console.error('Error during conversion:', err);
            fs.unlinkSync(inputPath);
            res.status(500).send('Error during video conversion.');
        })
        .save(outputPath);
});

app.listen(PORT, () => {
    console.log(`Video Converter Server running at http://localhost:${PORT}`);
    console.log('Waiting for video uploads...');
});
