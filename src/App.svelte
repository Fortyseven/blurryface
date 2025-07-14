<script>
    import { onMount } from "svelte";
    import * as faceapi from "face-api.js";

    let uploadedImage = null;
    let processedImage = null;
    let isProcessing = false;
    let isDragOver = false;
    let minConfidence = 0.1; // Default minimum confidence threshold
    let modelsLoaded = false;
    let modelLoadError = null;
    let lastProcessedConfidence = null; // Track the last processed confidence value
    let obscureMode = "blur"; // "blur", "solid", or "emoji"
    let solidColor = "#FF0000"; // Default solid color for obscuring faces
    let selectedEmoji = "😎"; // Default emoji for emoji mode
    const MODELS_ROOT = "models";

    // Load all models when component mounts
    onMount(async () => {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        window.addEventListener("dragenter", preventDefaults, false);
        window.addEventListener("dragover", preventDefaults, false);
        window.addEventListener("dragleave", preventDefaults, false);
        window.addEventListener("drop", preventDefaults, false);

        // Preload models for faster processing
        try {
            // Load models one by one with proper error handling
            await faceapi.nets.ssdMobilenetv1.load(MODELS_ROOT);
            await faceapi.nets.faceLandmark68Net.load(MODELS_ROOT);
            await faceapi.nets.faceRecognitionNet.load(MODELS_ROOT);

            console.log("All models loaded successfully");
            modelsLoaded = true;
        } catch (err) {
            console.error("Error loading models:", err);
            modelLoadError = `Failed to load face detection models: ${err.message}`;
        }

        return () => {
            window.removeEventListener("dragenter", preventDefaults, false);
            window.removeEventListener("dragover", preventDefaults, false);
            window.removeEventListener("dragleave", preventDefaults, false);
            window.removeEventListener("drop", preventDefaults, false);
        };
    });

    async function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!modelsLoaded) {
            alert(
                "Face detection models are not loaded yet. Please wait or check console for errors."
            );
            return;
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        isProcessing = true; // Ensure spinner is shown immediately
        img.onload = async () => {
            uploadedImage = img;
            try {
                await processImage(img);
            } catch (err) {
                console.error("Error processing image:", err);
                alert(`Error processing image: ${err.message}`);
            } finally {
                isProcessing = false;
            }
        };
    }

    async function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        isDragOver = false;

        const file = event.dataTransfer?.files[0];
        if (!file) return;

        if (!modelsLoaded) {
            alert(
                "Face detection models are not loaded yet. Please wait or check console for errors."
            );
            return;
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        isProcessing = true; // Ensure spinner is shown immediately
        img.onload = async () => {
            uploadedImage = img;
            try {
                await processImage(img);
            } catch (err) {
                console.error("Error processing image:", err);
                alert(`Error processing image: ${err.message}`);
            } finally {
                isProcessing = false;
            }
        };
    }

    async function processImage(image) {
        if (!modelsLoaded) {
            throw new Error("Face detection models are not loaded yet");
        }

        // Create a canvas to get proper image orientation and dimensions
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        let detections = [];

        try {
            // First try basic face detection with the specified confidence
            detections = await faceapi.detectAllFaces(
                image,
                new faceapi.SsdMobilenetv1Options({ minConfidence })
            );

            // If we have faces, try to enhance with landmarks for better accuracy
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
                    console.warn(
                        "Could not enhance detections with landmarks:",
                        err
                    );
                    // Continue with basic detections
                }
            }

            // If no faces found with good confidence, try with lower confidence
            if (detections.length === 0) {
                detections = await faceapi.detectAllFaces(
                    image,
                    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })
                );
            }
        } catch (err) {
            console.error("Face detection error:", err);
            throw new Error(`Face detection failed: ${err.message}`);
        }

        console.log(`Detected ${detections.length} faces`);

        // Redraw on canvas for processing
        ctx.drawImage(image, 0, 0);

        // Use detections with detected box or, if using withFaceLandmarks, convert detection format
        detections.forEach((detection) => {
            try {
                // Get face box (handle both raw detections and landmark-enhanced detections)
                const box = detection.detection
                    ? detection.detection.box
                    : detection.box;
                const { x, y, width, height } = box;

                const padding = 0.1 * Math.max(width, height); // 10% padding for better coverage
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

                // Extract the face region and apply the selected obscuring effect
                if (obscureMode === "blur") {
                    const faceRegion = ctx.getImageData(
                        startX,
                        startY,
                        regionWidth,
                        regionHeight
                    );
                    const blurredRegion = applyBlur(faceRegion, 40); // Apply a strong blur effect
                    ctx.putImageData(blurredRegion, startX, startY);
                } else if (obscureMode === "solid") {
                    ctx.save();
                    ctx.fillStyle = solidColor; // Use selected solid color
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
                console.warn("Error obscuring face:", err);
            }
        });

        function drawEmojiOnFace(ctx, emoji, x, y, width, height) {
            ctx.save();
            // Set font size to fit the region (height is a good proxy)
            const fontSize = Math.floor(height * 0.9);
            ctx.font = `${fontSize}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // Center the emoji in the region
            ctx.fillText(emoji, x + width / 2, y + height / 2);
            ctx.restore();
        }
        processedImage = canvas.toDataURL();
    }

    function applyBlur(imageData, blurRadius) {
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

    // Function to handle reprocessing when slider value is released
    function handleConfidenceChange() {
        if (
            uploadedImage &&
            modelsLoaded &&
            !isProcessing &&
            minConfidence !== lastProcessedConfidence
        ) {
            lastProcessedConfidence = minConfidence;
            isProcessing = true;

            // Small delay to ensure UI updates before processing starts
            setTimeout(async () => {
                try {
                    await processImage(uploadedImage);
                } catch (err) {
                    console.error("Error reprocessing image:", err);
                } finally {
                    isProcessing = false;
                }
            }, 10);
        }
    }
    // Handler for obscure mode, color, and emoji changes
    function handleObscureSettingChange() {
        if (uploadedImage && modelsLoaded && !isProcessing) {
            processImage(uploadedImage);
        }
    }
</script>

<main
    on:dragenter={(e) => {
        e.preventDefault();
        isDragOver = true;
    }}
    on:dragover={(e) => {
        e.preventDefault();
        isDragOver = true;
    }}
    on:dragleave={(e) => {
        e.preventDefault();
        isDragOver = false;
    }}
    on:drop={handleDrop}
>
    <h1>Blurryface</h1>
    <div>
        <p>Remove faces from images automatically, privately.</p>
        <p>
            <a href="https://github.com/Fortyseven/blurryface">
                Clone this repo.
            </a>
        </p>
    </div>

    {#if modelLoadError}
        <div class="error-message">
            {modelLoadError}
        </div>
    {/if}

    <div class="file-upload-wrapper">
        <input
            type="file"
            accept="image/*"
            on:change={handleImageUpload}
            disabled={!modelsLoaded}
        />
    </div>

    <div class="settings">
        <div class="setting-group">
            <label>
                Detection sensitivity:
                <input
                    type="range"
                    bind:value={minConfidence}
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    disabled={!modelsLoaded || isProcessing}
                    on:change={handleConfidenceChange}
                />
                <span>{minConfidence.toFixed(1)}</span>
            </label>
        </div>
        <div class="setting-group">
            <label>
                Obscure mode:
<select
    bind:value={obscureMode}
    disabled={!modelsLoaded || isProcessing}
    on:change={handleObscureSettingChange}
>
    <option value="blur">Blur</option>
    <option value="solid">Solid Color</option>
    <option value="emoji">Emoji</option>
</select>            </label>
        </div>
        {#if obscureMode === "solid"}
            <div class="setting-group">
                <label>
                    Solid color:
<input
    type="color"
    bind:value={solidColor}
    disabled={!modelsLoaded || isProcessing}
    on:change={handleObscureSettingChange}
/>                </label>
            </div>
        {/if}
        {#if obscureMode === "emoji"}
            <div class="setting-group">
                <label>
                    Emoji:
<input
    type="text"
    maxlength="2"
    bind:value={selectedEmoji}
    disabled={!modelsLoaded || isProcessing}
    style="width: 2em; font-size: 2em; text-align: center;"
    on:change={handleObscureSettingChange}
/>                </label>
            </div>
        {/if}
    </div>

    <div
        class="drop-zone"
        class:active={isDragOver}
        class:disabled={!modelsLoaded}
    >
        {#if modelsLoaded}
            Drag and drop an image here
        {:else}
            Loading face detection models...
        {/if}
    </div>

    {#if processedImage}
        <h2>Processed Image</h2>
        <!-- svelte-ignore a11y_img_redundant_alt -->
        <img
            src={processedImage}
            alt="Processed Image"
        />
    {:else if uploadedImage}
        <h2>Original Image</h2>
        <!-- svelte-ignore a11y_img_redundant_alt -->
        <img
            src={uploadedImage.src}
            alt="Uploaded Image"
        />
    {/if}
    {#if isProcessing}
        <div class="spinner-overlay">
            <div class="spinner"></div>
        </div>
    {/if}
</main>

<style>
    :root {
        --color-accent: #ffaa00;
    }

    main {
        color: var(--color-accent);
        place-content: center;
    }

    img {
        max-width: 90vw;
        max-height: 90vh;
        height: auto;
        margin: 1em 0;
    }

    .drop-zone {
        border: 2px dashed #939393;
        padding: 1em;
        text-align: center;
        margin: 1em 0;
        cursor: pointer;
    }

    .drop-zone.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .drop-zone.full-page {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    .drop-zone.active {
        border-color: var(--color-accent);
    }

    .spinner-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid #fff;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    }

    .error-message {
        background-color: rgba(255, 70, 70, 0.2);
        border: 1px solid #ff4646;
        color: #ff4646;
        padding: 0.8em;
        margin: 1em 0;
        border-radius: 4px;
    }

    .settings {
        margin: 1em 0;
        padding: 1em;
        border: 1px solid #333;
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.1);
    }

    .setting-group {
        margin-bottom: 0.5em;
    }

    label {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }

    select,
    input {
        padding: 0.3em;
        border-radius: 3px;
        background-color: #222;
        color: #fff;
        border: 1px solid #555;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
