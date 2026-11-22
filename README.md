# Laurent Carlier’s blog

A Jekyll-powered engineering journal about software, embedded systems, and hands-on projects.

The site uses a lightweight, custom editorial design rather than a third-party theme: system fonts, responsive layouts, accessible navigation, and light or dark colors that follow the reader’s device preference. Posts remain ordinary Markdown files in `_posts`.

## Run locally

Install Ruby and Bundler, then run:

```sh
bundle install
bundle exec jekyll serve
```

Open `http://localhost:4000` to preview the site. GitHub Actions builds and publishes the site to GitHub Pages when changes are pushed to `master`.

## Syntax highlighting

Jekyll uses Rouge to highlight fenced code blocks. Put a supported language name after the opening backticks, such as `cpp`, `bash`, `yaml`, `python`, `javascript`, `nasm` (x86 assembly), or `armasm` (ARM assembly). For example:

````markdown
```cpp
int answer = 42;
```
````

Run `bundle exec rougify list` to see the language names supported by the installed version. Unknown language names and fences without a language are displayed as plain text. Rouge's assembly lexers approximate compiler output and may not recognize every dialect or instruction.

Code blocks include a copy button when JavaScript is enabled. Clipboard access requires HTTPS or localhost and browser permission; if copying fails, readers can select the code manually.

To display an optional filename on the left side of the code toolbar, add a Kramdown attribute immediately after the closing fence:

````markdown
```cpp
int answer = 42;
```
{: data-filename="myFile.cpp" }
````

Omit the attribute for a code block without a filename. The filename is not included when copying the code.

## Customize

- `_layouts/front.html` controls the home page and featured-post layout.
- `_layouts/post.html` and `_layouts/page.html` provide the article and static-page layouts.
- `_includes/header.html`, `_includes/footer.html`, and `_includes/card.html` contain shared site components.
- `assets/css/main.css` defines the visual design, responsive behavior, and color themes.
- `assets/js/copy-code.js` adds copy buttons to article code blocks.
- `_config.yml` contains the Jekyll settings and site description.
