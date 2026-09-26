/**
 * The tutorial's finished page, served as a demo. It is cut from the
 * "## The whole page" block of docs/tutorial.md, so the demo is exactly
 * what the tutorial tells you to save.
 *   bun scripts/tutorial-page.ts <outFile>
 */
const out = process.argv[2] ?? "_site/demo/tutorial.html";
const md = await Bun.file(new URL("../docs/tutorial.md", import.meta.url)).text();
const section = md.split(/^## The whole page$/m)[1];
const html = section?.match(/```html\n([\s\S]*?)\n```/)?.[1];
if (!html?.startsWith("<!doctype html>")) throw new Error("docs/tutorial.md: no complete page under '## The whole page'");
await Bun.write(out, html + "\n");
