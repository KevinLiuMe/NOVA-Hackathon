import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

const CodeEditor = ({ 
  value, 
  onChange, 
  language = 'python',
  theme = 'vs-dark'
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    // Define custom theme that matches your app's color scheme
    monaco.editor.defineTheme('customDarkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'operator', foreground: 'D4D4D4' }
      ],
      colors: {
        'editor.background': '#1a2b22',
        'editor.foreground': '#e1e6e3',
        'editor.lineHighlightBackground': '#2a3f35',
        'editorLineNumber.foreground': '#40675f',
        'editorIndentGuide.background': '#2a3f35',
      }
    });

    // Initialize editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: 'customDarkTheme',
      automaticLayout: false, // We'll handle layout manually
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      lineNumbers: 'on',
      roundedSelection: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      overviewRulerLanes: 0,
      lineHeight: 24,
      padding: { top: 16, bottom: 16 },
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: true,
      quickSuggestions: true,
      tabSize: 4,
      renderLineHighlight: 'all',
    });

    // Set up resize observer
    resizeObserverRef.current = new ResizeObserver(() => {
      // Debounce the layout call
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    });

    // Start observing the container
    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    // Set up change handler
    const changeDisposable = editorRef.current.onDidChangeModelContent(() => {
      onChange(editorRef.current.getValue());
    });

    // Cleanup
    return () => {
      changeDisposable.dispose();
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []); // Empty dependency array for initial setup only

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  // Update language when it changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
};

export default CodeEditor;