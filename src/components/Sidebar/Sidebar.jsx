import React from 'react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {/* Foto de perfil */}
        <div className="profile-section">
          <div className="profile-image">
            <img src="/images/Foto_Geovanny.png" alt="Geovanny Mendoza" />
            <div className="status-badge">
              <span className="status-emoji">🇨🇴</span>
            </div>
          </div>
          <h2 className="profile-name">Geovanny Mendoza</h2>
          <p className="profile-title">Freelance Architect & Developer</p>
          <div className="profile-tech">
            <span className="tech-item">🍃 Java</span>
            <span className="tech-separator">·</span>
            <span className="tech-item">Spring</span>
            <span className="tech-separator">·</span>
            <span className="tech-item">Kotlin</span>
          </div>
        </div>

        {/* Idiomas */}
        <div className="sidebar-section languages-section">
          <div className="sidebar-item">
            <span className="flag-icon">🇬🇧</span>
            <span className="item-text">Ingles</span>
          </div>
          <div className="sidebar-item">
            <span className="flag-icon">🇧🇷</span>
            <span className="item-text">Português</span>
          </div>
        </div>

        {/* Codificación */}
        <div className="sidebar-section">
          <h3 className="section-title">Codificación</h3>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Java</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Kotlin</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Spring</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Golang</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Vaadin</span>
          </div>
        </div>

        {/* Conocimiento */}
        <div className="sidebar-section">
          <h3 className="section-title">Conocimiento</h3>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Java, Kotlin</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Spring, SpringBoot, Spring Security, Spring Cloud</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Hibernate/JPA, PostgreSQL</span>
          </div>
          <div className="sidebar-item">
            <span className="item-bullet">▫</span>
            <span className="item-text">Redis, MongoDB, Kafka, Jenkins</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;