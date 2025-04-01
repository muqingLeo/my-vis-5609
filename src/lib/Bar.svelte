<script lang="ts">
  import type { TMovie } from "../types"; // Keep this import path as it's working for you
  import * as d3 from "d3";
  // define the props of the Bar component
  type Props = {
    movies: TMovie[];
    progress?: number;
    width?: number;
    height?: number;
  };
  // progress is 100 by default unless specified
  let { movies, progress = 100, width = 500, height = 400 }: Props = $props();

  let selectedGenre: string = $state("");
  let showComparison: boolean = $state(true); // Toggle for comparison view
  let comparisonYearRange: number = $state(10); // Default to 10 years, now customizable

  // processing the data; $derived is used to create a reactive variable that updates whenever the dependent variables change
  const yearRange = $derived(d3.extent(movies.map((d) => d.year)));

  function getUpYear(yearRange: [undefined, undefined] | [Date, Date]) {
    if (!yearRange[0]) return new Date();
    const timeScale = d3.scaleTime().domain(yearRange).range([0, 100]);
    return timeScale.invert(progress);
  }
  const upYear: Date = $derived(getUpYear(yearRange!));
  
  // Calculate a comparison year (customizable years before current)
  function getComparisonYear(currentYear: Date, yearRange: [undefined, undefined] | [Date, Date]) {
    if (!yearRange[0]) return new Date();
    
    // Get date X years before current year based on the slider value
    const targetYear = new Date(currentYear);
    targetYear.setFullYear(currentYear.getFullYear() - comparisonYearRange);
    
    // Make sure we don't go earlier than our earliest data
    if (yearRange[0] && targetYear < yearRange[0]) {
      return yearRange[0];
    }
    
    return targetYear;
  }
  
  const comparisonYear: Date = $derived(getComparisonYear(upYear, yearRange));

  function getGenreNums(movies: TMovie[], upYear: Date) {
    let res: { [genre: string]: number } = {};
    movies
      .filter((movie) => movie.year <= upYear)
      .forEach((movie) => {
        movie.genres.forEach((genre: string) => {
          res[genre] = (res[genre] || 0) + 1;
        });
      });
    return res;
  }

  const genreNums = $derived(getGenreNums(movies, upYear));
  const comparisonGenreNums = $derived(getGenreNums(movies, comparisonYear));

  // Get all unique genres for consistent ordering
  function getAllGenres(): string[] {
    const genres = new Set<string>();
    movies.forEach(movie => {
      movie.genres.forEach((genre: string) => genres.add(genre));
    });
    return Array.from(genres).sort();
  }
  
  const allGenres = $derived(getAllGenres());

  // Calculate growth percentages
  function calculateGrowth(): { [genre: string]: number } {
    const growth: { [genre: string]: number } = {};
    
    allGenres.forEach((genre: string) => {
      const current = genreNums[genre] || 0;
      const past = comparisonGenreNums[genre] || 0;
      
      // Calculate percentage growth (handle division by zero)
      if (past === 0) {
        growth[genre] = current > 0 ? 100 : 0; // 100% growth if new genre
      } else {
        growth[genre] = ((current - past) / past) * 100;
      }
    });
    
    return growth;
  }
  
  const genreGrowth = $derived(calculateGrowth());

  // drawing the bar chart
  const margin = {
    top: 15,
    bottom: 50,
    left: 60, // Increased left margin for labels
    right: 150, // Increased right margin for comparison legend
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(
    d3.scaleBand()
      .range([usableArea.left, usableArea.right])
      .domain(allGenres)
      .padding(0.2)
  );

  // Dynamic max value for y-scale
  function getYMax(): number {
    const currentMax = d3.max(Object.values(genreNums)) || 1;
    const comparisonMax = d3.max(Object.values(comparisonGenreNums)) || 1;
    return Math.max(currentMax, comparisonMax) * 1.1; // Add 10% padding
  }
  
  const yMax = $derived(getYMax());

  const yScale = $derived(
    d3.scaleLinear()
      .range([usableArea.bottom, usableArea.top])
      .domain([0, yMax])
  );

  // Color scale for growth indicators
  const growthColorScale = $derived(
    d3.scaleSequential()
      .domain([-50, 50])
      .interpolator(d3.interpolateRdYlGn) // Red-Yellow-Green scale
  );

  const xBarwidth: number = $derived(xScale.bandwidth());

  let xAxis: any = $state(),
    yAxis: any = $state();

  function updateAxis() {
    d3.select(xAxis)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    d3.select(yAxis)
      .call(d3.axisLeft(yScale));
  }

  // the $effect function is used to run a function whenever the reactive variables change, also known as a side effect
  $effect(() => {
    updateAxis();
  });

  // Format date for display
  function formatYear(date: Date): string {
    return date.getFullYear().toString();
  }
</script>

<div class="chart-container">
  <h3>
    Genre Distribution {formatYear(upYear)}
    {#if showComparison}
      vs {formatYear(comparisonYear)}
    {/if}
  </h3>

  <div class="controls-container">
    <div class="toggle-container">
      <label>
        <input type="checkbox" bind:checked={showComparison} />
        Show comparison with past years
      </label>
    </div>
    
    {#if showComparison}
      <div class="range-container">
        <label for="year-range">Comparison range: {comparisonYearRange} years</label>
        <input 
          type="range" 
          id="year-range" 
          min="1" 
          max="30" 
          step="1" 
          bind:value={comparisonYearRange}
        />
      </div>
    {/if}
  </div>

  {#if movies.length > 0}
    <svg {width} {height}>
      <g class="bars">
        {#each allGenres as genre}
          {@const currentCount = genreNums[genre] || 0}
          {@const pastCount = comparisonGenreNums[genre] || 0}
          {@const growth = genreGrowth[genre] || 0}
          
          <g class={genre}>
            <!-- Current year bar -->
            <rect
              width={xBarwidth}
              height={yScale(0) - yScale(currentCount)}
              x={xScale(genre)}
              y={yScale(currentCount)}
              fill="#449900"
              class="bar"
              opacity={selectedGenre === genre ? 1 : 0.8}
              onmouseover={() => {
                selectedGenre = genre;
              }}
              onmouseout={() => {
                selectedGenre = "";
              }}
            />

            <!-- Past year comparison bar (if showing comparison) -->
            {#if showComparison && pastCount > 0}
              <rect
                width={xBarwidth / 2}
                height={yScale(0) - yScale(pastCount)}
                x={xScale(genre)! + xBarwidth / 2}
                y={yScale(pastCount)}
                fill="#8B4513"
                class="bar comparison"
                opacity={0.6}
              />
            {/if}

            <!-- Growth indicator -->
            {#if showComparison && growth !== 0}
              <rect
                x={xScale(genre)! + xBarwidth + 5}
                y={yScale(Math.max(currentCount, pastCount))}
                width={5}
                height={10}
                fill={growthColorScale(growth)}
              />
              
              <text
                x={xScale(genre)! + xBarwidth + 15}
                y={yScale(Math.max(currentCount, pastCount)) + 5}
                font-size="10"
                fill={growth > 0 ? "#008800" : "#880000"}
                opacity={selectedGenre === genre ? 1 : 0.7}
              >
                {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
              </text>
            {/if}

            <!-- Count label -->
            <text
              x={xScale(genre)! + xBarwidth / 2}
              y={yScale(currentCount) - 5}
              font-size="12"
              text-anchor="middle"
              opacity={selectedGenre === genre ? 1 : 0}
            >
              {currentCount}
            </text>
          </g>
        {/each}
      </g>

      <!-- Legend -->
      {#if showComparison}
        <g class="legend" transform="translate({usableArea.right + 10}, {usableArea.top + 20})">
          <rect width={15} height={15} fill="#449900" opacity={0.8} />
          <text x={20} y={12}>Current ({formatYear(upYear)})</text>
          
          <rect width={15} height={15} y={25} fill="#8B4513" opacity={0.6} />
          <text x={20} y={37}>Past ({formatYear(comparisonYear)})</text>
          
          <text x={0} y={65} font-weight="bold">Growth Rate:</text>
          <rect width={15} height={15} y={75} fill={growthColorScale(-30)} />
          <text x={20} y={87}>Decline</text>
          
          <rect width={15} height={15} y={100} fill={growthColorScale(30)} />
          <text x={20} y={112}>Growth</text>
        </g>
      {/if}

      <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
      <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
    </svg>
  {/if}
</div>

<style>
  .chart-container {
    font-family: Arial, sans-serif;
  }
  
  .controls-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .toggle-container {
    margin-bottom: 5px;
  }
  
  .range-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .bar {
    transition:
      y 0.5s ease,
      height 0.5s ease,
      width 0.5s ease,
      opacity 0.3s ease;
  }
  
  .bar.comparison {
    transition:
      y 0.5s ease,
      height 0.5s ease,
      width 0.5s ease;
  }
</style>