<script>
    export let processedImage = null;
    export let uploadedImage = null;

    // If both are null, nothing is shown
</script>

{#if processedImage}
    <h2>Processed Image</h2>
    <!-- svelte-ignore a11y_img_redundant_alt -->
    <img src={processedImage} alt="Processed Image" />
{:else if uploadedImage}
    <h2>Original Image</h2>
    <!-- svelte-ignore a11y_img_redundant_alt -->
    <img src={uploadedImage.src} alt="Uploaded Image" />
{/if}
