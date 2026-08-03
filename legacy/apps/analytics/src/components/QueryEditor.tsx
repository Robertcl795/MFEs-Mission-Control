import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { getBridge } from '@teradata-pe/bridge';
import { setupMonacoWorkers } from '../monaco/setup';

interface QueryEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: number;
}

/**
 * Monaco-backed SQL editor. `monaco-editor` is a federated singleton, so
 * this editor and the JSON viewer in the `reports` (Angular) remote share
 * one download and one global theme: subscribing to the bridge ThemeChannel
 * flips `vs`/`vs-dark` for every editor in the federation at once.
 */
export function QueryEditor({ value, onChange, height = 180 }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    setupMonacoWorkers();
    const { theme } = getBridge();

    const editor = monaco.editor.create(containerRef.current!, {
      value,
      language: 'sql',
      theme: theme.current === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      padding: { top: 8 },
    });
    editorRef.current = editor;

    const contentSub = editor.onDidChangeModelContent(() => onChange?.(editor.getValue()));
    const unsubscribeTheme = theme.subscribe((next) => {
      monaco.editor.setTheme(next === 'dark' ? 'vs-dark' : 'vs');
    });

    return () => {
      contentSub.dispose();
      unsubscribeTheme();
      editor.dispose();
      editorRef.current = null;
    };
    // Mount-once: the editor manages its own model after creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="mc-monaco" style={{ height }} data-testid="query-editor" />;
}
