# Change Log

All notable changes to the "serverless-console" extension will be documented in this file.

## [0.8.2] 07 Mar 2025

- Updated Change Log

## [0.8.1] 24 Feb 2025

- Replaced "buy me a coffee" link with "cloud ui" promo
- Added "cloud ui" option in new service page

## [0.8.0] 24 Oct 2024

- Cleaned sume dust that piled up over the last 3 years of not working on this project
- Upgraded few dependencies
- Added support for logging to AWS via SSO

## [0.7.6] 03 May 2021

- Added support for default DynamodDb query

## [0.7.5] 26 Nov 2020

- Fixed issue #34

## [0.7.4] 22 Sep 2020

- Added ability to define "sls print" commands per stage

## [0.7.2] 07 Sep 2020

- Fixed issue #31

## [0.7.0] 15 Aug 2020

- Added ability to connect to a local DynamoDb (issue #30)

## [0.6.25] 29 Jun 2020

- Fixed issue #27

## [0.6.24] 08 Jun 2020

- Fixed issue #25

## [0.6.22] 30 May 2020

- Fixed issue #20
- Fixed issue #24

## [0.6.21] 25 May 2020

- Styling changes (stage selection is always on top, search bar is the same for all logs)

## [0.6.20] 22 May 2020

- Logs tab (dev/prod or similar) is now restored to previously used one

## [0.6.18]

- Fixed bundle size from last version

## [0.6.17]

- Fixed issue #17

## [0.6.15]

- Add service message fixed if nothing is added

## [0.6.14]

- DynamoDB service can now be used without a license

## [0.6.12]

- Fix bug with "Remove" option on service context menu

## [0.6.11]

- Detect DynamoDB resource for Serverless framework and Cloudformation sources

## [0.6.10]

- DynamoDB: added option "Close DynamoDB Item after Save"

## [0.6.8]

- Log Search: Regex characters are now escaped by default
- Log Search: Added option to "show results per log stream"
- DynamoDB: Fixed "load more" when fetching in "query" type

## [0.6.7]

- DynamoDB: Fixed bug with refreshing previously updated items

## [0.6.6]

- DynamoDB: Added conditional check when deleting items
- DynamoDB: Auto-close editor only when item is saved from webview

## [0.6.5]

- DynamoDB: Fix delete item diff
- DynamoDB: Fix set selection on edit item

## [0.6.4]

- DynamoDB: Fix tmp directory cleanup

## [0.6.3]

- DynamoDB: Check if updated property was changed in the meantime

## [0.6.2]

- Added awsProfile per stage option (#13)

## [0.6.1]

- Fixed bug with DynamoDB property delete command

## [0.6.0]

- Added DynamoDB service

## [0.5.12]

- Fixed bug with missing region when using CloudWatch Insights

## [0.5.11]

- Added support for AWS profiles using assumed role (issue #11)

## [0.5.9]

- Fixed bug with auto refresh (ignoring request if tab is not visible)

## [0.5.8]

- Fixed issue #8

## [0.5.7]

- Fixed issue #7

## [0.5.6]

- Added support for enviroment variables

## [0.5.5]

- Fixed issue #5

## [0.5.4]

- Fixed issue #4

## [0.5.2]

- AWS profile file parser added (for displaying a dropdown)
- Find widget enabled for logs

## [0.5.0]

- Added "Search Logs" using Cloudwatch Insights

## [0.4.9]

- Fixed issue #2
- Added function icons

## [0.4.6]

- Fixed bug with listing partial results from Cloudformation

## [0.4.5]

- Optimised "sls print" output
- Display service error in its own tab rather than vscode notification dialog

## [0.4.3]

- Added "Custom" source when adding a new service

## [0.4.2]

- Fixed CloudFormation source created with AWS SAM

## [0.4.1]

- Auto refresh option

## [0.4.0]

- "add service" page
- support for CloudFormation
- remove service context option

## [0.3.0]

- Added "group logs per request" option
- Added search in a log stream

## [0.2.0]

- Added icon

## [0.1.0]

- Fixed issue with displaying help page

## [0.0.1]

- Initial release
