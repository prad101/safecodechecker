// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateStream } from './generateStream';


/*
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "safecodechecker" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('safecodechecker.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from safecodechecker!');
	});

	context.subscriptions.push(disposable);
}
*/
class SafeCodeReportProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    resolveWebviewView(view: vscode.WebviewView) {
        this.view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = "<h2>Run analysis to see results</h2>";
    }

    update(content: string) {
        if (this.view) {
            this.view.webview.html = `<pre>${content}</pre>`;
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log("Safe Code Checker activated!");

    // const reportProvider = new SafeCodeReportProvider();
    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider("safeCodeReport", reportProvider)
    // );

    const runCommand = vscode.commands.registerCommand(
        "safecodechecker.checkcode",
        async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage("No file found. Open a file to analyze...");
                return;
            }

            const code = editor.document.getText();
            console.log("Reading Code from active editor with filename, line count: ", editor.document.fileName, editor.document.lineCount);
            // const output = vscode.window.createOutputChannel("Safe Code Checker");
            // output.clear();
            // output.show(true);

            // output.appendLine("🔍 Safe Code Checker started...\n");

            // const logger = (msg: string) => output.append(msg);

            try {
                // await generateStream(code, logger);
				const result = await generateStream(code);
                console.log("Result generated!");
                const doc = await vscode.workspace.openTextDocument({
                    content: result,
                    language: "markdown"
                });
                // reportProvider.update(result);
                console.log("Adding results to a markdown document...");
                await vscode.window.showTextDocument(doc);
                console.log("Analysis completed.");
                // output.appendLine("Analysis completed.");
            } catch (err: any) {
                vscode.window.showErrorMessage("Error running analysis: " + err.message);
            }
        }
    );

    context.subscriptions.push(runCommand);
}

//   "scripts": {
//     "vscode:prepublish": "npm run compile",
//     "compile": "tsc -p ./",
//     "watch": "tsc -watch -p ./",
//     "pretest": "npm run compile && npm run lint",
//     "lint": "eslint src",
//     "test": "vscode-test"
//   },
// This method is called when your extension is deactivated
export function deactivate() {}
