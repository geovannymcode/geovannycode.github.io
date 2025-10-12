import React from 'react';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import './Servicios.css';

const Servicios = () => {
  return (
    <div className="page servicios-page">
      <MarkdownRenderer filePath="/content/servicios/servicios.md" />
    </div>
  );
};

export default Servicios;