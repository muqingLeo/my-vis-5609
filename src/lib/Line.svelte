<script lang="ts">
  import * as d3 from "d3";
  type TProps = {
    data: Array<{ x: Date; y: number }>;
    yearRange: [Date, Date] | undefined;
    width?: number;
    height?: number;
  };
  let {
    data = [],
    yearRange = $bindable(),
    height = 150,
    width = 600,
  }: TProps = $props();

  const margin = {
    top: 15,
    bottom: 50,
    left: 30,
    right: 10,
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(
    d3
      .scaleTime()
      .domain(d3.extent(data.map((d) => d.x)) as [Date, Date])
      .range([usableArea.left, usableArea.right])
  );

  const yScale = $derived(
    d3
      .scaleLinear()
      .domain(d3.extent(data.map((d) => d.y)) as [number, number])
      .range([usableArea.bottom, usableArea.top])
  );

  // tip2: this line generator will create a svg path from the data
  const lineGenerator = d3
      .line<{ x: Date; y: number }>() // ChatGPT noticed this place needs to be changed
      .x(d => xScale(d.x)) // Map x-coordinate
      .y(d => yScale(d.y)) // Map y-coordinate
      .curve(d3.curveBasis);

  const path = $derived(lineGenerator(data));

  let xAxis: any = $state(),
    yAxis: any = $state(),
    brushElement: any = $state();

  function updateAxis() {
    if (!xScale || !yScale) {
      return;
    }
    d3.select(xAxis).call(d3.axisBottom(xScale));

    d3.select(yAxis).call(d3.axisLeft(yScale));
  }

  function handleBrush(event: any) {
    // tip3: this function will be called at Brush end, and we will use it to update the yearRange
    const selection = event.selection;
    if (selection) {
        const [start, end] = selection.map(xScale.invert); // Convert from pixel values to Date
        yearRange = [start, end];
    } else {
        yearRange = undefined;
    }
  }

  function setupBrush() {
    const brush = d3
      .brushX()
      .extent([
        [usableArea.left, usableArea.top],
        [usableArea.right, usableArea.bottom],
      ])
      .on("brush end", handleBrush);

    d3.select(brushElement).call(brush);
  }

  // the $effect function is used to run a function whenever the reactive variables change, also known as a side effect
  $effect(() => {
    setupBrush();
    updateAxis();
  });
</script>

<svg {width} {height} class="line">
  <!-- tip2: add the line here, the circles can help validate your curve -->
  <!-- <path d={path} fill=xx stroke=xx stroke-width="1" /> -->
  <!-- <g class="points">
        {#each data as point (point.x)}
            <circle
                xxx
            />
        {/each}
    </g> -->
  <path d={path} fill="none" stroke="steelblue" stroke-width="2" />
  <g class="points">
        {#each data as point (point.x)}
            <circle
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r="3"
                fill="red"
            />
        {/each}
  </g>

  <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
  <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />

  <!-- tip3: add the brush here. -->
  <g class="brush" bind:this={brushElement} />

  <text x={width / 2} y={height - 5} text-anchor="middle">
    Number of Movies by Year:
  </text>
  {#if yearRange}
    <text x={width / 2} y={height - 20} text-anchor="middle">
      {yearRange[0].getFullYear()} - {yearRange[1].getFullYear()}
    </text>
  {:else}
    <text x={width / 2} y={height - 20} text-anchor="middle">
      Brush to select a range
    </text>
  {/if}
</svg>


<!-- *********************************************************************************** -->
<!-- Below is the Line.svelte belonging to A1 -->
<!-- <script lang="ts">
  import type { TMovie } from "../types";
  import * as d3 from "d3";
  // define the props of the Line component
  type Props = {
    movies: TMovie[];
    width?: number;
    height?: number;
  };

  let { movies, width = 600, height = 400 }: Props = $props();

  let selectedGenre: string = $state("");

  function getGenreTrends(movies: TMovie[]) {
    let genreCountsByYear: { [year: number]: { [genre: string]: number } } = {};
    let totalGenreCounts: { [genre: string]: number } = {};

    movies.forEach((movie) => {
      let year = movie.year.getFullYear();
      if (!genreCountsByYear[year]) genreCountsByYear[year] = {};

      movie.genres.forEach((genre) => {
        genreCountsByYear[year][genre] = (genreCountsByYear[year][genre] || 0) + 1;
        totalGenreCounts[genre] = (totalGenreCounts[genre] || 0) + 1;
      });
    });

    let topGenres = Object.entries(totalGenreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    return { genreCountsByYear, topGenres };
  }

  const genreTrends = $derived(() => getGenreTrends(movies));

  const margin = { top: 20, right: 20, bottom: 30, left: 30 };
  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(
    d3
      .scaleLinear()
      .domain(d3.extent(Object.keys(genreTrends().genreCountsByYear).map(Number)) as [number, number])
      .range([usableArea.left, usableArea.right])
  );

  const yScale = $derived(
    d3
      .scaleLinear()
      .domain([
        0,
        d3.max(Object.values(genreTrends().genreCountsByYear), (yearData) =>
          Math.max(...genreTrends().topGenres.map((genre) => yearData[genre] || 0))
        ) || 1,
      ])
      .range([usableArea.bottom, usableArea.top])
  );

  let xAxis: any = $state(),
    yAxis: any = $state();

  function updateAxis() {
    d3.select(xAxis)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    d3.select(yAxis).call(d3.axisLeft(yScale));
  }

  $effect(() => {
    updateAxis();
  });
</script>

<div class="genre-labels">
  {#each genreTrends().topGenres as genre, i}
    <div class="genre-box">
      <span class="color-box" style="background-color: {d3.schemeCategory10[i]}"></span>
      <span>{genre}</span>
    </div>
  {/each}
</div>

<h3>Top 3 Movie Genres Over Time</h3>

{#if movies.length > 0}
  <svg {width} {height}>

    {#each genreTrends().topGenres as genre}
      <path
        d={d3
            .line()
            .x((d) => xScale(d[0]))  
            .y((d) => yScale(d[1]))  
            // curveCatmullRom smoothes the line
            .curve(d3.curveCatmullRom)(
                Object.entries(genreTrends().genreCountsByYear).map(([year, data]) => [
                    +year, 
                    data[genre] || 0 
      ])
    )}
  fill="none"
  stroke={d3.schemeCategory10[genreTrends().topGenres.indexOf(genre)]}
  stroke-width="2"
/>



    {/each}

    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />


  </svg>
{/if}

<style>

  .genre-labels {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 10px;
  }

  .genre-box {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: bold;
    font-size: 18px;
  }

  .color-box {
    width: 15px;
    height: 15px;
    display: inline-block;
  }

  path {
    transition: stroke-width 0.2s ease;
  }
    text {
    font-family: Arial, sans-serif;
  }
</style> -->
