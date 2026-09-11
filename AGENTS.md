# Repository Guidelines

This repository contains the multilingual Mad Duck website and blog. Follow these rules when writing posts or changing the site.

## Language policy

- Write repository documentation, maintenance instructions, code comments, front matter keys, commit messages, and configuration in English.
- Publish user-facing content in both Russian and English.
- Prefer natural translations over literal sentence-by-sentence translations, while preserving the same claims and meaning.
- Keep product names, code, commands, API paths, and verdict values unchanged unless a project provides an official localized form.

## Established site copy and assets

- Keep these brand statements in English in both language versions: `WE BUILD THINGS THAT PROBABLY SHOULD EXIST.`, `INDEPENDENT ENGINEERING WORKSHOP`, `AI / TOOLS / AUTOMATION / EXPERIMENTS / QUESTIONABLE IDEAS`, `IDEAS CODE DUCKS FREEDOM`, and `GOOD TOOLS, BETTER PEOPLE`.
- In Russian copy, use `Open-source`, not a translated equivalent, when referring to open-source tools.
- In project cards, retain the exact action labels `GITHUB →` and `ABOUT THE PROJECT →`.
- Use a post's `image` for its article hero and social metadata. Use `card_image` only when a Notes card deliberately needs a different crop or asset; otherwise it falls back to `image`.
- A user-approved image is an explicit exception to the default visual rules. Store it locally, optimize it, and preserve accurate language-specific alt text.

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

## Visual Design Rules

These rules preserve the Mad Duck visual identity: **editorial, monochrome, rough, technical, slightly punk, with one controlled yellow accent**.

## Core visual direction

Mad Duck should feel like a mix of:
- an independent engineering workshop;
- an underground technical magazine;
- a black-and-white print/zine;
- Swiss/editorial typography;
- rough photocopy / ink / screen-print aesthetics;
- restrained punk attitude.

It must **not** look like a generic SaaS, AI startup, Web3 landing page, or template marketplace site.

Avoid:
- glassmorphism;
- neon gradients;
- purple/blue AI aesthetics;
- soft rounded SaaS cards;
- excessive shadows;
- glossy 3D;
- colorful dashboards;
- decorative blobs;
- over-polished corporate illustrations.

## Color palette

Use almost exclusively:

```css
--black: #000000;
--white: #FFFFFF;
--paper: #F4F2EC;
--gray-dark: #222222;
--gray-mid: #777777;
--gray-light: #D8D8D8;
--yellow: #FFD400;
```

The exact off-white background may vary slightly to simulate paper, but should stay neutral.

### Accent color

There is exactly **one accent color: yellow**.

Preferred:

```css
#FFD400
```

Nearby print-like yellows are acceptable only for texture:

```text
#F6C900
#FFD21A
```

Do not introduce additional accent colors.

### Yellow usage rule

Yellow should be rare.

Use it for:
- one underline;
- one button;
- one small icon;
- one label;
- one object/detail inside an image;
- occasional hover/focus state.

Do not use yellow:
- as a full-page background;
- across many large elements at once;
- for large text blocks;
- in gradients;
- as decorative noise everywhere.

Rule of thumb: **if the page feels yellow at first glance, there is too much yellow.**

## Images

Images are primarily black-and-white.

Every editorial/project image should contain **one clearly readable yellow detail**.

Examples:
- yellow safety helmet;
- yellow sunglasses lens;
- yellow scarf;
- yellow cable;
- yellow sign;
- yellow tool;
- yellow flower;
- yellow window light;
- yellow sticker.

Do not add multiple unrelated yellow objects to one image.

The yellow detail should feel intentional, not like a random color splash.

### Mad Duck mascot

The recurring mascot is:
- a black duck;
- mischievous, confident, slightly aggressive;
- expressive;
- imperfect;
- sometimes wearing sunglasses or workwear;
- visually closer to ink illustration / rough editorial collage than polished 3D.

It may be humorous, but should not become childish or cute.

Avoid:
- Disney/DuckTales resemblance;
- photorealistic ordinary duck photography;
- generic cartoon mascot style;
- Pixar/3D rendering;
- bright multicolor feathers.

## Image treatment

