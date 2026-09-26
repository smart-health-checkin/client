/** Inline SVG used by the picker. The starburst is the SMART Health IT mark. */

const STARBURST_POLYGONS =
  '<polygon fill="#722772" points="83.91 0 93.42 0 104.56 18.47 116.03 0 125.28 0 104.58 33.96"/>' +
  '<polygon fill="#e24a31" points="60.61 35.72 65.37 28.16 87.76 28.16 76.67 9.49 81.3 1.87 101.89 35.72"/>' +
  '<polygon fill="#e77d26" points="128 1.73 132.76 9.55 121.5 28.16 144.06 28.16 148.69 35.72 107.4 35.72"/>' +
  '<polygon fill="#89bf44" points="148.72 38.78 143.97 46.33 121.57 46.33 132.66 65.16 128.03 72.78 107.44 38.78"/>' +
  '<polygon fill="#f1b42a" points="81.28 72.77 76.53 64.94 87.78 46.33 65.23 46.33 60.6 38.78 101.89 38.78"/>' +
  '<polygon fill="#64aed0" points="125.46 73.22 115.89 73.22 104.68 54.63 93.14 73.22 83.82 73.22 104.66 39.04"/>';

/** The SMART starburst, square viewBox, for inline use. */
export const STARBURST_SVG = `<svg viewBox="57.0752 -11.1948 95.1696 95.1696" aria-hidden="true" focusable="false">${STARBURST_POLYGONS}</svg>`;

/** The starburst on white, as a data: URL suitable for a wallet registry's iconUrl. */
export const STARBURST_ICON_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="54 -14 101 101"><rect x="54" y="-14" width="101" height="101" fill="#fff"/>${STARBURST_POLYGONS}</svg>`,
  );

const stroke = (body: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

export const ICONS = {
  phone: stroke('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  qr: stroke('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 18v3"/>'),
  chevron: stroke('<path d="M9 5l7 7-7 7"/>', ' class="chevron"'),
  search: stroke('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>'),
  check: stroke('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="3"'),
  alert: stroke('<path d="M12 6v8M12 18v.5"/>', ' stroke-width="3"'),
  close: stroke('<path d="M6 6l12 12M18 6L6 18"/>'),
  flask: stroke('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>'),
};
