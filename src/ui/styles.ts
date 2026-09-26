/**
 * The picker's stylesheet. Every visual choice reads a public custom property
 * with a SMART default, so a page reskins it by setting variables on the
 * element (or any ancestor):
 *
 *   smart-checkin-picker {
 *     --smart-checkin-accent: #205E9B;
 *     --smart-checkin-radius: 24px;
 *     --smart-checkin-font: "Source Sans 3", sans-serif;
 *   }
 *
 * Parts (`::part(...)`) are exposed for anything the variables don't cover.
 */
export const PICKER_CSS = `
:host {
  --_font: var(--smart-checkin-font, Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --_text: var(--smart-checkin-text, #1F2933);
  --_text-2: var(--smart-checkin-text-muted, #4B5563);
  --_text-3: var(--smart-checkin-text-faint, #7B8794);
  --_surface: var(--smart-checkin-surface, #FFFFFF);
  --_row: var(--smart-checkin-row, #FFFFFF);
  --_border: var(--smart-checkin-border, #E4E7EB);
  --_icon-bg: var(--smart-checkin-icon-background, #FFFFFF);
  --_accent: var(--smart-checkin-accent, #0E6FB8);
  --_accent-hover: var(--smart-checkin-accent-hover, #094D80);
  --_on-accent: var(--smart-checkin-on-accent, #FFFFFF);
  --_ok: var(--smart-checkin-success, #1A8C76);
  --_warn: var(--smart-checkin-warning, #B85C17);
  --_radius: var(--smart-checkin-radius, 10px);
  --_radius-lg: var(--smart-checkin-radius-large, 14px);
  --_icon-radius: var(--smart-checkin-icon-radius, 9px);
  --_card-border: var(--smart-checkin-card-border, 1px solid var(--_border));
  --_card-padding: var(--smart-checkin-card-padding, 16px);
  --_focus: var(--smart-checkin-focus, var(--_accent));
  display: block;
  font-family: var(--_font);
  color: var(--_text);
  -webkit-text-size-adjust: 100%;
}
:host([theme="dark"]) {
  --_text: var(--smart-checkin-text, #E6EAEF);
  --_text-2: var(--smart-checkin-text-muted, #B4BDC7);
  --_text-3: var(--smart-checkin-text-faint, #8894A1);
  --_surface: var(--smart-checkin-surface, #1A212B);
  --_row: var(--smart-checkin-row, #202834);
  --_border: var(--smart-checkin-border, #313C4A);
  --_icon-bg: var(--smart-checkin-icon-background, #F6F8FA);
  --_accent: var(--smart-checkin-accent, #3D9BDA);
  --_accent-hover: var(--smart-checkin-accent-hover, #2B86C4);
  --_on-accent: var(--smart-checkin-on-accent, #0B1520);
  --_ok: var(--smart-checkin-success, #2BB896);
  --_warn: var(--smart-checkin-warning, #E08A3E);
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :host([theme="auto"]) {
    --_text: var(--smart-checkin-text, #E6EAEF);
    --_text-2: var(--smart-checkin-text-muted, #B4BDC7);
    --_text-3: var(--smart-checkin-text-faint, #8894A1);
    --_surface: var(--smart-checkin-surface, #1A212B);
    --_row: var(--smart-checkin-row, #202834);
    --_border: var(--smart-checkin-border, #313C4A);
    --_icon-bg: var(--smart-checkin-icon-background, #F6F8FA);
    --_accent: var(--smart-checkin-accent, #3D9BDA);
    --_accent-hover: var(--smart-checkin-accent-hover, #2B86C4);
    --_on-accent: var(--smart-checkin-on-accent, #0B1520);
    --_ok: var(--smart-checkin-success, #2BB896);
    --_warn: var(--smart-checkin-warning, #E08A3E);
    color-scheme: dark;
  }
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--_focus); outline-offset: 2px; }

.card { background: var(--_surface); border: var(--_card-border); border-radius: var(--_radius-lg); padding: var(--_card-padding); display: grid; gap: 12px; }
:host([appearance="flat"]) .card { background: transparent; border: 0; padding: 0; }
.title { margin: 0; font-size: 17px; font-weight: 700; line-height: 1.25; text-wrap: balance; }
.description { margin: -6px 0 0; font-size: 14px; line-height: 1.4; color: var(--_text-2); text-wrap: pretty; }

.primary { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: var(--_accent); color: var(--_on-accent); border: 0; border-radius: var(--_radius); padding: 12px 14px; min-height: 56px; }
.primary:hover { background: var(--_accent-hover); }
.primary .glyph { width: 32px; height: 32px; flex: none; border-radius: 8px; display: grid; place-items: center; background: color-mix(in srgb, var(--_on-accent) 18%, transparent); overflow: hidden; }
.primary .glyph svg { width: 18px; height: 18px; }
.primary .glyph img { width: 32px; height: 32px; object-fit: contain; background: #fff; }
.primary .glyph .icon { width: 32px; height: 32px; border: 0; border-radius: 0; }
.text { flex: 1; min-width: 0; display: grid; gap: 1px; }
.primary .name { font-size: 16px; font-weight: 700; line-height: 1.25; text-wrap: balance; }
.primary .detail { font-size: 13px; line-height: 1.3; opacity: .88; text-wrap: pretty; }

.divider { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--_text-2); }
.divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--_border); }

.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: var(--_row); border: 1px solid var(--_border); border-radius: var(--_radius); padding: 10px 12px; min-height: 56px; }
.row:hover { border-color: var(--_accent); }
.row .name { font-size: 15px; font-weight: 600; line-height: 1.25; text-wrap: balance; }
.row .detail { font-size: 13px; line-height: 1.3; color: var(--_text-2); text-wrap: pretty; }
.chevron { width: 16px; height: 16px; flex: none; color: var(--_text-3); }

.icon { width: 36px; height: 36px; flex: none; border-radius: var(--_icon-radius); overflow: hidden; display: grid; place-items: center; background: var(--_icon-bg); border: 1px solid var(--_border); }
.icon img { width: 100%; height: 100%; object-fit: contain; }
.icon.letter { border: 0; color: #fff; font-weight: 700; font-size: 16px; }
.stack { display: flex; align-items: center; flex: none; min-width: 36px; height: 36px; padding-left: 9px; }
.stack .icon { width: 22px; height: 22px; border-radius: 6px; font-size: 11px; margin-left: -9px; border: 0; box-shadow: 0 0 0 2px var(--_row); }

.link { justify-self: start; background: none; border: 0; padding: 4px 0; color: var(--_accent); font-size: 14px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }

.status { display: flex; gap: 12px; align-items: flex-start; }
.status .text { gap: 4px; }
.status .name { font-size: 16px; font-weight: 700; line-height: 1.25; text-wrap: balance; }
.status .detail { font-size: 14px; line-height: 1.4; color: var(--_text-2); text-wrap: pretty; }
.spinner { width: 28px; height: 28px; flex: none; border-radius: 50%; border: 3px solid var(--_border); border-top-color: var(--_accent); animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
.badge { width: 28px; height: 28px; flex: none; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.badge svg { width: 16px; height: 16px; }
.badge.ok { background: var(--_ok); }
.badge.warn { background: var(--_warn); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.button { border: 1px solid var(--_border); background: var(--_row); border-radius: var(--_radius); padding: 8px 14px; font-size: 14px; font-weight: 600; }
.button.accent { background: var(--_accent); border-color: var(--_accent); color: var(--_on-accent); }

.footer { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--_text-3); }
.footer svg { width: 14px; height: 14px; }
:host([footer="off"]) .footer { display: none; }

dialog { border: 0; padding: 0; background: transparent; color: var(--_text); max-width: none; max-height: none; }
dialog::backdrop { background: rgba(15, 20, 28, .45); }
dialog .card { width: min(420px, calc(100vw - 32px)); max-height: min(640px, calc(100dvh - 48px)); overflow: auto; box-shadow: 0 20px 50px rgba(0, 0, 0, .25); }
@media (max-width: 600px) {
  dialog { margin: auto 0 0; width: 100%; }
  dialog .card { width: 100%; max-height: 92dvh; border-radius: var(--_radius-lg) var(--_radius-lg) 0 0; padding-bottom: calc(var(--_card-padding) + env(safe-area-inset-bottom, 0px)); }
}
.dialog-head { display: flex; align-items: flex-start; gap: 8px; }
.dialog-head .text { gap: 4px; }
.dialog-head .name { font-size: 18px; font-weight: 700; line-height: 1.25; }
.dialog-head .detail { font-size: 14px; color: var(--_text-2); }
.close { width: 32px; height: 32px; flex: none; display: grid; place-items: center; background: none; border: 0; color: var(--_text-3); border-radius: 8px; margin: -6px -6px 0 0; }
.close svg { width: 16px; height: 16px; }
.search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--_border); border-radius: var(--_radius); padding: 0 10px; background: var(--_row); }
.search svg { width: 16px; height: 16px; color: var(--_text-3); flex: none; }
.search input { border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: var(--_text); padding: 10px 0; flex: 1; min-width: 0; }
.search:focus-within { outline: 2px solid var(--_focus); outline-offset: 2px; }
.empty { font-size: 14px; color: var(--_text-2); margin: 0; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
