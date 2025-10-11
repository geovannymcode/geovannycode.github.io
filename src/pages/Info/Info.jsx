import React, { useState } from 'react';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import './info.css';

const Info = () => {
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = {
    personal: {
      title: '📋 Personal',
      path: '/content/info/personal.md'
    },
    formacion: {
      title: '🎓 Formación',
      path: '/content/info/formacion.md'
    },
    tecnologias: {
      title: '💻 Tecnologías',
      path: '/content/info/tecnologias.md'
    }
  };

  return (
    <div className="page info-page">
      <h1>Información</h1>
      
      <div className="tabs">
        {Object.entries(tabs).map(([key, tab]) => (
          <button
            key={key}
            className={`tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <MarkdownRenderer filePath={tabs[activeTab].path} />
      </div>
    </div>
  );
};

export default Info;