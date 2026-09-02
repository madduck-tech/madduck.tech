# Repository Guidelines

This repository contains the multilingual Mad Duck website and blog. Follow these rules when writing posts or changing the site.

## Language policy

- Write repository documentation, maintenance instructions, code comments, front matter keys, commit messages, and configuration in English.
- Publish user-facing content in both Russian and English.
- Prefer natural translations over literal sentence-by-sentence translations, while preserving the same claims and meaning.
- Keep product names, code, commands, API paths, and verdict values unchanged unless a project provides an official localized form.

## Blog posts

- Every post must have a Russian and an English file in `_posts/`.
- Name paired files `YYYY-MM-DD-slug.ru.md` and `YYYY-MM-DD-slug.en.md`.
- Use a short, lowercase, ASCII slug with words separated by hyphens. Prefer the product or subject name when it is unambiguous.
- Use the same `translation_key`, publication date, image, and slug for both translations.
- Set explicit permalinks. Russian posts use `/blog/<slug>/`; English posts use `/en/blog/<slug>/`.
- Set `alternate_url` to the matching translation, not to a blog index or homepage.
- Do not add dates to public post URLs.
- Do not add a Reddit link, source attribution, or Reddit metadata to the Gopnik article unless the repository owner explicitly requests it.

Every post must define this front matter:

```yaml
---
lang: en
translation_key: example
title: A clear, specific title
description: A concise summary for cards and search results.
date: 2026-01-01 12:00:00 +0000
date_label: January 1, 2026
category: Tools
permalink: /en/blog/example/
alternate_url: /blog/example/
image: /assets/images/example.png
image_alt: A meaningful description of the image
---
```

- Write one `h1` through front matter; begin headings in post content at `##`.
- Keep descriptions accurate and under roughly 160 characters when practical.
- Use descriptive link text. Do not use “click here.”
- Verify every external URL and prefer the current canonical project URL.
- Open external links only when the existing site pattern requires it. Do not add `target="_blank"` by default.
- Store editorial images under `assets/images/`. Do not hotlink images from social networks or third-party CDNs.
- Provide useful alt text for meaningful images and empty alt text only for decorative images.
- Avoid copying comments, engagement metrics, tracking parameters, or platform-specific calls to action into adapted articles.
- Use fenced code blocks with a language identifier such as `text`, `sh`, or `json`.

## Site changes

- Keep the site compatible with GitHub Pages and the `github-pages` gem.
- Reuse `_layouts`, `_includes`, and `_data/i18n.yml` instead of duplicating page markup.
- Add or change interface copy in both `ru` and `en` sections of `_data/i18n.yml`.
- Preserve the URL policy: Russian at `/`, English under `/en/`.
- Ensure language switches point to equivalent content and maintain matching `hreflang` links.
- Preserve semantic HTML, keyboard navigation, visible focus states, responsive behavior, and reduced-motion support.
- Do not add JavaScript for behavior that HTML and CSS can provide reliably.
- Keep assets local when licensing permits and optimize large images before publishing.
- Do not edit `_site/`; it is generated output.
- Do not add `.nojekyll`; GitHub Pages must process the site with Jekyll.

## Verification

Before considering a change complete:

1. Run `bundle exec jekyll build`.
2. Confirm that Jekyll reports no Liquid, YAML, or Markdown errors.
3. Check both language routes and every changed post route.
4. Check paired `alternate_url`, canonical, and `hreflang` values.
5. Verify changed internal and external links.
6. Inspect affected pages at desktop and mobile widths.
7. Confirm that generated files such as `_site/` are not committed.
