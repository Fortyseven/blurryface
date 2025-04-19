<script>
    import { onMount } from "svelte";
    import * as faceapi from "face-api.js";

    let uploadedImage = null;
    let processedImage = null;
    let isProcessing = false;
    let isDragOver = false;

    async function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        isProcessing = true; // Ensure spinner is shown immediately
        img.onload = async () => {
            uploadedImage = img;
            await processImage(img);
            isProcessing = false;
        };
    }

    async function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        isDragOver = false;

        const file = event.dataTransfer?.files[0];
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        isProcessing = true; // Ensure spinner is shown immediately
        img.onload = async () => {
            uploadedImage = img;
            await processImage(img);
            isProcessing = false;
        };
    }

    async function processImage(image) {
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        const detections = await faceapi.detectAllFaces(image);

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        detections.forEach((detection) => {
            const { x, y, width, height } = detection.box;
            const padding = 0.03 * Math.max(width, height); // Add 3% padding around the face
            const startX = Math.max(0, x - padding);
            const startY = Math.max(0, y - padding);
            const blurWidth = Math.min(
                canvas.width - startX,
                width + 2 * padding
            );
            const blurHeight = Math.min(
                canvas.height - startY,
                height + 2 * padding
            );

            // Extract the face region and apply a blur effect
            const faceRegion = ctx.getImageData(
                startX,
                startY,
                blurWidth,
                blurHeight
            );
            const blurredRegion = applyBlur(faceRegion, 20); // Apply a strong blur effect
            ctx.putImageData(blurredRegion, startX, startY);
        });

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

    $: if (isProcessing) {
        // Force reactivity to ensure spinner updates
        processedImage = null;
    }

    // Initialize event listeners to prevent default browser behavior
    onMount(() => {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        window.addEventListener('dragenter', preventDefaults, false);
        window.addEventListener('dragover', preventDefaults, false);
        window.addEventListener('dragleave', preventDefaults, false);
        window.addEventListener('drop', preventDefaults, false);

        return () => {
            window.removeEventListener('dragenter', preventDefaults, false);
            window.removeEventListener('dragover', preventDefaults, false);
            window.removeEventListener('dragleave', preventDefaults, false);
            window.removeEventListener('drop', preventDefaults, false);
        };
    });
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
  <h1>Face Blur Tool</h1>

  <div class="file-upload-wrapper">
    <input
      type="file"
      accept="image/*"
      on:change={handleImageUpload}
    />
  </div>

  <div
    class="drop-zone"
    class:active={isDragOver}
  >
    Drag and drop an image here
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

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
