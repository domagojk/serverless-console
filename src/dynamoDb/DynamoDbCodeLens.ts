import * as vscode from 'vscode'
import { isEqual } from 'lodash'

export class DynamoDBCodeLens implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = []
  private _onDidChangeCodeLenses: vscode.EventEmitter<
    void
  > = new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this
    ._onDidChangeCodeLenses.event

  constructor() {
    vscode.workspace.onDidChangeConfiguration(_ => {
      this._onDidChangeCodeLenses.fire()
    })
  }

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.codeLenses = []
    return []
    /*
    const currentTab = this.localContext.dynamoDbChanges.find(
      ch => ch.fileUri === document.uri.fsPath
    )

    const range = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 1)
    )

    if (currentTab) {
      let parsed = null
      try {
        parsed = JSON.parse(document.getText())
      } catch (err) {}

      if (parsed && isEqual(currentTab.initialData, parsed)) {
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '↻ Refresh DynamoDB Item',
            command: 'serverlessConsole.refresh-dynamodb-item',
            arguments: [document]
          })
        )
      } else {
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '＊ Compare with original DynamoDB item',
            command: 'serverlessConsole.revert-dynamodb-item',
            arguments: [document]
          })
        )
      }
    } else if (document.uri.fsPath.includes('vscode-sls-console/dynamodb/')) {
      this.codeLenses.push(
        new vscode.CodeLens(range, {
          title: '＊ Compare with original DynamoDB item',
          command: 'serverlessConsole.refresh-dynamodb-item',
          arguments: [document]
        })
      )
    }
    return this.codeLenses

    /*
      const splitted = document.getText().split(/\r?\n/)
      const lineStart = splitted.findIndex(line => line === '{')

      if (lineStart === -1) {
        return null
      }

      const parsed = jsoncParser.parse(document.getText())

      if (typeof parsed !== 'object') {
        return null
      }

      if (
        currentTab.hashKey &&
        !Object.keys(parsed).includes(currentTab.hashKey)
      ) {
        return null
      }

      if (
        currentTab.sortKey &&
        !Object.keys(parsed).includes(currentTab.sortKey)
      ) {
        return null
      }

      if (isEqual(parsed, currentTab.initialData)) {
        return null
      }

      let range = new vscode.Range(
        new vscode.Position(lineStart, 0),
        new vscode.Position(lineStart, 1)
      )

      if (
        currentTab.initialData[currentTab.hashKey] ===
          parsed[currentTab.hashKey] &&
        currentTab.initialData[currentTab.sortKey] ===
          parsed[currentTab.sortKey]
      ) {
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '⚡ Update item',
            command: 'serverlessConsole.update-dynamodb-item',
            arguments: [
              document,
              {
                oldData: currentTab.initialData,
                newData: parsed,
                hashKey: currentTab.hashKey,
                sortKey: currentTab.sortKey
              }
            ]
          })
        )
      } else {
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '⚡ Insert new item',
            command: 'codelens-sample.codelensAction',
            arguments: ['Argument 1', false]
          })
        )
      }
      */
  }
}
