# Wallet registries

A wallet registry is a `wallets.json` file listing the web wallets an EHR page offers. The EHR loads it, and the patient picks from it.

## The format

```json
{
  "source": "Riverbend Family Medicine",
  "wallets": [
    {
      "id": "smart-testing-wallet",
      "name": "SMART Testing Wallet",
      "walletUrl": "https://smart-health-checkin.org/connectathon/testing-wallet/",
      "description": "Reference wallet with synthetic patients",
      "iconUrl": "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20…",
      "homepage": "https://smart-health-checkin.org/connectathon/",
      "target": "tab"
    }
  ]
}
```

The registry:

| Field | Required | What it is |
| --- | --- | --- |
| `wallets` | yes | The list, at least one entry |
| `source` | no | A label for where the list came from |

Each entry:

| Field | Required | What it is |
| --- | --- | --- |
| `id` | yes | Stable identifier, unique in the list. Used in URLs, storage, and logs. |
| `name` | yes | What the patient sees |
| `walletUrl` | yes | The page that answers check-in requests |
| `description` | no | One line under the name in a picker |
| `iconUrl` | no | Square icon for a picker. A `data:` URL is best (see below). |
| `homepage` | no | Where to learn about or install the wallet |
| `target` | no | `"tab"` (default) or `"popup"` |

A plain array of entries also loads, as a registry with no `source`.

## Validating

Both functions are in `@smart-health-checkin/client/model`.

| Function | What it does |
| --- | --- |
| `validateWalletRegistry(value)` | Checks the shape: required fields, unique ids, a valid `target`. Returns `{ ok, value }` or `{ ok, error }`. |
| `loadWalletRegistry(source)` | Takes a URL, a registry, or a list of entries. Fetches if needed, validates, and throws if it's malformed. |

A malformed registry throws instead of falling back. Which wallets patients are sent to shouldn't be decided by accident.

## Icons

Prefer `data:` URLs for icons.

- **Privacy:** an icon loaded from a wallet's own server tells that server someone is on your check-in page. A `data:` URL loads nothing.
- **Formats:** SVG, PNG, WebP, or JPEG. Keep it small and square.
- **SVG:** no scripts, event handlers, or external references.
- **No icon:** pickers show a colored letter tile.

The connectathon registry inlines every icon when it's built. Participants give a normal URL, and the build fetches it, checks it, and writes a `data:` URL.

## Using a registry in an EHR page

| Where | How |
| --- | --- |
| The picker element | `<smart-checkin-picker registry="/wallets.json">` |
| React | `<CheckinPicker registry="/wallets.json" … />` |
| Your own UI | `const options = await wallets({ registry: "/wallets.json" })` |

`wallets()` puts the phone's own wallet first when the browser can reach it, then the registry's wallets in order. With no `registry`, no web wallets are offered.

## The connectathon registry

The SMART Health Check-in connectathon publishes one at [smart-health-checkin.org/connectathon/wallets.json](https://smart-health-checkin.org/connectathon/wallets.json).

- The SMART Testing Wallet is listed first.
- To add your web wallet, fill in the [registration form](https://smart-health-checkin.org/connectathon/register/). It opens a pull request with your participant file.
- Once merged, the registry rebuilds within a few minutes.
