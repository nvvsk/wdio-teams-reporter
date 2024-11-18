# wdio-teams-reporter
Microsoft Teams Adaptive Card Reporter for WebdriverIO

## FAQs
1. WDIO is not waiting for results to be uploaded. <b>Solution</b> Increase `reporterSyncTimeout` in config to desired timeout level.
2. How are options passed? <b>Answer</b> Stringified JSON. Parse at workflows level and template should be based on whatever is being passed to options
3. How to parse Adaptive Card? <b>Answer</b> Adaptive Card is send as Stringified JSON in `data` key. Use `@json(data)` expression instead of Parse JSON Operation
