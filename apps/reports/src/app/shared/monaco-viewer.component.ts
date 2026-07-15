import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  type OnChanges,
  type OnDestroy,
  ViewChild,
} from '@angular/core';
import * as monaco from 'monaco-editor';
import { getBridge, type Unsubscribe } from '@mission/bridge';
import { setupMonacoWorkers } from './monaco-setup';

/**
 * Read-only Monaco viewer for logs / JSON. Uses the SAME federated
 * `monaco-editor` singleton as the React query editor in `analytics`, and
 * follows the global ThemeChannel (`vs` ⇄ `vs-dark`) from the bridge.
 */
@Component({
  selector: 'mcr-monaco-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="mcr-monaco" [style.height.px]="height" data-testid="monaco-viewer"></div>`,
  styles: [
    `
      .mcr-monaco {
        border: 1px solid var(--mc-border);
        border-radius: var(--mc-radius-sm);
        overflow: hidden;
      }
    `,
  ],
})
export class MonacoViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) value = '';
  @Input() language = 'json';
  @Input() height = 360;

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private offTheme?: Unsubscribe;

  ngAfterViewInit(): void {
    setupMonacoWorkers();
    const { theme } = getBridge();

    this.editor = monaco.editor.create(this.host.nativeElement, {
      value: this.value,
      language: this.language,
      theme: theme.current === 'dark' ? 'vs-dark' : 'vs',
      readOnly: true,
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 12.5,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8 },
    });

    this.offTheme = theme.subscribe((next) => {
      monaco.editor.setTheme(next === 'dark' ? 'vs-dark' : 'vs');
    });
  }

  ngOnChanges(): void {
    if (this.editor && this.editor.getValue() !== this.value) {
      this.editor.setValue(this.value);
    }
  }

  ngOnDestroy(): void {
    this.offTheme?.();
    this.editor?.dispose();
    this.editor = null;
  }
}
