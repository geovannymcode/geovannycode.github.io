import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './MarkdownRenderer.css';

const MarkdownRenderer = ({ filePath }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error('No se pudo cargar el contenido');
        }
        const text = await response.text();
        setContent(text);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error cargando markdown:', err);
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      loadMarkdown();
    }
  }, [filePath]);

  if (loading) {
    return (
      <div className="markdown-loading">
        <div className="loader"></div>
        <p>Cargando contenido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="markdown-error">
        <p>⚠️ Error al cargar el contenido</p>
        <small>{error}</small>
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({node, ...props}) => <h1 className="md-h1" {...props} />,
          h2: ({node, ...props}) => <h2 className="md-h2" {...props} />,
          h3: ({node, ...props}) => <h3 className="md-h3" {...props} />,
          p: ({node, ...props}) => <p className="md-paragraph" {...props} />,
          a: ({node, ...props}) => (
            <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          code: ({node, inline, ...props}) => 
            inline ? (
              <code className="md-code-inline" {...props} />
            ) : (
              <code className="md-code-block" {...props} />
            ),
          ul: ({node, ...props}) => <ul className="md-list" {...props} />,
          ol: ({node, ...props}) => <ol className="md-list-ordered" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="md-blockquote" {...props} />,
          img: ({node, ...props}) => <img className="md-image" loading="lazy" {...props} />,
          table: ({node, ...props}) => <table className="md-table" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;