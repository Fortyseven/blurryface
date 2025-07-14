<script>
    import { createEventDispatcher } from "svelte";
    let isDragOver = false;
    const dispatch = createEventDispatcher();
    let modelsLoaded = true;

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                dispatch("image", { image: img });
            };
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        isDragOver = false;
        const file = event.dataTransfer?.files[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                dispatch("image", { image: img });
            };
        }
    }
</script>

<div class="file-upload-wrapper">
    <input
        type="file"
        accept="image/*"
        on:change={handleImageUpload}
        disabled={!modelsLoaded}
    />
</div>
<div
    class="drop-zone"
    class:active={isDragOver}
    class:disabled={!modelsLoaded}
    on:dragenter={(e) => { e.preventDefault(); isDragOver = true; }}
    on:dragover={(e) => { e.preventDefault(); isDragOver = true; }}
    on:dragleave={(e) => { e.preventDefault(); isDragOver = false; }}
    on:drop={handleDrop}
>
    {#if modelsLoaded}
        Drag and drop an image here
    {:else}
        Loading face detection models...
    {/if}
</div>
