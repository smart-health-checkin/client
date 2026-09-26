// "Tell us how it went": a plain link to the connectathon's share page, with a
// short note about what was just tried. Not a structured report.
export function showShareLink(link: HTMLElement | null, from: string, result: string): void {
  if (!(link instanceof HTMLAnchorElement)) return;
  const params = new URLSearchParams({ from, result, time: new Date().toISOString() });
  link.href = `https://smart-health-checkin.org/connectathon/share.html#${params}`;
  link.hidden = false;
}
