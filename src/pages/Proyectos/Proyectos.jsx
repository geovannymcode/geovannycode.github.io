import React from 'react';
import './Proyectos.css';

const Proyectos = () => {
  const proyectos = [
    {
      id: 1,
      title: 'Portfolio Personal',
      description: 'Sitio web personal construido con React y Vite',
      technologies: ['React', 'Vite', 'CSS3'],
      github: 'https://github.com/geovannycode/portfolio',
      demo: 'https://geovannycode.com',
      image: '💼'
    },
    {
      id: 2,
      title: 'E-commerce App',
      description: 'Aplicación de comercio electrónico con carrito de compras',
      technologies: ['React', 'Node.js', 'MongoDB'],
      github: 'https://github.com/geovannycode/ecommerce',
      demo: null,
      image: '🛒'
    },
    {
      id: 3,
      title: 'Blog Platform',
      description: 'Plataforma de blogging con editor de Markdown',
      technologies: ['React', 'Express', 'PostgreSQL'],
      github: 'https://github.com/geovannycode/blog',
      demo: 'https://myblog-demo.com',
      image: '📝'
    }
  ];

  return (
    <div className="page proyectos-page">
      <h1>Mis Proyectos</h1>
      <p className="page-description">
        Aquí encontrarás una selección de proyectos en los que he trabajado, 
        desde aplicaciones web completas hasta experimentos y aprendizajes.
      </p>

      <div className="proyectos-grid">
        {proyectos.map(proyecto => (
          <div key={proyecto.id} className="proyecto-card">
            <div className="proyecto-icon">{proyecto.image}</div>
            <h3>{proyecto.title}</h3>
            <p>{proyecto.description}</p>
            
            <div className="technologies">
              {proyecto.technologies.map((tech, index) => (
                <span key={index} className="tech-tag">{tech}</span>
              ))}
            </div>

            <div className="proyecto-links">
              {proyecto.github && (
                <a 
                  href={proyecto.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  GitHub
                </a>
              )}
              {proyecto.demo && (
                <a 
                  href={proyecto.demo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-link demo"
                >
                  Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Proyectos;