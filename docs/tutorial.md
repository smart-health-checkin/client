# Tutorial: build a check-in page

In this tutorial you add SMART Health Check-in to a clinic's intake form. The patient picks a health app, shares their allergies, insurance card, and a two-question mood screen, and the form fills itself in.

What you'll build:

- An intake form with the check-in picker above it.
- A request for three things: allergies, an insurance card, and a PHQ-2.
- Code that fills the form from the answer, and falls back to typing when nothing comes back.
- A page you can test with made-up data, then with a real test wallet.

You need a text editor and a local web server (`npx serve`, `python3 -m http.server`, or similar). No build step, no install. [The finished page](#the-whole-page) is at the end.

## Step 1: Start with your form

This is the form the clinic already has. Everything in this tutorial adds to it; nothing replaces it.

```html
<h1>Before your visit</h1>

<form id="intake">
  <label for="allergies">Allergies</label>
  <textarea id="allergies" rows="3"></textarea>

  <label for="insurance">Insurance</label>
  <input id="insurance">

  <label for="phq2">Mood (PHQ-2 score, 0 to 6)</label>
  <input id="phq2" inputmode="numeric">

  <button>Submit</button>
</form>
```

The form stays the fallback. A patient without a health app, or one who says no, fills it in by hand as before.

## Step 2: Add the picker

Load the picker and put it above the form.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.2.0/ui.js"></script>

<smart-checkin-picker
  heading="Fill this form from a health app"
  description="Share your allergies, insurance, and two questions about your mood.">
</smart-checkin-picker>
<p id="note"></p>
```

- `ui.js` is self-contained and pinned to version 0.2.0.
- With no other attributes, the picker offers the phone's own health app, when the browser can reach one.
- `#note` is where the page will tell the patient what happened.

## Step 3: Ask for what the visit needs

A request is a list of items. Each has a title the patient reads and a description the health app acts on. Put this in a module script after the picker.

```html
<script type="module">
  const ANSWERS = [
    { system: "http://loinc.org", code: "LA6568-5", display: "Not at all" },
    { system: "http://loinc.org", code: "LA6569-3", display: "Several days" },
    { system: "http://loinc.org", code: "LA6570-1", display: "More than half the days" },
    { system: "http://loinc.org", code: "LA6571-9", display: "Nearly every day" },
  ];

  const PHQ2 = {
    resourceType: "Questionnaire",
    url: "https://riverbend.example/Questionnaire/phq-2",
    version: "1",
    status: "active",
    title: "Two questions about your mood",
    item: [
      { linkId: "interest", type: "choice", text: "Little interest or pleasure in doing things",
        answerOption: ANSWERS.map((valueCoding) => ({ valueCoding })) },
      { linkId: "mood", type: "choice", text: "Feeling down, depressed, or hopeless",
        answerOption: ANSWERS.map((valueCoding) => ({ valueCoding })) },
    ],
  };

  const REQUEST = {
    purpose: "Before your visit at Riverbend Family Medicine",
    items: [
      {
        id: "allergies",
        title: "Allergies",
        summary: "So we can check them against anything we prescribe.",
        content: {
          kind: "selection.fhir",
          profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
        },
        accept: ["application/fhir+json"],
      },
      {
        id: "insurance",
        title: "Insurance card",
        summary: "So we can check your coverage before you arrive.",
        content: { kind: "selection.fhir", resourceTypes: ["Coverage"] },
        accept: ["application/smart-health-card", "application/fhir+json"],
      },
      {
        id: "phq2",
        title: "Two questions about your mood",
        content: { kind: "form.fhir", questionnaireCanonical: `${PHQ2.url}|${PHQ2.version}`, questionnaire: PHQ2 },
        accept: ["application/fhir+json"],
      },
    ],
  };

  const picker = document.querySelector("smart-checkin-picker");
  picker.request = REQUEST;
</script>
```

What each item asks for:

| Item | `content` | Why this way |
| --- | --- | --- |
| `allergies` | Records with the US Core allergy profile | The data already exists in the patient's app |
| `insurance` | Any `Coverage` record | `accept` lists a SMART Health Card first: a card signed by the insurer, if the app has one, otherwise plain FHIR |
| `phq2` | A form, sent inline | The answers don't exist yet; the patient fills them in |

[Asking for data](requests.md) covers every kind of item.

## Step 4: Fill the form from the answer

The picker fires `smart-checkin-response` with a `CheckinResponse`. By then the library has decrypted it, checked its signatures, and confirmed it answers your request. Add this to the same script:

```js
const SCORES = { "LA6568-5": 0, "LA6569-3": 1, "LA6570-1": 2, "LA6571-9": 3 };
const answers = (items = []) => items.flatMap((i) => [...(i.answer ?? []), ...answers(i.item)]);
const note = document.querySelector("#note");

picker.addEventListener("smart-checkin-response", ({ detail: { response } }) => {
  const allergies = response.resources("allergies", { type: "AllergyIntolerance" });
  document.querySelector("#allergies").value = allergies
    .map((a) => a.code?.text ?? a.code?.coding?.[0]?.display)
    .filter(Boolean)
    .join("\n");

  const coverage = response.resources("insurance", { type: "Coverage" })[0];
  if (coverage) {
    document.querySelector("#insurance").value =
      [coverage.payor?.[0]?.display, coverage.subscriberId].filter(Boolean).join(", ");
  }

  const phq2 = response.form("phq2");
  if (phq2) {
    document.querySelector("#phq2").value =
      answers(phq2.item).reduce((sum, a) => sum + (SCORES[a.valueCoding?.code] ?? 0), 0);
  }

  const missing = response.items().filter((i) => i.status !== "fulfilled").map((i) => i.title);
  note.textContent = missing.length
    ? `Please fill in: ${missing.join(", ")}. Check everything before you submit.`
    : "Check everything before you submit.";
});
```

The lookups you just used:

| Call | Returns |
| --- | --- |
| `response.resources("allergies", { type })` | That item's FHIR resources, from Bundles and trusted health cards |
| `response.form("phq2")` | The item's QuestionnaireResponse |
| `response.items()` | Every item with its status: `fulfilled`, `declined`, `unavailable`, and so on |

[Using the answer](responses.md) covers the rest, including `response.json`, the full response to send to your server.

## Step 5: Handle what doesn't complete

Every check-in ends as completed, declined, or failed. The last two should land the patient back at the form.

```js
picker.addEventListener("smart-checkin-declined", () => {
  note.textContent = "Nothing was shared. Please fill in the form.";
});

picker.addEventListener("smart-checkin-error", ({ detail }) => {
  note.textContent = "That didn't work. Please fill in the form.";
  console.warn("check-in failed:", detail.code, detail.message);
});
```

`detail.code` says what went wrong, for example `blocked` when the browser blocked a tab. [Testing](testing.md#reading-a-failed-result) lists every code.

## Step 6: Try it with made-up data

Add the `mock` attribute to the picker:

```html
<smart-checkin-picker mock …></smart-checkin-picker>
```

Open the page and pick **Simulated response**. The form fills in with made-up allergies, an insurance card, and PHQ-2 answers. The mock runs the real encryption and checks, so the code you just wrote ran for real.

## Step 7: Try it with a test wallet

Now offer real web wallets. Point the picker at the connectathon's wallet registry:

```html
<smart-checkin-picker
  registry="https://smart-health-checkin.org/connectathon/wallets.json"
  mock …>
</smart-checkin-picker>
```

Pick **SMART Testing Wallet**. It opens in a tab with a synthetic patient. Choose what to share and press Share; the tab closes and the form fills in.

The Testing Wallet signs insurance cards with a test issuer that no one trusts in production. Accept any validly signed card while you test:

```js
picker.checkinOptions = { healthCards: { accept: "any-valid" } };
```

With the default setting, an untrusted card still arrives, but `resources("insurance")` leaves it out. [Using the answer](responses.md#smart-health-cards) explains card trust.

## Before real patients

Take out the mock and the test registry, then work through [Going to production](production.md):

- Decide which health cards to trust, for example issuers in the VCI directory.
- Offer the web wallets your clinic recognizes, in your own `wallets.json`.
- Tie the page to a signed-in patient.
- Keep the form working for everyone who doesn't use a health app.

## The whole page

Save this as `checkin.html` and open it through your local web server.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Before your visit · Riverbend Family Medicine</title>
  <script type="module" src="https://smart-health-checkin.org/client/lib/0.2.0/ui.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    label { display: block; margin-top: 1rem; font-weight: 600; }
    input, textarea { box-sizing: border-box; width: 100%; font: inherit; padding: 0.4rem; }
    #note { color: #4b5563; }
    button { margin-top: 1rem; font: inherit; padding: 0.5rem 1rem; }
  </style>
</head>
<body>
  <h1>Before your visit</h1>

  <smart-checkin-picker
    registry="https://smart-health-checkin.org/connectathon/wallets.json"
    mock
    heading="Fill this form from a health app"
    description="Share your allergies, insurance, and two questions about your mood.">
  </smart-checkin-picker>
  <p id="note"></p>

  <form id="intake">
    <label for="allergies">Allergies</label>
    <textarea id="allergies" rows="3"></textarea>

    <label for="insurance">Insurance</label>
    <input id="insurance">

    <label for="phq2">Mood (PHQ-2 score, 0 to 6)</label>
    <input id="phq2" inputmode="numeric">

    <button>Submit</button>
  </form>

  <script type="module">
    const ANSWERS = [
      { system: "http://loinc.org", code: "LA6568-5", display: "Not at all" },
      { system: "http://loinc.org", code: "LA6569-3", display: "Several days" },
      { system: "http://loinc.org", code: "LA6570-1", display: "More than half the days" },
      { system: "http://loinc.org", code: "LA6571-9", display: "Nearly every day" },
    ];
    const SCORES = { "LA6568-5": 0, "LA6569-3": 1, "LA6570-1": 2, "LA6571-9": 3 };

    const PHQ2 = {
      resourceType: "Questionnaire",
      url: "https://riverbend.example/Questionnaire/phq-2",
      version: "1",
      status: "active",
      title: "Two questions about your mood",
      item: [
        { linkId: "interest", type: "choice", text: "Little interest or pleasure in doing things",
          answerOption: ANSWERS.map((valueCoding) => ({ valueCoding })) },
        { linkId: "mood", type: "choice", text: "Feeling down, depressed, or hopeless",
          answerOption: ANSWERS.map((valueCoding) => ({ valueCoding })) },
      ],
    };

    const REQUEST = {
      purpose: "Before your visit at Riverbend Family Medicine",
      items: [
        {
          id: "allergies",
          title: "Allergies",
          summary: "So we can check them against anything we prescribe.",
          content: {
            kind: "selection.fhir",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
          },
          accept: ["application/fhir+json"],
        },
        {
          id: "insurance",
          title: "Insurance card",
          summary: "So we can check your coverage before you arrive.",
          content: { kind: "selection.fhir", resourceTypes: ["Coverage"] },
          accept: ["application/smart-health-card", "application/fhir+json"],
        },
        {
          id: "phq2",
          title: "Two questions about your mood",
          content: { kind: "form.fhir", questionnaireCanonical: `${PHQ2.url}|${PHQ2.version}`, questionnaire: PHQ2 },
          accept: ["application/fhir+json"],
        },
      ],
    };

    const answers = (items = []) => items.flatMap((i) => [...(i.answer ?? []), ...answers(i.item)]);
    const note = document.querySelector("#note");
    const picker = document.querySelector("smart-checkin-picker");
    picker.request = REQUEST;
    // Testing only: the Testing Wallet's insurance cards come from a test issuer.
    picker.checkinOptions = { healthCards: { accept: "any-valid" } };

    picker.addEventListener("smart-checkin-response", ({ detail: { response } }) => {
      const allergies = response.resources("allergies", { type: "AllergyIntolerance" });
      document.querySelector("#allergies").value = allergies
        .map((a) => a.code?.text ?? a.code?.coding?.[0]?.display)
        .filter(Boolean)
        .join("\n");

      const coverage = response.resources("insurance", { type: "Coverage" })[0];
      if (coverage) {
        document.querySelector("#insurance").value =
          [coverage.payor?.[0]?.display, coverage.subscriberId].filter(Boolean).join(", ");
      }

      const phq2 = response.form("phq2");
      if (phq2) {
        document.querySelector("#phq2").value =
          answers(phq2.item).reduce((sum, a) => sum + (SCORES[a.valueCoding?.code] ?? 0), 0);
      }

      const missing = response.items().filter((i) => i.status !== "fulfilled").map((i) => i.title);
      note.textContent = missing.length
        ? `Please fill in: ${missing.join(", ")}. Check everything before you submit.`
        : "Check everything before you submit.";
    });

    picker.addEventListener("smart-checkin-declined", () => {
      note.textContent = "Nothing was shared. Please fill in the form.";
    });

    picker.addEventListener("smart-checkin-error", ({ detail }) => {
      note.textContent = "That didn't work. Please fill in the form.";
      console.warn("check-in failed:", detail.code, detail.message);
    });
  </script>
</body>
</html>
```
