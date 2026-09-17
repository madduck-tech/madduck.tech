# madduck.tech

The multilingual Mad Duck website and blog, built with Jekyll and hosted on GitHub Pages.

## Requirements

- Ruby 3.3
- Bundler

Install the dependencies:

```sh
bundle install
```

## Local development

Run the development server:

```sh
bundle exec jekyll serve --livereload
```

Open <http://127.0.0.1:4000>. The Russian homepage is served at `/`, and the English homepage is served at `/en/`.

Build the production site without starting a server:

```sh
JEKYLL_ENV=production bundle exec jekyll build
```

The generated site is written to `_site/`. Never edit that directory directly.

## Project structure

```text
_data/i18n.yml       Shared Russian and English interface copy
_includes/           Reusable header, footer, and illustration fragments
_layouts/            Base, homepage, and blog post templates
_posts/              Russian and English Markdown posts
assets/images/       Locally hosted editorial images
en/index.md          English homepage
index.md             Russian homepage
styles.css           Shared site styles
```

## Publishing a blog post

Every article must have both Russian and English versions. Use the same date, slug, and `translation_key` in both filenames and front matter.

```text
_posts/YYYY-MM-DD-example.ru.md
_posts/YYYY-MM-DD-example.en.md
```

Set explicit language-specific permalinks:

```yaml
# Russian
permalink: /blog/example/
alternate_url: /en/blog/example/

# English
permalink: /en/blog/example/
alternate_url: /blog/example/
```

See [AGENTS.md](AGENTS.md) for the complete editorial and site maintenance rules.

## DOOM fly experiment

The standalone scene is available at `/experiments/doom-drodrosophila/` and
`/en/experiments/doom-drodrosophila/`. Its local assets and license records are in
`assets/experiments/doom-drodrosophila/`. Blender asset work must use Blender MCP.

Run the scene and navigation regressions from the repository root with Node.js 22.18 or newer:

```sh
node --test _tools/doom-drodrosophila/*.test.mjs
bundle exec jekyll build
python3 -m http.server 4174 --directory _site --bind 127.0.0.1
```

For browser checks, pass `_tools/doom-drodrosophila/playwright-checks.js` to Playwright
MCP's `browser_run_code_unsafe` tool using its `filename` argument. The `?debug`
query exposes a read-only `window.flyLab.snapshot()` for diagnostics.

The baked navigation JSON is committed; normal builds do not need a WAD or Blender.
To regenerate it, run `node _tools/doom-drodrosophila/build-navigation.mjs /path/to/DOOM1.WAD`
with the matching E1M1 shareware reference. Do not publish the WAD or source blend files.

## Deployment

GitHub Pages builds Jekyll from the `main` branch. The `CNAME` file configures the `madduck.tech` custom domain, and `jekyll-sitemap` generates `/sitemap.xml` during the build.
