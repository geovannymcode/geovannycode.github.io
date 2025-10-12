import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home/Home';
import Info from './pages/Info/Info';
import Servicios from './pages/Servicios/Servicios';
import Proyectos from './pages/Proyectos/Proyectos';
import Docencia from './pages/Docencia/Docencia';
import Contacto from './pages/Contacto/Contacto';
import Legal from './pages/Legal/Legal';
import BlogList from './blogs/BlogList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/info" element={<Info />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/proyectos" element={<Proyectos />} />
            <Route path="/docencia" element={<Docencia />} />
            <Route path="/blogs" element={<BlogList />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>© 2025 Geovanny.Code - Todos los derechos reservados</p>
          <p>
            <a href="https://github.com/geovannycode" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            {' · '}
            <a href="/legal">Licencia</a>
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;