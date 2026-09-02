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

## Deployment

GitHub Pages builds Jekyll from the `main` branch. The `CNAME` file configures the `madduck.tech` custom domain, and `jekyll-sitemap` generates `/sitemap.xml` during the build.
