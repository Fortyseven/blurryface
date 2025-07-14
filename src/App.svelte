<script>
    import { onMount } from "svelte";
    import * as faceapi from "face-api.js";
    import ImageUploader from "./lib/ImageUploader.svelte";
    import ObfuscationSettings from "./lib/ObfuscationSettings.svelte";
    import ImageDisplay from "./lib/ImageDisplay.svelte";
    import { processImage } from "./lib/Obfuscation.js";

    let uploadedImage = null;
    let processedImage = null;
    let isProcessing = false;
    let minConfidence = 0.1;
    let obscureMode = "blur";
    let solidColor = "#FF0000";
    let selectedEmoji = "😎";
    let modelsLoaded = false;
    let modelLoadError = null;
    const MODELS_ROOT = "models";

    // Load all models when component mounts
    onMount(async () => {
        // Only need to prevent drag/drop defaults if not handled by child
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        window.addEventListener("dragenter", preventDefaults, false);
        window.addEventListener("dragover", preventDefaults, false);
        window.addEventListener("dragleave", preventDefaults, false);
        window.addEventListener("drop", preventDefaults, false);
        try {
            await faceapi.nets.ssdMobilenetv1.load(MODELS_ROOT);
            await faceapi.nets.faceLandmark68Net.load(MODELS_ROOT);
            await faceapi.nets.faceRecognitionNet.load(MODELS_ROOT);
            modelsLoaded = true;
        } catch (err) {
            modelLoadError = `Failed to load face detection models: ${err.message}`;
        }
        return () => {
            window.removeEventListener("dragenter", preventDefaults, false);
            window.removeEventListener("dragover", preventDefaults, false);
            window.removeEventListener("dragleave", preventDefaults, false);
            window.removeEventListener("drop", preventDefaults, false);
        };
    });

    async function handleImage(image) {
        if (!modelsLoaded) {
            alert("Face detection models are not loaded yet. Please wait or check console for errors.");
            return;
        }
        uploadedImage = image;
        isProcessing = true;
        try {
            processedImage = await processImage({
                image,
                minConfidence,
                obscureMode,
                solidColor,
                selectedEmoji,
                modelsLoaded
            });
        } catch (err) {
            alert(`Error processing image: ${err.message}`);
        } finally {
            isProcessing = false;
        }
    }

    // Removed duplicate processImage, applyBlur, drawEmojiOnFace functions. Now using imported versions from Obfuscation.js

    // Handle settings change from ObfuscationSettings
    async function handleSettings(event) {
        const changes = event.detail;
        if ("minConfidence" in changes) minConfidence = changes.minConfidence;
        if ("obscureMode" in changes) obscureMode = changes.obscureMode;
        if ("solidColor" in changes) solidColor = changes.solidColor;
        if ("selectedEmoji" in changes) selectedEmoji = changes.selectedEmoji;
        if (uploadedImage && modelsLoaded && !isProcessing) {
            isProcessing = true;
            try {
                processedImage = await processImage({
                    image: uploadedImage,
                    minConfidence,
                    obscureMode,
                    solidColor,
                    selectedEmoji,
                    modelsLoaded
                });
            } catch (err) {
                alert(`Error processing image: ${err.message}`);
            } finally {
                isProcessing = false;
            }
        }
    }
</script>

<main>
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
        <div class="error-message">{modelLoadError}</div>
    {/if}
    <ImageUploader
        {modelsLoaded}
        on:image={(e) => handleImage(e.detail.image)}
    />
    <ObfuscationSettings
        {minConfidence}
        {obscureMode}
        {solidColor}
        {selectedEmoji}
        {modelsLoaded}
        {isProcessing}
        on:settings={handleSettings}
    />
    <ImageDisplay
        {processedImage}
        {uploadedImage}
    />
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
