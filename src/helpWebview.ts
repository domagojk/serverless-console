import * as vscode from 'vscode'
import * as path from 'path'

export async function createHelpWebview({
  cwd,
  html
}: {
  cwd: string
  html: string
}) {
  const staticCss = 'resources/webview/build/static/css'

  const cssFiles = [
    vscode.Uri.file(path.join(cwd, staticCss, 'main1.css')),
    vscode.Uri.file(path.join(cwd, staticCss, 'main2.css'))
  ]

  let webviewPanel = vscode.window.createWebviewPanel(
    'slsConsole-help',
    `Serverless Console`,
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  )

  const cssFilesSrc = cssFiles.map(
    cssFile =>
      `<link href="${webviewPanel.webview.asWebviewUri(
        cssFile
      )}" rel="stylesheet" />`
  )

  webviewPanel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        ${cssFilesSrc.join('\n')}
        <style>
          body {
            padding: 1em 4.5em;
            line-height: 1.7;
          }
          h1, h2, h3 {
            padding-top: 1em
          }
          pre {
            font-size:0.9em;
            line-height:1.4;
            padding: 10px;
            border-radius: 3px;
            overflow: auto;
          }
          .vscode-light pre, .vscode-light code {
            background: rgba(220, 220, 220, 0.4);
          }
          .vscode-dark pre, .vscode-dark code {
            background: rgba(10, 10, 10, 0.2);
          }
          
        </style>
      </head>
      <body>
        ${html}
        <script>
        const vscode = acquireVsCodeApi();
        for (const link of document.querySelectorAll('a')) {
            link.addEventListener('click', () => {
                vscode.postMessage({
                    command: link.getAttribute('href'),
                });
            });
        }
        </script>
      </body>
    </html>
    `

  webviewPanel.webview.onDidReceiveMessage(async message => {
    await vscode.commands.executeCommand(message.command)
  })
}
