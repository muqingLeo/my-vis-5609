import adapter from '@sveltejs/adapter-static'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            fallback: '404.html',
        }),
        paths: {
            base: process.argv.includes('dev') ? '' : '/my-vis-5609', // Change 'my-vis-5609' to match your GitHub repo name
        },
        alias: {
            $lib: 'src/lib',
        },
    },
}

export default config