Preferred:
- coarse black ink;
- halftone;
- grain;
- photocopy / xerox;
- screen print;
- newspaper photography;
- documentary black-and-white photography;
- rough cutout collage;
- imperfect hand-drawn marks.

Images may look imperfect. Do not over-clean them.

High contrast is desirable, but retain enough mid-tones so details remain readable.

## Typography

Typography should feel editorial and direct.

### Display
Use a bold condensed or heavy grotesk for large headlines.

Characteristics:
- uppercase is welcome;
- tight line-height;
- visually strong;
- large scale;
- asymmetric layouts allowed.

### Body
Use a neutral grotesk / sans-serif.

### Technical/meta text
Use monospace for:
- dates;
- categories;
- project metadata;
- version labels;
- coordinates;
- OPEN SOURCE labels;
- navigation details.

Do not use more than 2–3 font families.

## Layout

The layout should feel designed, not component-generated.

Prefer:
- strong grid;
- asymmetric compositions;
- large whitespace;
- oversized headings;
- hard horizontal rules;
- edge-to-edge black sections;
- editorial rhythm;
- occasional deliberate misalignment;
- aggressive image crops.

Avoid:
- endless equal cards;
- 3-column SaaS feature grids;
- repetitive icon + heading + paragraph blocks;
- excessive rounded containers;
- floating glass panels;
- centered everything.

Cards are allowed only when there is a strong editorial reason.

## Corners, borders and shadows

Default:

```css
border-radius: 0;
```

Small radius may be used for pills/tags only.

Prefer:
- 1px black/gray rules;
- rectangular framing;
- hard edges.

Avoid soft shadows.

Use contrast, spacing, borders, cropping, or texture to create hierarchy.

## Motion

Animations must be minimal and fast.

Allowed:
- image reveal;
- small translate on hover;
- underline expansion;
- opacity transition;
- subtle cursor-following accent;
- marquee only when justified.

Avoid:
- floating blobs;
- endless bouncing;
- large parallax;
- heavy scroll-jacking;
- animations that make the page feel like a design demo.

Motion should never compete with content.

## Buttons and links

Buttons should look like graphic editorial elements, not app UI.

Preferred:
- rectangular;
- black text on yellow;
- white text on black;
- text link + arrow;
- underline;
- thin border.

Example:

```css
.cta {
  background: #FFD400;
  color: #000;
  border: 1px solid #000;
  border-radius: 0;
  font-weight: 700;
}
```

## Content tone

The design and copy should feel:
- intelligent;
- engineering-driven;
- concise;
- slightly irreverent;
- self-aware;
- not corporate.

Avoid empty startup language such as:
- “revolutionizing the future”;
- “AI-powered innovation”;
- “unlocking potential”;
- “next-generation solutions”;
- “transforming industries”.

Prefer concrete language.

## Responsive behavior

On mobile:
- preserve large typography but scale it intelligently;
- keep the black/white/yellow identity;
- avoid turning the design into generic stacked cards;
- keep strong separators;
- allow intentional image crops;
- ensure touch targets remain usable.

Do not reduce every section into identical full-width boxes.

## Accessibility

Even with the rough visual style:
- maintain readable contrast;
- do not use yellow text on white;
- provide visible focus styles;
- provide alt text for meaningful images;
- do not rely on yellow alone to communicate state;
- respect `prefers-reduced-motion`.

## Decision checklist for agents

Before committing a visual change, ask:

1. Does this still feel black-and-white first?
2. Is yellow still only an accent?
3. Is there only one meaningful yellow detail in each image?
4. Does this feel editorial/workshop-like rather than SaaS-like?
5. Did I avoid gradients, glassmorphism and generic AI styling?
6. Are the shapes mostly hard-edged and rectangular?
7. Is the typography bold enough to carry the design?
8. Does the page still have enough empty space?
9. Does the design work without relying on animation?
10. Would this still look convincing if printed in black and white?

If several answers are “no”, redesign before shipping.

## Rule priority

When a new feature conflicts with these rules, preserve in this order:

1. readability and usability;
2. black/white editorial identity;
3. restrained yellow accent;
4. typography;
5. image treatment;
6. decorative experimentation.

The site may evolve, but it should remain recognizably **Mad Duck**.
