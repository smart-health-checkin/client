/**
 * Chrome for pages this package builds.
 *
 * The header and footer are not defined here: every part of the site loads
 * /assets/site-chrome.js and /assets/smart-design.css from the apex, so
 * navigation and identity have one definition no matter which repo deployed
 * the page. This module emits the asset tags and the mount points.
 */

export const CHROME_ASSETS = `<link rel="stylesheet" href="/assets/smart-design.css">
<script src="/assets/site-chrome.js" defer></script>`;

export const header = (): string => '<div data-smart-topbar></div>';
export const footer = (): string => '<div data-smart-footer></div>';
