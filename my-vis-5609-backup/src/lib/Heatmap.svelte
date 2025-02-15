<script lang="ts">
  import type { TMovie } from "../types";
  import * as d3 from "d3";

  type Props = {
    movies: TMovie[];
    width?: number;
    height?: number;
  };

  let { movies, width = 500, height = 500 }: Props = $props();

  let selectedPair: string = $state("");

  function getGenrePairs(movies: TMovie[]) {
    let pairCounts: { [pair: string]: number } = {};
    let genreSet: Set<string> = new Set();

    movies.forEach((movie) => {
      movie.genres.forEach((g1, i) => {
        genreSet.add(g1);
        movie.genres.slice(i + 1).forEach((g2) => {
          const key = g1 < g2 ? `${g1}-${g2}` : `${g2}-${g1}`;
          pairCounts[key] = (pairCounts[key] || 0) + 1;
        });
      });
    });

    let genres = Array.from(genreSet);
    return { pairCounts, genres };
  }

  const genrePairsData = $derived(() => getGenrePairs(movies));
  const pairCounts = $derived(() => genrePairsData().pairCounts);
  const genres = $derived(() => genrePairsData().genres);

  const margin = { top: 15, bottom: 50, left: 80, right: 120 };
  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(() =>
    d3.scaleBand()
      .range([usableArea.left, usableArea.right])
      .domain(genres())
      .padding(0.1)
  );

  const yScale = $derived(() =>
    d3.scaleBand()
      .range([usableArea.bottom, usableArea.top])
      .domain(genres())
      .padding(0.1)
  );

  const maxCount = $derived(() => d3.max(Object.values(pairCounts())) || 1);

  const colorScale = $derived(() =>
    d3.scaleSequential(d3.interpolateOranges)
      .domain([0, maxCount()])
  );

  let xAxis: any = $state(),
      yAxis: any = $state();

  function updateAxis() {
    d3.select(xAxis)
      .call(d3.axisBottom(xScale()))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    d3.select(yAxis).call(d3.axisLeft(yScale()));
  }

  $effect(() => {
    updateAxis();
  });
</script>

<h3>Genre Co-occurrence Heatmap</h3>

{#if movies.length > 0}
  <svg {width} {height}>
    <!-- initiate the gradient bar, 25% as a unit -->
    <defs>
      <linearGradient id="colorGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" style="stop-color:{colorScale()(0)}; stop-opacity:1" />
        <stop offset="25%" style="stop-color:{colorScale()(maxCount() * 0.25)}; stop-opacity:1" />
        <stop offset="50%" style="stop-color:{colorScale()(maxCount() * 0.50)}; stop-opacity:1" />
        <stop offset="75%" style="stop-color:{colorScale()(maxCount() * 0.75)}; stop-opacity:1" />
        <stop offset="100%" style="stop-color:{colorScale()(maxCount())}; stop-opacity:1" />
      </linearGradient>
    </defs>

    <!-- Heatmap Grid -->
    <g class="heatmap">
      {#each Object.entries(pairCounts()) as [pair, count]}
        {#if count > 0}
          {#each pair.split("-") as genre1, i}
            {#if i === 0}
              <rect
                width={xScale().bandwidth()}
                height={yScale().bandwidth()}
                x={xScale()(pair.split("-")[0])}
                y={yScale()(pair.split("-")[1])}
                fill={colorScale()(count)}
                stroke="black"
                class="heatmap-cell"
                opacity={selectedPair === pair ? 1 : 0.8}
                onmouseover={() => { selectedPair = pair; }}
                onmouseout={() => { selectedPair = ""; }}
              />
              
              <text
                x={xScale()(genre1)! + xScale().bandwidth() / 2}
                y={yScale()(pair.split("-")[1])! + yScale().bandwidth() / 2}
                font-size="12"
                text-anchor="middle"
                opacity={selectedPair === pair ? 1 : 0}
              >
                {count}
              </text>
            {/if}
          {/each}
        {/if}
      {/each}
    </g>

    <!-- X & Y scales -->
    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />

    <g transform="translate({width - 100}, {height / 4})">
      <text x="0" y="-10" font-size="14" font-weight="bold">Co-occurrence Scale</text>

      <!-- The gradient scale bar -->
      <rect x="0" y="0" width="25" height="150" fill="url(#colorGradient)" stroke="black" />

      <!-- Scale with intermediate labels -->
      {#each [0, 0.25, 0.50, 0.75, 1] as fraction, i}
        <text x="35" y={150 - i * 35} font-size="12" text-anchor="start">
          {Math.round(maxCount() * fraction)}
        </text>
      {/each}
    </g>

  </svg>
{/if}

<style>
  .heatmap-cell {
    transition: opacity 0.2s ease;
  }

  text {
    font-family: Arial, sans-serif;
  }
</style>
