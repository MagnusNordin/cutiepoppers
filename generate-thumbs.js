const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const productsDir = path.join(__dirname, 'public', 'products');
const imageFiles = fs.readdirSync(productsDir).filter(file => {
    return (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')) && !file.includes('-thumb') && !file.startsWith('._');
});

console.log(`Found ${imageFiles.length} images to process.`);

async function generateThumbs() {
    for (const file of imageFiles) {
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        const thumbName = `${baseName}-thumb${ext}`;
        const inputPath = path.join(productsDir, file);
        const outputPath = path.join(productsDir, thumbName);

        if (fs.existsSync(outputPath)) {
            console.log(`Skipping ${file}, thumbnail already exists.`);
            continue;
        }

        try {
            console.log(`Generating thumbnail for ${file}...`);
            await sharp(inputPath)
                .resize(300) // Resize to 300px width (height auto-scaled)
                .toFile(outputPath);
            console.log(`  Done: ${thumbName}`);
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
    console.log('All thumbnails generated!');
}

generateThumbs();
