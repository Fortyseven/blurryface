<script>
    import { createEventDispatcher } from "svelte";
    export let minConfidence = 0.1;
    export let obscureMode = "blur";
    export let solidColor = "#FF0000";
    export let selectedEmoji = "😎";
    export let modelsLoaded = true;
    export let isProcessing = false;
    const dispatch = createEventDispatcher();

    function handleConfidenceChange(e) {
        dispatch("settings", { minConfidence: +e.target.value });
    }
    function handleObscureModeChange(e) {
        dispatch("settings", { obscureMode: e.target.value });
    }
    function handleSolidColorChange(e) {
        dispatch("settings", { solidColor: e.target.value });
    }
    function handleEmojiChange(e) {
        dispatch("settings", { selectedEmoji: e.target.value });
    }
</script>

<div class="settings">
    <div class="setting-group">
        <label>
            Detection sensitivity:
            <input
                type="range"
                value={minConfidence}
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
                value={obscureMode}
                disabled={!modelsLoaded || isProcessing}
                on:change={handleObscureModeChange}
            >
                <option value="blur">Blur</option>
                <option value="solid">Solid Color</option>
                <option value="emoji">Emoji</option>
            </select>
        </label>
    </div>
    {#if obscureMode === "solid"}
        <div class="setting-group">
            <label>
                Solid color:
                <input
                    type="color"
                    value={solidColor}
                    disabled={!modelsLoaded || isProcessing}
                    on:change={handleSolidColorChange}
                />
            </label>
        </div>
    {/if}
    {#if obscureMode === "emoji"}
        <div class="setting-group">
            <label>
                Emoji:
                <input
                    type="text"
                    maxlength="2"
                    value={selectedEmoji}
                    disabled={!modelsLoaded || isProcessing}
                    style="width: 2em; font-size: 2em; text-align: center;"
                    on:change={handleEmojiChange}
                />
            </label>
        </div>
    {/if}
</div>
