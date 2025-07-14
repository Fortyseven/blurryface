import * as faceapi from "face-api.js";

export async function processImage({
    image,
    minConfidence = 0.1,
    obscureMode = "blur",
    solidColor = "#FF0000",
    selectedEmoji = "😎",
    modelsLoaded = false
}) {
    if (!modelsLoaded) {
        throw new Error("Face detection models are not loaded yet");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    let detections = [];
    try {
        detections = await faceapi.detectAllFaces(
            image,
            new faceapi.SsdMobilenetv1Options({ minConfidence })
        );
        if (detections.length > 0) {
            try {
                const enhancedDetections = await faceapi
                    .detectAllFaces(
                        image,
                        new faceapi.SsdMobilenetv1Options({ minConfidence })
                    )
                    .withFaceLandmarks();
                if (enhancedDetections.length > 0) {
                    detections = enhancedDetections;
                }
            } catch (err) {
                // Continue with basic detections
            }
        }
        if (detections.length === 0) {
            detections = await faceapi.detectAllFaces(
                image,
                new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })
            );
        }
    } catch (err) {
        throw new Error(`Face detection failed: ${err.message}`);
    }

    detections.forEach((detection) => {
        try {
            const box = detection.detection ? detection.detection.box : detection.box;
            const { x, y, width, height } = box;
            const padding = 0.1 * Math.max(width, height);
            const startX = Math.max(0, x - padding);
            const startY = Math.max(0, y - padding);
            const regionWidth = Math.min(
                canvas.width - startX,
                width + 2 * padding
            );
            const regionHeight = Math.min(
                canvas.height - startY,
                height + 2 * padding
            );

            if (obscureMode === "blur") {
                const faceRegion = ctx.getImageData(
                    startX,
                    startY,
                    regionWidth,
                    regionHeight
                );
                const blurredRegion = applyBlur(faceRegion, 40);
                ctx.putImageData(blurredRegion, startX, startY);
            } else if (obscureMode === "solid") {
                ctx.save();
                ctx.fillStyle = solidColor;
                ctx.fillRect(startX, startY, regionWidth, regionHeight);
                ctx.restore();
            } else if (obscureMode === "emoji") {
                drawEmojiOnFace(
                    ctx,
                    selectedEmoji,
                    startX,
                    startY,
                    regionWidth,
                    regionHeight
                );
            }
        } catch (err) {
            // Ignore errors for individual faces
        }
    });
    return canvas.toDataURL();
}

export function applyBlur(imageData, blurRadius) {
    const { data, width, height } = imageData;
    const blurredData = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const neighbors = [];
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const neighborIndex = (ny * width + nx) * 4;
                        neighbors.push([
                            data[neighborIndex],
                            data[neighborIndex + 1],
                            data[neighborIndex + 2],
                            data[neighborIndex + 3],
                        ]);
                    }
                }
            }
            const avg = neighbors
                .reduce(
                    (acc, val) => {
                        acc[0] += val[0];
                        acc[1] += val[1];
                        acc[2] += val[2];
                        acc[3] += val[3];
                        return acc;
                    },
                    [0, 0, 0, 0]
                )
                .map((sum) => sum / neighbors.length);
            blurredData[pixelIndex] = avg[0];
            blurredData[pixelIndex + 1] = avg[1];
            blurredData[pixelIndex + 2] = avg[2];
            blurredData[pixelIndex + 3] = avg[3];
        }
    }
    return new ImageData(blurredData, width, height);
}

export function drawEmojiOnFace(ctx, emoji, x, y, width, height) {
    ctx.save();
    const fontSize = Math.floor(height * 0.9);
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x + width / 2, y + height / 2);
    ctx.restore();
}
