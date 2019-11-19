# Serverless Console Settings

Serverless console gets data from VS Code settings (best if you use [Workspace Settings](serverlessConsole.openWorkspaceSettingsJson)).

## Serverless Framework

By default, `serverlessFramework` type is used.

It works by executing `serverless print` command and then extracting functions defined in `serverless.yml`:

```json
{
  "serverlessConsole.services": [
    {
      "type": "serverlessFramework", // Type of service (serverlessFramework or custom)
      "awsProfile": "default",       // (optional) The name of the credential profile to obtain credentials from
      "cwd": "./",                   // Working directory in which serverless print command will be executed
      "command": "sls print",        // Serverless print command
      "timeOffsetInMs": 0,           // (optional) Timestamp offset (useful if you are in a different timezone)
      "stages": ["dev"]              // Logs are shown per stage
    }
  ]
}
```

## Custom Service

If you are not using the serverless framework, or want to add custom **CloudWatch logs** in addition to it, you can define them using `custom` type:

```json
{
  "serverlessConsole.services": [
    {
      "type": "custom",                    // Type of service (serverlessFramework or custom)
      "awsProfile": "default",             // (optional) The name of the credential profile to obtain credentials from
      "timeOffsetInMs": 0,                 // (optional) Timestamp offset (useful if you are in a different timezone)
      "title": "EC2 logs",                 // The name of the service
      "region": "us-east-1",               // (optional) AWS Region (us-east-1 is used if not defined)
      "items": [
        {
          "title": "PM2 process",          // The equivalent of a function name in case of serverlessFramework service
          "description": "desc",           // (optional) Description of the item
          "tabs": [                        // There should always be at least one tab
            {
              "title": "dev",              // Tab title
              "logs": "custom_log_group"   // CloudWatch LogGroup name
            },
            {
              "title": "prod",
              "logs": "custom_log_group2",
              "lambda": "custom_function"  // If provided, the Lambda overview will be shown
            }
          ]
        }
      ]
    }
  ]
}
```