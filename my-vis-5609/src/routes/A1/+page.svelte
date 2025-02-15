<script lang="ts">
	import Heatmap from './../../lib/Heatmap.svelte';
    import * as d3 from 'd3'
    import { onMount } from 'svelte'
    import type { TMovie } from '../../types'
    // import Bar from "$lib/Bar.svelte";
    import Line from "$lib/Line.svelte";

    // Reactive variable for storing the data
    let movies: TMovie[] = []

    // Function to load the CSV
    async function loadCsv() {
        try {
            const csvUrl = './summer_movies.csv'
            movies = await d3.csv(csvUrl, (row) => {
                // TIP: in row, all values are strings, so we need to use a row conversion function here to format them
                return {
                    // ...row, // spread syntax to copy all properties from row
                    // num_votes: Number(row.num_votes),
                    // year: new Date(row.year),
                    // please also format the values for other non-string attributes. You can check the attributes in the CSV file
                  tconst: row.tconst,
                  title_type: row.title_type,
                  primary_title: row.primary_title,
                  original_title: row.original_title,
                  year: new Date(+row.year, 0, 1),
                  runtime_minutes: +row.runtime_minutes || 0,
                  genres: row.genres ? row.genres.split(",") : [],
                  average_rating: +row.average_rating || 0,
                  num_votes: +row.num_votes || 0,

                  }
            })

            console.log('Loaded CSV Data:', movies)
        } catch (error) {
            console.error('Error loading CSV:', error)
        }
    }
    // Call the loader when the component mounts
    onMount(loadCsv)
</script>

<h1>Summer Movies</h1>

<p>Here are {movies.length == 0 ? '...' : movies.length + ' '} movies</p>
<!-- <Bar {movies} /> -->
 <!-- <Line {movies} /> -->
  <Heatmap {movies} />