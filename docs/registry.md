# Registry format

A wallet registry is a `wallets.json` file listing the web wallets an EHR page offers. [Offering wallets](wallets.md#registries-and-icons) explains how pages use one.

```json
{
  "source": "Riverbend Family Medicine",
  "wallets": [
    {
      "id": "smart-testing-wallet",
      "name": "SMART Testing Wallet",
      "walletUrl": "https://smart-health-checkin.org/connectathon/testing-wallet/",
      "description": "Reference wallet with synthetic patients",
      "iconUrl": "data:image/svg+xml,…",
      "homepage": "https://smart-health-checkin.org/connectathon/",
      "target": "tab"
    }
  ]
}
```

## The registry

| Field | Required | What it is |
| --- | --- | --- |
| `wallets` | yes | The entries, at least one |
| `source` | no | A label for where the list came from |

A plain array of entries also loads.

## Each entry

| Field | Required | What it is |
| --- | --- | --- |
| `id` | yes | Stable identifier, unique in the list. Used in URLs, storage, and logs. |
| `name` | yes | What the patient sees |
| `walletUrl` | yes | The page that answers check-in requests |
| `description` | no | One line under the name in a picker |
| `iconUrl` | no | Square icon for a picker. Prefer a `data:` URL. |
| `homepage` | no | Where to learn about or install the wallet |
| `target` | no | `"tab"` (default) or `"popup"` |

## Icons

- **Prefer `data:` URLs.** A remote icon tells the wallet's server that someone is on the EHR's check-in page.
- **Formats:** SVG, PNG, WebP, or JPEG. Small and square.
- **SVG:** no scripts, event handlers, or external references.
- **No icon:** pickers show a colored letter tile.

## Validating

Both functions are in `@smart-health-checkin/client/model`.

| Function | What it does |
| --- | --- |
| `validateWalletRegistry(value)` | Checks required fields, unique ids, and `target`. Returns `{ ok, value }` or `{ ok, error }`. |
| `loadWalletRegistry(source)` | Takes a URL, a registry, or a list. Fetches if needed, validates, and throws if it's malformed. |
