'use client';

import { useEffect } from 'react';

const copyIcon =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>';

const checkIcon =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

function addCopyButtons(root = document) {
  const pres = root.querySelectorAll('.art-text pre');

  pres.forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copiar código');
    btn.setAttribute('title', 'Copiar');
    btn.innerHTML = copyIcon;

    btn.addEventListener('click', async () => {
      const codeEl = pre.querySelector('code');
      const code = codeEl?.innerText ?? '';
      if (!code) return;

      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      };

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          fallback();
        }
        btn.classList.add('copied');
        btn.innerHTML = checkIcon;
        btn.setAttribute('title', '¡Copiado!');
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = copyIcon;
          btn.setAttribute('title', 'Copiar');
        }, 1200);
      } catch {
        fallback();
        btn.classList.add('copied');
        btn.innerHTML = checkIcon;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = copyIcon;
        }, 1200);
      }
    });

    pre.appendChild(btn);
  });
}

export default function CodeCopyEnhancer() {
  useEffect(() => {
    addCopyButtons();
    const mo = new MutationObserver(() => addCopyButtons());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
