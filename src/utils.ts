import { TeamsReporterSuite } from "./TeamsReporter.js";

export function getAdaptiveCardv1_4(teamsReporterSuite: TeamsReporterSuite): any{
    return `{
    "type": "AdaptiveCard",
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "version": "1.4",
    "body": [
        {
            "type": "Container",
            "style": "${teamsReporterSuite.metrics.failedTests>0?'attention':'good'}",
            "bleed": true,
            "items": [
                {
                    "type": "TextBlock",
                    "text": "${teamsReporterSuite.title}",
                    "wrap": true,
                    "fontType": "Monospace",
                    "size": "Medium",
                    "weight": "Bolder",
                    "isSubtle": false,
                    "horizontalAlignment": "Center"
                }
            ]
        },
        {
            "type": "Container",
            "items": [
                {
                    "type": "TextBlock",
                    "text": "Start time - ${new Date(teamsReporterSuite.start).toString()}",
                    "wrap": true,
                    "fontType": "Monospace",
                    "horizontalAlignment": "Center"
                },
                {
                    "type": "TextBlock",
                    "text": "End time - ${teamsReporterSuite.end ? new Date(teamsReporterSuite.end).toString() : 'NA' }",
                    "wrap": true,
                    "fontType": "Monospace",
                    "horizontalAlignment": "Center"
                },
                {
                    "type": "TextBlock",
                    "text": "Total - ${teamsReporterSuite.metrics.totalTests}",
                    "wrap": true,
                    "horizontalAlignment": "Center",
                    "fontType": "Monospace",
                    "size": "Default"
                },
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "width": "stretch",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": "Passed - ${teamsReporterSuite.metrics.passedTests}",
                                    "wrap": true,
                                    "horizontalAlignment": "Center",
                                    "fontType": "Monospace",
                                    "size": "Default",
                                    "color": "Good"
                                }
                            ]
                        },
                        {
                            "type": "Column",
                            "width": "stretch",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": "Failed - ${teamsReporterSuite.metrics.failedTests}",
                                    "wrap": true,
                                    "horizontalAlignment": "Center",
                                    "fontType": "Monospace",
                                    "color": "Attention"
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "width": "stretch",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": "Skipped - ${teamsReporterSuite.metrics.skippedTests}",
                                    "wrap": true,
                                    "horizontalAlignment": "Center",
                                    "fontType": "Monospace",
                                    "size": "Default",
                                    "color": "Warning"
                                }
                            ]
                        },
                        {
                            "type": "Column",
                            "width": "stretch",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": "Retried - ${teamsReporterSuite.metrics.retriedTests}",
                                    "wrap": true,
                                    "horizontalAlignment": "Center",
                                    "fontType": "Monospace",
                                    "color": "Warning"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}`;
}
