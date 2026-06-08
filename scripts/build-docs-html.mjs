import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';

const root = resolve('.');
const generatedAt = new Date().toISOString().slice(0, 10);
const rootMarkdownFiles = ['README.md', 'AGENTS.md'];
const docsDir = join(root, 'docs');

const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.vite', 'work']);

function walkMarkdown(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walkMarkdown(join(dir, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(join(dir, entry.name));
    }
  }

  return files;
}

const markdownFiles = [
  ...rootMarkdownFiles
    .map((file) => join(root, file))
    .filter((file) => existsSync(file)),
  ...walkMarkdown(docsDir),
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function outputPathFor(markdownPath) {
  return markdownPath.replace(/\.md$/i, '.html');
}

function linkHref(sourceHref) {
  if (/^(https?:|mailto:|#)/i.test(sourceHref)) {
    return sourceHref;
  }

  return sourceHref.replace(/\.md($|#)/i, '.html$1');
}

function inlineMarkdown(value) {
  const codeParts = [];
  let text = value.replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeParts.length}\u0000`;
    codeParts.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  text = escapeHtml(text);
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeHtml(linkHref(href))}">${label}</a>`;
  });

  for (let index = 0; index < codeParts.length; index += 1) {
    text = text.replace(`\u0000CODE${index}\u0000`, codeParts[index]);
  }

  return text;
}

function isTableDelimiter(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function closeOpenBlocks(state, html) {
  if (state.list) {
    html.push(`</${state.list}>`);
    state.list = null;
  }

  if (state.blockquote) {
    html.push('</blockquote>');
    state.blockquote = false;
  }
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const state = {
    list: null,
    blockquote: false,
    code: false,
    codeLanguage: '',
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().startsWith('```')) {
      if (state.code) {
        html.push('</code></pre>');
        state.code = false;
        state.codeLanguage = '';
      } else {
        closeOpenBlocks(state, html);
        state.code = true;
        state.codeLanguage = line.trim().slice(3).trim();
        const languageClass = state.codeLanguage ? ` class="language-${escapeHtml(state.codeLanguage)}"` : '';
        html.push(`<pre><code${languageClass}>`);
      }
      continue;
    }

    if (state.code) {
      html.push(`${escapeHtml(line)}\n`);
      continue;
    }

    if (!line.trim()) {
      closeOpenBlocks(state, html);
      continue;
    }

    if (line.includes('|') && lines[index + 1] && isTableDelimiter(lines[index + 1])) {
      closeOpenBlocks(state, html);
      const header = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;

      html.push('<table>');
      html.push('<thead><tr>');
      for (const cell of header) {
        html.push(`<th>${inlineMarkdown(cell)}</th>`);
      }
      html.push('</tr></thead>');
      html.push('<tbody>');
      for (const row of rows) {
        html.push('<tr>');
        for (const cell of row) {
          html.push(`<td>${inlineMarkdown(cell)}</td>`);
        }
        html.push('</tr>');
      }
      html.push('</tbody></table>');
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      closeOpenBlocks(state, html);
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    const blockquote = /^>\s?(.*)$/.exec(line);
    if (blockquote) {
      if (!state.blockquote) {
        closeOpenBlocks(state, html);
        html.push('<blockquote>');
        state.blockquote = true;
      }
      html.push(`<p>${inlineMarkdown(blockquote[1])}</p>`);
      continue;
    }

    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      if (state.list !== 'ul') {
        closeOpenBlocks(state, html);
        html.push('<ul>');
        state.list = 'ul';
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      if (state.list !== 'ol') {
        closeOpenBlocks(state, html);
        html.push('<ol>');
        state.list = 'ol';
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    closeOpenBlocks(state, html);
    html.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  }

  closeOpenBlocks(state, html);

  if (state.code) {
    html.push('</code></pre>');
  }

  return html.join('\n');
}

function titleFromMarkdown(markdown, fallback) {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : fallback;
}

function relativeSourceLink(htmlPath, markdownPath) {
  return basename(markdownPath);
}

function pageTemplate({ title, body, markdownPath, htmlPath }) {
  const sourceLink = relativeSourceLink(htmlPath, markdownPath);
  const relPath = relative(root, markdownPath).split(sep).join('/');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ef;
      --paper: #fffdf8;
      --ink: #211d1a;
      --muted: #625b52;
      --line: #ddd2c3;
      --code: #2a2723;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.58;
    }
    main {
      max-width: 980px;
      margin: 0 auto;
      padding: 30px 20px 70px;
    }
    article {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--paper);
      padding: 26px;
      box-shadow: 0 12px 30px rgba(45, 35, 20, 0.08);
    }
    .generated {
      border-left: 5px solid #2866a8;
      background: #eef5fb;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 24px;
      color: var(--muted);
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.2;
      margin: 1.35em 0 0.5em;
    }
    h1 { margin-top: 0; font-size: clamp(2rem, 4vw, 3rem); }
    h2 { border-bottom: 2px solid var(--line); padding-bottom: 0.3em; }
    p { margin: 0 0 1em; }
    a { color: #245d96; }
    code, pre { font-family: "Cascadia Code", Consolas, Monaco, "Courier New", monospace; }
    code { background: #eee7dc; border-radius: 4px; padding: 0.12em 0.3em; }
    pre {
      overflow-x: auto;
      color: var(--paper);
      background: var(--code);
      padding: 14px 16px;
      border-radius: 6px;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px;
      background: var(--paper);
      border: 1px solid var(--line);
    }
    th, td {
      border: 1px solid var(--line);
      padding: 9px 11px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #efe7dc; }
    blockquote {
      margin: 1em 0;
      border-left: 5px solid #c57d1c;
      background: #fbf3e6;
      padding: 10px 14px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main>
    <article>
      <div class="generated">
        Generated from <a href="${escapeHtml(sourceLink)}">${escapeHtml(relPath)}</a> on ${generatedAt}.
        Edit the markdown source, then run <code>npm run docs:html</code>.
      </div>
${body}
    </article>
  </main>
</body>
</html>
`;
}

function writeGeneratedPage(markdownPath) {
  const markdown = readFileSync(markdownPath, 'utf8');
  const htmlPath = outputPathFor(markdownPath);
  const title = titleFromMarkdown(markdown, basename(markdownPath, '.md'));
  const body = renderMarkdown(markdown);
  mkdirSync(dirname(htmlPath), { recursive: true });
  writeFileSync(htmlPath, pageTemplate({ title, body, markdownPath, htmlPath }), 'utf8');
  return { title, htmlPath, markdownPath };
}

function indexPathFor(htmlPath) {
  return relative(join(root, 'docs'), htmlPath).split(sep).join('/');
}

function writeDocsIndex(pages) {
  const rows = pages
    .sort((a, b) => relative(root, a.markdownPath).localeCompare(relative(root, b.markdownPath)))
    .map((page) => {
      const relMarkdown = relative(root, page.markdownPath).split(sep).join('/');
      const relHtml = indexPathFor(page.htmlPath);
      return `<tr><td><a href="${escapeHtml(relHtml)}">${escapeHtml(page.title)}</a></td><td><code>${escapeHtml(relMarkdown)}</code></td></tr>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gravity Canyon Docs</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ef;
      --paper: #fffdf8;
      --ink: #211d1a;
      --muted: #625b52;
      --line: #ddd2c3;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
    }
    main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 70px; }
    header, section {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--paper);
      padding: 24px;
      margin-bottom: 18px;
      box-shadow: 0 12px 30px rgba(45, 35, 20, 0.08);
    }
    h1, h2 { line-height: 1.15; margin: 0 0 12px; }
    h1 { font-size: clamp(2rem, 4vw, 3rem); }
    a { color: #245d96; }
    code { background: #eee7dc; border-radius: 4px; padding: 0.12em 0.3em; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #efe7dc; }
    .callout {
      border-left: 5px solid #b63d3d;
      background: #fbefed;
      padding: 12px 14px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Gravity Canyon documentation</p>
      <h1>Docs Index</h1>
      <p>This page links the locked v1 HTML contract and generated HTML reading copies of the markdown docs.</p>
      <p class="callout"><strong>V1 authority:</strong> <a href="V1_PLAYTEST_ALPHA.html">V1 Playtest Alpha Contract</a></p>
    </header>
    <section>
      <h2>Generated Markdown Reading Copies</h2>
      <p>Generated on ${generatedAt}. Edit markdown sources, then run <code>npm run docs:html</code>.</p>
      <table>
        <thead><tr><th>HTML Page</th><th>Markdown Source</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;

  writeFileSync(join(root, 'docs', 'index.html'), html, 'utf8');
}

const pages = markdownFiles.map(writeGeneratedPage);
writeDocsIndex(pages);

console.log(`Generated ${pages.length} markdown HTML pages and docs/index.html.`);
