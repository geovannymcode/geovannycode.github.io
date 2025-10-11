import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Hola, soy <span className="highlight">Geovanny</span>
          </h1>
          <p className="hero-subtitle">
            Desarrollador Full Stack | Apasionado por el código limpio y las soluciones innovadoras
          </p>
          <div className="hero-buttons">
            <Link to="/proyectos" className="btn-primary">
              Ver Proyectos
            </Link>
            <Link to="/contacto" className="btn-secondary">
              Contactar
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="code-animation">
            <pre>
              <code>{`const developer = {
  name: "Geovanny",
  skills: ["React", "Node.js"],
  passion: "Crear soluciones"
};`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <h2>Sobre Mí</h2>
        <p>
          Soy un desarrollador apasionado por crear experiencias web excepcionales. 
          Me especializo en tecnologías modernas como React, Node.js y más. 
          Mi objetivo es construir soluciones que no solo funcionen, sino que también 
          sean mantenibles, escalables y eficientes.
        </p>
        <Link to="/info" className="link-arrow">
          Conoce más sobre mí →
        </Link>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <h2>Tecnologías</h2>
        <div className="skills-grid">
          <div className="skill-card">
            <div className="skill-icon">⚛️</div>
            <h3>Frontend</h3>
            <p>React, JavaScript, HTML5, CSS3, Vite</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">🔧</div>
            <h3>Backend</h3>
            <p>Node.js, Express, APIs REST, MongoDB</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">🚀</div>
            <h3>DevOps</h3>
            <p>Git, GitHub Actions, Docker, CI/CD</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">📱</div>
            <h3>Otros</h3>
            <p>Responsive Design, PWA, SEO, Testing</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>¿Listo para trabajar juntos?</h2>
        <p>
          Estoy disponible para proyectos freelance, colaboraciones y 
          oportunidades de tiempo completo.
        </p>
        <Link to="/contacto" className="btn-primary">
          Hablemos
        </Link>
      </section>
    </div>
  );
};

export default Home;