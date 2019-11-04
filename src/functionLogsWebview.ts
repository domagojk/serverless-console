import * as vscode from 'vscode'

export async function getWebviewContent({
  fontSize,
  panel,
  jsFiles,
  cssFiles
}: {
  fontSize: number
  panel: vscode.WebviewPanel
  jsFiles: vscode.Uri[]
  cssFiles: vscode.Uri[]
}) {
  const jsFilesSrc = jsFiles.map(
    jsFile => `<script src="${panel.webview.asWebviewUri(jsFile)}"></script>`
  )

  const cssFilesSrc = cssFiles.map(
    cssFile =>
      `<link href="${panel.webview.asWebviewUri(cssFile)}" rel="stylesheet" />`
  )

  const cspSource = panel.webview.cspSource

  panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta http-equiv="Content-Security-Policy" img-src ${cspSource} https:; script-src ${cspSource}; style-src ${cspSource};" />

        ${cssFilesSrc.join('\n')}
        <style>
          body, body .ant-collapse {
            font-size: ${fontSize}px;
          }
        </style>
        <script>
          window.slsConsole = {
            darkTheme: false
          }
        </script>
      </head>
      <body class="">
        <div id="root"></div>
          ${jsFilesSrc.join('\n')}
      </body>
    </html>
    `
}
