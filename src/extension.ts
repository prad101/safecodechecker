// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateStream } from './generateStream';

// Create a diagnostic collection for security issues
const diagnosticCollection = vscode.languages.createDiagnosticCollection('security');

export function activate(context: vscode.ExtensionContext) {
    console.log("Safe Code Checker activated!");

    const runCommand = vscode.commands.registerCommand(
        "safecodechecker.checkcode",
        async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage("No file found. Open a file to analyze...");
                return;
            }

            const code = editor.document.getText();
            const document = editor.document;
            console.log("Reading Code from active editor with filename, line count: ", document.fileName, document.lineCount);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Scanning for security vulnerabilities...",
                cancellable: false
            }, async (progress) => {
                try {
                    const result = await generateStream(code);
                    console.log("Result generated!");

                    let parsedResult;
                    if (typeof result === "string") {
                        try {
                            parsedResult = JSON.parse(result);
                        } catch {
                            const doc = await vscode.workspace.openTextDocument({
                                content: result,
                                language: "markdown"
                            });
                            await vscode.window.showTextDocument(doc);
                            return;
                        }
                    } else {
                        parsedResult = result;
                    }

                    // ALWAYS show JSON report in split view
                    await showJsonReport(parsedResult);

                    // Display inline diagnostics
                    displayInlineDiagnostics(document, parsedResult);

                    // Show summary notification
                    const total = parsedResult.summary?.total_vulnerabilities || 
                                  parsedResult.vulnerabilities?.length || 0;
                    
                    if (total > 0) {
                        const critical = parsedResult.summary?.critical_count || 0;
                        const high = parsedResult.summary?.high_count || 0;
                        
                        vscode.window.showWarningMessage(
                            `Found ${total} vulnerabilities (${critical} critical, ${high} high)`,
                            'View Problems'
                        ).then(selection => {
                            if (selection === 'View Problems') {
                                vscode.commands.executeCommand('workbench.action.problems.focus');
                            }
                        });
                    } else {
                        vscode.window.showInformationMessage('No security vulnerabilities found!');
                    }

                    console.log("Analysis completed.");
                } catch (err: any) {
                    vscode.window.showErrorMessage("Error running analysis: " + err.message);
                    console.error(err);
                }
            });
        }
    );

    const clearCommand = vscode.commands.registerCommand(
        "safecodechecker.clear",
        () => {
            diagnosticCollection.clear();
            vscode.window.showInformationMessage('Cleared security diagnostics');
        }
    );

    context.subscriptions.push(runCommand, clearCommand, diagnosticCollection);
}

function displayInlineDiagnostics(document: vscode.TextDocument, results: any) {
    const diagnostics: vscode.Diagnostic[] = [];
    
    const vulnerabilities = results.vulnerabilities || [];
    
    vulnerabilities.forEach((vuln: any) => {
        try {
            // Extract line number from location field
            // Handles formats like: "line 5", "5", "5-10", "file.py:5", etc.
            let lineNum = 0;
            
            if (vuln.location) {
                const locationStr = String(vuln.location);
                
                // Try to extract line number with various patterns
                const lineMatch = locationStr.match(/\d+/);
                if (lineMatch) {
                    lineNum = parseInt(lineMatch[0]) - 1; // VS Code uses 0-based indexing
                }
            }
            
            // Ensure line number is within document range
            if (lineNum < 0) lineNum = 0;
            if (lineNum >= document.lineCount) lineNum = document.lineCount - 1;
            
            // Get the line of code
            const line = document.lineAt(lineNum);
            
            // create range for the entire line
            const range = new vscode.Range(
                lineNum, 
                0, 
                lineNum, 
                line.text.length
            );
            
            //determine severity
            const severity = getSeverity(vuln.severity);
            
            //create diagnostic message
            const message = `${vuln.type || 'Security Issue'}: ${vuln.description || 'No description'}`;
            
            const diagnostic = new vscode.Diagnostic(
                range,
                message,
                severity
            );
            
            //add additional metadata
            diagnostic.source = 'Safe Code Checker';
            
            //add code property for quick reference
            if (vuln.cwe_id) {
                diagnostic.code = vuln.cwe_id;
            } else if (vuln.owasp_category) {
                diagnostic.code = vuln.owasp_category;
            }
            
            //add related information (recommendation)
            if (vuln.recommendation) {
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(document.uri, range),
                        `💡 Recommendation: ${vuln.recommendation}`
                    )
                ];
            }
            
            diagnostics.push(diagnostic);
        } catch (err) {
            console.error('Error processing vulnerability:', err, vuln);
        }
    });
    
    // Set diagnostics for this document
    diagnosticCollection.set(document.uri, diagnostics);
    
    console.log(`Added ${diagnostics.length} diagnostics to Problems panel`);
}

function getSeverity(severity: string): vscode.DiagnosticSeverity {
    const sev = String(severity || '').toLowerCase();
    
    switch (sev) {
        case 'critical':
        case 'high':
            return vscode.DiagnosticSeverity.Error;
        case 'medium':
            return vscode.DiagnosticSeverity.Warning;
        case 'low':
            return vscode.DiagnosticSeverity.Information;
        default:
            return vscode.DiagnosticSeverity.Hint;
    }
}

async function showJsonReport(results: any) {
    const formatted = JSON.stringify(results, null, 2);
    const doc = await vscode.workspace.openTextDocument({
        content: formatted,
        language: "json"
    });
    await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
}



export function deactivate() {}
