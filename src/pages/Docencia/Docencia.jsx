import React from 'react';
import './Docencia.css';

const Docencia = () => {
  const cursos = [
    {
      id: 1,
      titulo: 'Desarrollo Web con React',
      descripcion: 'Aprende a crear aplicaciones web modernas con React, desde los fundamentos hasta técnicas avanzadas.',
      nivel: 'Intermedio',
      duracion: '40 horas',
      temas: ['Components', 'Hooks', 'Router', 'State Management'],
      icono: '⚛️'
    },
    {
      id: 2,
      titulo: 'JavaScript Moderno (ES6+)',
      descripcion: 'Domina las características modernas de JavaScript y mejora tu código con las últimas funcionalidades.',
      nivel: 'Principiante',
      duracion: '30 horas',
      temas: ['Arrow Functions', 'Async/Await', 'Modules', 'Destructuring'],
      icono: '📜'
    },
    {
      id: 3,
      titulo: 'Node.js y Express',
      descripcion: 'Construye APIs REST escalables y aprende backend development con Node.js.',
      nivel: 'Intermedio',
      duracion: '35 horas',
      temas: ['Express', 'MongoDB', 'Authentication', 'REST APIs'],
      icono: '🟢'
    },
    {
      id: 4,
      titulo: 'Git y GitHub',
      descripcion: 'Control de versiones profesional y colaboración en proyectos de desarrollo.',
      nivel: 'Principiante',
      duracion: '15 horas',
      temas: ['Commits', 'Branches', 'Pull Requests', 'CI/CD'],
      icono: '🔀'
    }
  ];

  const recursos = [
    {
      id: 1,
      titulo: 'Guía de React Hooks',
      tipo: 'PDF',
      descripcion: 'Guía completa sobre todos los hooks de React con ejemplos prácticos.',
      enlace: '#'
    },
    {
      id: 2,
      titulo: 'Cheatsheet JavaScript ES6+',
      tipo: 'PDF',
      descripcion: 'Referencia rápida de sintaxis moderna de JavaScript.',
      enlace: '#'
    },
    {
      id: 3,
      titulo: 'Ejercicios de Algoritmos',
      tipo: 'GitHub',
      descripcion: 'Colección de ejercicios de algoritmos con soluciones.',
      enlace: '#'
    }
  ];

  const getNivelColor = (nivel) => {
    switch(nivel) {
      case 'Principiante':
        return 'nivel-principiante';
      case 'Intermedio':
        return 'nivel-intermedio';
      case 'Avanzado':
        return 'nivel-avanzado';
      default:
        return '';
    }
  };

  return (
    <div className="page docencia-page">
      <h1>Docencia</h1>
      <p className="page-intro">
        Comparto mi conocimiento a través de cursos, tutoriales y recursos educativos. 
        Mi objetivo es ayudar a otros desarrolladores a crecer en sus habilidades técnicas.
      </p>

      {/* Sección de Cursos */}
      <section className="section">
        <h2>📚 Cursos y Talleres</h2>
        <div className="cursos-grid">
          {cursos.map(curso => (
            <div key={curso.id} className="curso-card">
              <div className="curso-header">
                <div className="curso-icono">{curso.icono}</div>
                <span className={`nivel-badge ${getNivelColor(curso.nivel)}`}>
                  {curso.nivel}
                </span>
              </div>
              <h3>{curso.titulo}</h3>
              <p>{curso.descripcion}</p>
              
              <div className="curso-info">
                <span className="info-item">
                  ⏱️ {curso.duracion}
                </span>
              </div>

              <div className="temas-list">
                <strong>Temas:</strong>
                <div className="temas-tags">
                  {curso.temas.map((tema, index) => (
                    <span key={index} className="tema-tag">{tema}</span>
                  ))}
                </div>
              </div>

              <button className="btn-curso">Más información</button>
            </div>
          ))}
        </div>
      </section>

      {/* Sección de Recursos */}
      <section className="section">
        <h2>📖 Recursos Gratuitos</h2>
        <div className="recursos-list">
          {recursos.map(recurso => (
            <div key={recurso.id} className="recurso-item">
              <div className="recurso-tipo">{recurso.tipo}</div>
              <div className="recurso-content">
                <h3>{recurso.titulo}</h3>
                <p>{recurso.descripcion}</p>
              </div>
              <a href={recurso.enlace} className="btn-descargar">
                Descargar
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-docencia">
        <h2>¿Interesado en clases personalizadas?</h2>
        <p>Ofrezco mentoría individual y clases grupales adaptadas a tus necesidades.</p>
        <a href="/contacto" className="btn-primary">Contáctame</a>
      </section>
    </div>
  );
};

export default Docencia;