'use client';

import { useEffect, useRef } from 'react';

const copyIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>`;
const checkIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

const langMap = {
  java: 'Java', kotlin: 'Kotlin', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', yaml: 'YAML', yml: 'YAML',
  xml: 'XML', html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash',
  shell: 'Shell', sql: 'SQL', python: 'Python', py: 'Python', go: 'Go',
  rust: 'Rust', dockerfile: 'Dockerfile', gradle: 'Gradle', groovy: 'Groovy',
  properties: 'Properties', jsx: 'JSX', tsx: 'TSX', scss: 'SCSS', sass: 'SASS'
};

function detectLang(codeEl) {
  if (!codeEl) return '';
  const classes = codeEl.className || '';
  const match = classes.match(/language-(\w+)/);
  if (match) {
    const lang = match[1].toLowerCase();
    return langMap[lang] || lang.toUpperCase();
  }
  return '';
}

function enhanceAllCodeBlocks() {
  const preElements = document.querySelectorAll('.art-text pre');

  preElements.forEach(pre => {
    // Verificar si ya fue procesado
    if (pre.parentElement?.classList.contains('code-block')) return;
    if (pre.dataset.enhanced === 'true') return;

    pre.dataset.enhanced = 'true';

    const codeEl = pre.querySelector('code');
    const lang = detectLang(codeEl);
    const rawText = codeEl?.textContent || pre.textContent || '';

    // Contar líneas - remover líneas vacías al inicio y al final
    let lines = rawText.split('\n');

    // Remover línea vacía al inicio si existe
    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
    // Remover línea vacía al final si existe
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }

    const lineCount = Math.max(1, lines.length);

    // Crear estructura
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    // Header con lenguaje y botón copiar
    const header = document.createElement('div');
    header.className = 'code-header';

    const langSpan = document.createElement('span');
    langSpan.className = 'code-lang';
    langSpan.textContent = lang;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-copy';
    copyBtn.innerHTML = `${copyIcon}<span>Copy</span>`;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawText.trim());
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = rawText.trim();
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(textarea);
      }
      copyBtn.innerHTML = `${checkIcon}<span>Copied!</span>`;
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = `${copyIcon}<span>Copy</span>`;
        copyBtn.classList.remove('copied');
      }, 2000);
    });

    header.appendChild(langSpan);
    header.appendChild(copyBtn);

    // Body con números y código
    const body = document.createElement('div');
    body.className = 'code-body';

    // Números de línea
    const nums = document.createElement('div');
    nums.className = 'code-nums';
    nums.setAttribute('aria-hidden', 'true');
    for (let i = 1; i <= lineCount; i++) {
      const span = document.createElement('span');
      span.textContent = i;
      nums.appendChild(span);
    }

    // Contenedor del código
    const content = document.createElement('div');
    content.className = 'code-content';

    // Clonar el pre original
    const preClone = pre.cloneNode(true);
    delete preClone.dataset.enhanced;
    content.appendChild(preClone);

    body.appendChild(nums);
    body.appendChild(content);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    // Reemplazar el pre original
    pre.parentNode.insertBefore(wrapper, pre);
    pre.remove();
  });
}

export default function CodeCopyEnhancer() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const timer = setTimeout(() => {
      enhanceAllCodeBlocks();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
