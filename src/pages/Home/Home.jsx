import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  // Array de frases dinámicas
  const phrases = [
    "Desarrollo Apps para iOS y Android.",
    "Desarrollo de Microservicios y APIs.",
    "Desarrollo Apps Web Innovadoras.",
    "Arquitectura de Software Escalable.",
    "Soluciones Backend con Spring Boot."
  ];

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentPhraseIndex((prevIndex) => 
          (prevIndex + 1) % phrases.length
        );
        setIsAnimating(false);
      }, 500);
    }, 3500); // Cambia cada 3.5 segundos

    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <div className="home-page">
      {/* Hero Section con fondo */}
      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content-wrapper">
          <div className="hero-text">
            <h1 className="hero-main-title">
              Bienvenido a Mi<br />
              Espacio Artístico<br />
              en la Web.
            </h1>
            <p className={`hero-code-text ${isAnimating ? 'fade-out' : 'fade-in'}`}>
              <span className="code-tag">&lt;code&gt;</span>
              {' '}{phrases[currentPhraseIndex]}{' '}
              <span className="code-tag">&lt;/code&gt;</span>
            </p>
            <Link to="/proyectos" className="btn-explore">
              EXPLORA AHORA
            </Link>
          </div>
          <div className="hero-image-container">
            <img 
              src="/images/Foto_GM.jpg" 
              alt="Geovanny Mendoza" 
              className="hero-profile-image"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <div className="stat-number">11 +</div>
          <div className="stat-label">Años de Experiencia</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">10000 +</div>
          <div className="stat-label">Líneas de Código</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">1000 +</div>
          <div className="stat-label">Tazas de café</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">5 +</div>
          <div className="stat-label">Países Visitados</div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <h2 className="section-title">Mis Servicios</h2>
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon">💻</div>
            <h3>Codificación y Desarrollo</h3>
            <p>Permíteme ayudarte a construir tus productos, diseñar una robusta infraestructura del backend para aplicaciones web.</p>
            <Link to="/servicios" className="service-link">Más información →</Link>
          </div>
          <div className="service-card">
            <div className="service-icon">🎓</div>
            <h3>Capacitación</h3>
            <p>Potencia el conocimiento de tu equipo con mis talleres y capacitaciones, adaptados a todos los niveles.</p>
            <Link to="/servicios" className="service-link">Más información →</Link>
          </div>
          <div className="service-card">
            <div className="service-icon">🛠️</div>
            <h3>Soluciones de Software a Medida</h3>
            <p>Me tomo muy en serio la responsabilidad de ofrecerte la mejor calidad, siguiendo los principios del Manifiesto de la Artesanía del Software.</p>
            <Link to="/servicios" className="service-link">Más información →</Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>¿Listo para trabajar juntos?</h2>
        <p>
          Cuéntame sobre tu proyecto y veamos cómo puedo ayudarte a alcanzar tus objetivos.
        </p>
        <Link to="/contacto" className="btn-primary">
          Contáctame ahora
        </Link>
      </section>
    </div>
  );
};

export default Home;