import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/" onClick={closeMenu}>
            <h2>Geovanny<span className="logo-dot">.</span>Code</h2>
          </Link>
        </div>

        <button className="navbar-toggle" onClick={toggleMenu}>
          <span className={isOpen ? 'toggle-icon open' : 'toggle-icon'}>☰</span>
        </button>

        <ul className={isOpen ? 'navbar-menu active' : 'navbar-menu'}>
          <li className="navbar-item">
            <Link to="/" className="navbar-link" onClick={closeMenu}>
              🏠 Home
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/info" className="navbar-link" onClick={closeMenu}>
              👤 Info
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/proyectos" className="navbar-link" onClick={closeMenu}>
              💼 Proyectos
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/docencia" className="navbar-link" onClick={closeMenu}>
              📚 Docencia
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/blogs" className="navbar-link" onClick={closeMenu}>
              ✍️ Blog
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/contacto" className="navbar-link" onClick={closeMenu}>
              📧 Contacto
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;