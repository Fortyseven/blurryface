import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, "../public/models");
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const models = [
    // SSD MobileNet (you already have these, but including for completeness)
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "ssd_mobilenetv1_model-weights_manifest.json",

    // TinyFace Detector
    "tiny_face_detector_model-shard1",
    "tiny_face_detector_model-weights_manifest.json",

    // Face Landmarks
    "face_landmark_68_model-shard1",
    "face_landmark_68_model-weights_manifest.json",

    // Face Recognition
    "face_recognition_model-shard1",
    "face_recognition_model-shard2",
    "face_recognition_model-weights_manifest.json",
];

const MODELS_URL =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/";

async function downloadFile(filename) {
    return new Promise((resolve, reject) => {
        const filepath = path.join(modelsDir, filename);

        // Skip if file already exists
        if (fs.existsSync(filepath)) {
            console.log(`File ${filename} already exists, skipping.`);
            return resolve();
        }

        console.log(`Downloading ${filename}...`);

        const file = fs.createWriteStream(filepath);
        https
            .get(`${MODELS_URL}${filename}`, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    console.log(`Downloaded ${filename}`);
                    resolve();
                });
            })
            .on("error", (err) => {
                fs.unlink(filepath, () => {});
                console.error(`Error downloading ${filename}: ${err.message}`);
                reject(err);
            });
    });
}

async function downloadAllModels() {
    for (const model of models) {
        try {
            await downloadFile(model);
        } catch (err) {
            console.error(`Failed to download ${model}: ${err}`);
        }
    }
    console.log("Model download complete.");
}

downloadAllModels();
