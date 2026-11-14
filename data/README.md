# Data in this starter

`providers.json` is a configuration example for the four institutions named in the challenge. The URLs were checked on 14 November 2026 where accessible. These are discovery links, not established API endpoints or permission to scrape. Host allowlists are proposed server restrictions; the starter does not perform network requests.

`demo-offers.json` contains eight invented activities, two assigned to each provider solely to exercise the prototype. The names, times, prices, age limits, access details and availability are fictional. They are not advertised courses, verified availability or institutional endorsements. Each record has `source.kind = "demo"`, a null record URL, and no verification timestamp. Never remove the visible demo label.

The dates are fixed in November 2026 for reproducible tests. The tests use a fixed reference clock. For a later demonstration, deliberately update the sample dates and repeat the checks. Ordinary application filtering defaults to the real current clock.

`demo-import.json` contains one changed offer and one new offer. It demonstrates a review preview, without fetching or publishing anything. Missing offers in an import never imply deletion.

Umang should replace or supplement samples with manually reviewed provider records only when the source supplies those facts. Unknown information stays null. Do not translate an unverified inference into a provider fact. Do not copy school-group activities into family results without evidence of individual access. Provider configuration does not grant authority to publish a record.
