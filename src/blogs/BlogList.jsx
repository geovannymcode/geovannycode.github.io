import React, { useState } from 'react';
import './BlogList.css';

const BlogList = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const blogPosts = [
    {
      id: 1,
      title: 'Introducción a React Hooks',
      excerpt: 'Aprende cómo los hooks revolucionaron la forma en que escribimos componentes en React. Exploramos useState, useEffect y más.',
      date: '2025-10-05',
      category: 'React',
      readTime: '8 min',
      image: '⚛️'
    },
    {
      id: 2,
      title: 'Configurando Vite para proyectos React',
      excerpt: 'Guía completa para configurar Vite desde cero. Descubre por qué Vite es más rápido que Create React App.',
      date: '2025-09-28',
      category: 'Herramientas',
      readTime: '6 min',
      image: '⚡'
    },
    {
      id: 3,
      title: 'JavaScript ES2024: Nuevas características',
      excerpt: 'Explora las últimas funcionalidades añadidas a JavaScript en 2024 y cómo pueden mejorar tu código.',
      date: '2025-09-20',
      category: 'JavaScript',
      readTime: '10 min',
      image: '📜'
    },
    {
      id: 4,
      title: 'APIs REST con Node.js y Express',
      excerpt: 'Crea una API REST completa desde cero. Incluye autenticación, validación y mejores prácticas.',
      date: '2025-09-15',
      category: 'Backend',
      readTime: '12 min',
      image: '🟢'
    },
    {
      id: 5,
      title: 'CSS Grid vs Flexbox: Cuándo usar cada uno',
      excerpt: 'Entender las diferencias entre Grid y Flexbox te ayudará a crear layouts más eficientes.',
      date: '2025-09-08',
      category: 'CSS',
      readTime: '7 min',
      image: '🎨'
    },
    {
      id: 6,
      title: 'Testing en React con Jest y Testing Library',
      excerpt: 'Aprende a escribir tests efectivos para tus componentes de React y mejora la calidad de tu código.',
      date: '2025-08-30',
      category: 'Testing',
      readTime: '15 min',
      image: '🧪'
    }
  ];

  const categories = ['Todos', 'React', 'JavaScript', 'Backend', 'CSS', 'Testing', 'Herramientas'];

  const filteredPosts = selectedCategory === 'Todos' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="page blog-page">
      <div className="blog-header">
        <h1>Blog</h1>
        <p className="blog-subtitle">
          Artículos sobre desarrollo web, programación y tecnología. 
          Comparto lo que aprendo en mi día a día como desarrollador.
        </p>
      </div>

      {/* Filtros por categoría */}
      <div className="category-filters">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Lista de posts */}
      <div className="blog-grid">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <article key={post.id} className="blog-card">
              <div className="blog-image">{post.image}</div>
              
              <div className="blog-content">
                <div className="blog-meta">
                  <span className="blog-category">{post.category}</span>
                  <span className="blog-date">{formatDate(post.date)}</span>
                </div>

                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>

                <div className="blog-footer">
                  <span className="read-time">📖 {post.readTime} lectura</span>
                  <button className="btn-read">Leer más →</button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="no-posts">
            <p>No hay posts en esta categoría todavía.</p>
          </div>
        )}
      </div>

      {/* CTA Newsletter */}
      <div className="newsletter-cta">
        <h2>📬 Suscríbete al Newsletter</h2>
        <p>Recibe los últimos artículos directamente en tu correo. Sin spam, lo prometo.</p>
        <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="tu@email.com" 
            className="newsletter-input"
          />
          <button type="submit" className="btn-subscribe">
            Suscribirse
          </button>
        </form>
      </div>
    </div>
  );
};

export default BlogList;