// Type declarations for CodeMirror and related modules
declare module '@uiw/react-codemirror' {
  import { ReactNode } from 'react';
  
  export interface CodeMirrorProps {
    value?: string;
    height?: string;
    minHeight?: string;
    maxHeight?: string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    theme?: any;
    extensions?: any[];
    onChange?: (value: string, viewUpdate: any) => void;
    basicSetup?: boolean | Record<string, boolean>;
    editable?: boolean;
    readOnly?: boolean;
    indentWithTab?: boolean;
    autoFocus?: boolean;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
  }
  
  export default function CodeMirror(props: CodeMirrorProps): ReactNode;
  
  export function useCodeMirror(props: Partial<CodeMirrorProps> & { container?: HTMLElement | null }): {
    state: any;
    setState: any;
    view: any;
    setView: any;
    container: HTMLElement | null;
    setContainer: any;
  };
}

declare module '@codemirror/lang-javascript' {
  export function javascript(config?: { jsx?: boolean }): any;
}

declare module '@codemirror/lang-python' {
  export function python(): any;
}

declare module '@uiw/codemirror-theme-dracula' {
  export const dracula: any;
}

declare module 'react-dnd' {
  import { ReactNode } from 'react';
  
  export function useDrag(spec: any): [any, any, any];
  export function useDrop(spec: any): [any, any, any];
  export function DndProvider(props: { backend: any; children: ReactNode }): ReactNode;
}

declare module 'react-dnd-html5-backend' {
  const HTML5Backend: any;
  export { HTML5Backend };
} 