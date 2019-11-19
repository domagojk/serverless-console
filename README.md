# Serverless Console

Serverless Console enables you to show function overview and logs from within the Visual Studio Code editor.

![App Preview](./preview.gif)

## Features

Trying to find logs for Lambda functions in CloudWatch is not an enjoyable experience.

Some of the issues are:

- Finding the log group is not easy and tends to get harder as more functions are deployed
- Searching for logs on the wrong stage (for example `dev` instead of `prod`)
- Constantly matching logged time with the current time

This extension solves those issues with following features:

- Log groups are grouped per project and correspond to a single Serverless service (even though it's also possible to use it without serverless framework)
- Stages are shown per function on its own tab
- Times are shown relative to current timestamp (like "2 minutes ago")
- START / END of a request is more clear because memory size and duration are formatted differently

## Extension Settings

This extension contributes the following settings:

- `serverlessConsole.services`: a list of services from which data is retrieved.

By default, "serverlessFramework" type is used.

It works by executing `serverless print` command and then extracting functions defined in `serverless.yml`:

```json
{
  "serverlessConsole.services": [
    {
      "type": "serverlessFramework",
      "awsProfile": "default",
      "cwd": "./",
      "command": "sls print",
      "timeOffsetInMs": 0,
      "stages": ["dev"]
    }
  ]
}
```

If you are not using the serverless framework, or want to add custom **CloudWatch logs** in addition to it, you can define them using `custom` type:

```json
{
  "serverlessConsole.services": [
    {
      "type": "custom",
      "awsProfile": "default",
      "timeOffsetInMs": 0,
      "title": "EC2 logs",
      "region": "us-east-1",
      "items": [
        {
          "title": "PM2 process",
          "description": "optional desc",
          "tabs": [
            {
              "title": "dev",
              "logs": "custom_log_group"
            },
            {
              "title": "prod",
              "logs": "custom_log_group2",
              "lambda": "custom_function"
            }
          ]
        }
      ]
    }
  ]
}
```
