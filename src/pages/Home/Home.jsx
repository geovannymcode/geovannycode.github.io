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
    }, 3500);

    return () => clearInterval(interval);
  }, [phrases.length]);

  // Recomendaciones
  const recommendations = [
    {
      id: 1,
      name: "Silvia Carolina Moreno Trillos",
      title: "PhD. Ingeniería de Sistemas y Computación",
      photo: "/images/recomendaciones/silvia.jpeg",
      rating: 5,
      text: "Geovanny es uno de los mejores programadores que conozco, experto especialmente en el lenguaje Java. Además es una excelente persona y tiene una forma de explicar muy didáctica y fácil de entender."
    },
    {
      id: 2,
      name: "Aristides Villarreal Bravo",
      title: "Java champions",
      photo: "/images/recomendaciones/aristides.png",
      rating: 5,
      text: "Geovanny es un destacado contribuyente en la comunidad de desarrolladores Java y Kotlin, compartiendo sus profundos conocimientos. He colaborado con él en diversos proyectos y coescrito un libro con Otavio Santana, donde Geovanny aportó capítulos excepcionales sobre Vaadin. Posee grandes cualidades profesionales y personales."
    },
    {
      id: 3,
      name: "Betzabe Salas",
      title: "Esp. Ingeniería de Software",
      photo: "/images/recomendaciones/betzabe.jpeg",
      rating: 5,
      text: "Geo es un experto destacado en Java y Kotlin, reconocido por su habilidad para liderar equipos y comunidades de desarrolladores con eficacia. Su rol al frente de la comunidad Java Jug Barranquilla demuestra su compromiso y capacidad para motivar a otros. Más allá de su expertise técnico, Geo sobresale en la enseñanza y la transmisión de conocimientos, enriqueciendo a cada equipo o proyecto con su participación."
    },
    {
      id: 4,
      name: "Ricardo Cantillo",
      title: "Java EE, Vaadin, Spring Boot, Expositor & Docente",
      photo: "/images/recomendaciones/ricardo.jpg",
      rating: 5,
      text: "Geovanny, líder del Grupo de Usuarios de Java en Barranquilla, es un apasionado desarrollador y speaker. Su compromiso con la comunidad se refleja en su dedicación para enseñar sobre la tecnología de Java. ¡Un referente inspirador en el campo!"
    }
  ];

  const [currentRecommendation, setCurrentRecommendation] = useState(0);

  const nextRecommendation = () => {
    setCurrentRecommendation((prev) => 
      prev === recommendations.length - 1 ? 0 : prev + 1
    );
  };

  const prevRecommendation = () => {
    setCurrentRecommendation((prev) => 
      prev === 0 ? recommendations.length - 1 : prev - 1
    );
  };

  // Logos de clientes
const clients = [
    { 
      id: 1, 
      name: "SysViewSoft", 
      logo: "/images/clientes/sysviewsoft.png",
      url: "https://www.sysviewsoft.com"
    },
    { 
      id: 2, 
      name: "NobleProg", 
      logo: "/images/clientes/nobleprog.png",
      url: "https://www.nobleprog.com"
    },
    { 
      id: 3, 
      name: "Mision TIC 2022", 
      logo: "/images/clientes/womentic2022.png",
      url: "https://womenintic.com"
    },
    { 
      id: 4, 
      name: "Complemento 360", 
      logo: "/images/clientes/complemento360.png",
      url: "https://www.complemento360.com"
    },
    { 
      id: 5, 
      name: "ClubHub", 
      logo: "/images/clientes/clubhub.png",
      url: "https://clubhub.com"
    }
  ];

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

      {/* Recommendations Section */}
      <section className="recommendations-section">
        <h2 className="section-title">Recomendaciones</h2>
        <div className="recommendations-carousel">
          <button 
            className="carousel-btn prev-btn" 
            onClick={prevRecommendation}
            aria-label="Recomendación anterior"
          >
            ‹
          </button>

          <div className="recommendation-card">
            <div className="recommendation-header">
              <img 
                src={recommendations[currentRecommendation].photo} 
                alt={recommendations[currentRecommendation].name}
                className="recommendation-photo"
              />
              <div className="recommendation-info">
                <h3>{recommendations[currentRecommendation].name}</h3>
                <p className="recommendation-title">
                  {recommendations[currentRecommendation].title}
                </p>
              </div>
            </div>
            <p className="recommendation-text">
              {recommendations[currentRecommendation].text}
            </p>
            <div className="recommendation-rating">
              {[...Array(recommendations[currentRecommendation].rating)].map((_, i) => (
                <span key={i} className="rating-box"></span>
              ))}
            </div>
          </div>

          <button 
            className="carousel-btn next-btn" 
            onClick={nextRecommendation}
            aria-label="Siguiente recomendación"
          >
            ›
          </button>
        </div>

        <div className="carousel-indicators">
          {recommendations.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentRecommendation ? 'active' : ''}`}
              onClick={() => setCurrentRecommendation(index)}
              aria-label={`Ir a recomendación ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Clients Section */}
      <section className="clients-section">
        <div className="clients-grid">
          {clients.map(client => (
            <div key={client.id} className="client-logo">
              <img 
                src={client.logo} 
                alt={client.name}
                title={client.name}
              />
            </div>
          ))}
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