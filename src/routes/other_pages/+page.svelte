<script>
    let maxClick = $state(0) // State for maximum clicks
    let cnt = $state(0) // State for remaining clicks
    let showVideo = $state(false) // State to control video visibility

    function onClick() {
        if (cnt > 0) {
            cnt-- // Decrement the remaining clicks

            // Show the video when the last click is reached
            if (cnt == 0) {
                showVideo = true
            }
        }
    }
</script>

<h1>Muqing Liu's VIS Site</h1>

<!-- Display the image or video based on showVideo state -->
{#if !showVideo}
    <!-- svelte-ignore a11y_missing_attribute -->
    <img
        width="200px"
        src="https://cdn.britannica.com/76/4476-050-E643DD49/Betsy-Ross-legend-flag-united-states.jpg"
    />
{:else}
    <iframe
        width="200px"
        height="150px"
        src="https://youtu.be/dQw4w9WgXcQ"
        title="Rick Astley - Never Gonna Give You Up"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
    ></iframe>
{/if}

<div>
    You can click up to
    <select
        bind:value={maxClick}
        onchange={() => {
            cnt = maxClick
            showVideo = false // Reset video visibility when maxClick changes
        }}
    >
        {#each [2, 4] as optionNum}
            <option value={optionNum}>
                {optionNum}
            </option>
        {/each}
    </select>
    times
</div>
<button onclick={onClick}>Click Me</button>

<!-- Display remaining clicks or "No more clicks allowed" -->
{#if cnt > 0}
    <p id="info">Remaining Number of Clicks: {cnt}</p>
{:else}
    <p>No more clicks allowed</p>
{/if}

<style>
    body {
        font-family: Arial, Helvetica, sans-serif;
    }
    button {
        background-color: #44aa66;
        color: white;
        font-size: xx-large;
        padding: 10px 20px;
        border: none;
        cursor: pointer;
        border-radius: 5px;
    }
</style>
