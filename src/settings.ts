import * as vscode from 'vscode';

export interface Settings {
  codeBlocks: {
    enabled: boolean;
    theme: string;
  };
  frontMatter: {
    render: boolean;
    style: 'metadata-box' | 'table' | 'code-block';
  };
  page: {
    size: 'Letter' | 'A4' | 'Legal';
    margins: 'normal' | 'narrow' | 'wide' | 'none';
  };
  stylesheet: string;
  output: {
    overwrite: 'overwrite' | 'prompt' | 'increment';
    openAfterExport: boolean;
  };
  images: {
    resolveRelativePaths: boolean;
  };
}

export function getSettings(): Settings {
  const cfg = vscode.workspace.getConfiguration('rypka-hauer.markdownToPdf');
  return {
    codeBlocks: {
      enabled: cfg.get('codeBlocks.enabled', true),
      theme: cfg.get('codeBlocks.theme', 'github-light'),
    },
    frontMatter: {
      render: cfg.get('frontMatter.render', false),
      style: cfg.get('frontMatter.style', 'metadata-box'),
    },
    page: {
      size: cfg.get('page.size', 'Letter'),
      margins: cfg.get('page.margins', 'normal'),
    },
    stylesheet: cfg.get('stylesheet', 'github'),
    output: {
      overwrite: cfg.get('output.overwrite', 'overwrite'),
      openAfterExport: cfg.get('output.openAfterExport', true),
    },
    images: {
      resolveRelativePaths: cfg.get('images.resolveRelativePaths', true),
    },
  };
}
