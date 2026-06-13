import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { convertToPdf } from './converter';
import { getSettings } from './settings';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('rypka-hauer.markdownToPdf.export', (uri?: vscode.Uri) =>
      runExport(uri, false)
    ),
    vscode.commands.registerCommand('rypka-hauer.markdownToPdf.exportAs', (uri?: vscode.Uri) =>
      runExport(uri, true)
    )
  );
}

export function deactivate(): void {}

// ---------------------------------------------------------------------------

async function resolveInputPath(uri?: vscode.Uri): Promise<string | undefined> {
  if (uri) return uri.fsPath;
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.languageId === 'markdown') {
    return editor.document.uri.fsPath;
  }
  return undefined;
}

async function resolveOutputPath(inputPath: string, saveAs: boolean): Promise<string | undefined> {
  const defaultOutput = inputPath.replace(/\.md$/i, '.pdf');

  if (!saveAs) return defaultOutput;

  const result = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultOutput),
    filters: { 'PDF Files': ['pdf'] },
    title: 'Export Markdown as PDF',
  });

  return result?.fsPath;
}

function resolvedIncrementPath(outputPath: string): string {
  const ext = path.extname(outputPath);
  const base = outputPath.slice(0, -ext.length);
  let i = 1;
  while (fs.existsSync(`${base}-${i}${ext}`)) i++;
  return `${base}-${i}${ext}`;
}

async function runExport(uri: vscode.Uri | undefined, saveAs: boolean): Promise<void> {
  const inputPath = await resolveInputPath(uri);
  if (!inputPath) {
    vscode.window.showErrorMessage('No Markdown file is active or selected.');
    return;
  }

  let outputPath = await resolveOutputPath(inputPath, saveAs);
  if (!outputPath) return; // user cancelled Save As dialog

  const settings = getSettings();

  if (fs.existsSync(outputPath) && !saveAs) {
    if (settings.output.overwrite === 'increment') {
      outputPath = resolvedIncrementPath(outputPath);
    } else if (settings.output.overwrite === 'prompt') {
      const choice = await vscode.window.showWarningMessage(
        `${path.basename(outputPath)} already exists. Overwrite?`,
        { modal: true },
        'Overwrite'
      );
      if (choice !== 'Overwrite') return;
    }
    // 'overwrite' — fall through, Puppeteer will replace the file
  }

  const label = path.basename(inputPath);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Exporting ${label} to PDF…`, cancellable: false },
    async () => {
      try {
        await convertToPdf(inputPath, outputPath!, settings);
        const pdfName = path.basename(outputPath!);

        if (settings.output.openAfterExport) {
          vscode.env.openExternal(vscode.Uri.file(outputPath!));
          vscode.window.showInformationMessage(`PDF saved: ${pdfName}`);
        } else {
          const action = await vscode.window.showInformationMessage(
            `PDF saved: ${pdfName}`,
            'Open PDF'
          );
          if (action === 'Open PDF') {
            vscode.env.openExternal(vscode.Uri.file(outputPath!));
          }
        }
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Export failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );
}
