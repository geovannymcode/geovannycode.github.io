import React, { useState } from 'react';
import './Contacto.css';

const Contacto = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    asunto: '',
    mensaje: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.asunto.trim()) {
      newErrors.asunto = 'El asunto es requerido';
    }

    if (!formData.mensaje.trim()) {
      newErrors.mensaje = 'El mensaje es requerido';
    } else if (formData.mensaje.trim().length < 10) {
      newErrors.mensaje = 'El mensaje debe tener al menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      console.log('Formulario enviado:', formData);
      setSubmitSuccess(true);
      setIsSubmitting(false);
      
      setFormData({
        nombre: '',
        email: '',
        asunto: '',
        mensaje: ''
      });

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    }, 1500);
  };

  return (
    <div className="page contacto-page">
      <h1>Contacto</h1>
      <p className="page-intro">
        ¿Tienes alguna pregunta, proyecto en mente o simplemente quieres saludar? 
        No dudes en escribirme. ¡Me encantaría saber de ti!
      </p>

      <div className="contacto-container">
        {/* Información de contacto */}
        <div className="contacto-info">
          <h2>Información de Contacto</h2>
          
          <div className="info-card">
            <div className="info-icon">📧</div>
            <div>
              <h3>Email</h3>
              <a href="mailto:me@geovannycode.com">me@geovannycode.com</a>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">💼</div>
            <div>
              <h3>LinkedIn</h3>
              <a href="https://linkedin.com/in/geovannycode" target="_blank" rel="noopener noreferrer">
                linkedin.com/in/geovannycode
              </a>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">🐙</div>
            <div>
              <h3>GitHub</h3>
              <a href="https://github.com/geovannymcode" target="_blank" rel="noopener noreferrer">
                github.com/geovannymcode
              </a>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">🐦</div>
            <div>
              <h3>Twitter</h3>
              <a href="https://twitter.com/geovannycode" target="_blank" rel="noopener noreferrer">
                @geovannycode
              </a>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">💬</div>
            <div>
              <h3>Telegram</h3>
              <a href="https://t.me/geovannycode" target="_blank" rel="noopener noreferrer">
                @geovannycode
              </a>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">📸</div>
            <div>
              <h3>Instagram</h3>
              <a href="https://instagram.com/geovannycode" target="_blank" rel="noopener noreferrer">
                @geovannycode
              </a>
            </div>
          </div>

          <div className="disponibilidad">
            <h3>📅 Disponibilidad</h3>
            <p>
              <strong>País:</strong> Colombia 🇨🇴<br/>
              <strong>Ciudad:</strong> Barranquilla<br/>
              <strong>Trabajo:</strong> 100% Remoto<br/>
              <strong>Tiempo de respuesta:</strong> 24-48 horas
            </p>
          </div>
        </div>

        {/* Formulario de contacto */}
        <div className="contacto-form-container">
          <h2>Envíame un mensaje</h2>
          
          {submitSuccess && (
            <div className="success-message">
              ✅ ¡Mensaje enviado con éxito! Te responderé pronto.
            </div>
          )}

          <form onSubmit={handleSubmit} className="contacto-form">
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={errors.nombre ? 'error' : ''}
                placeholder="Tu nombre"
              />
              {errors.nombre && <span className="error-message">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="tu@email.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="asunto">Asunto *</label>
              <input
                type="text"
                id="asunto"
                name="asunto"
                value={formData.asunto}
                onChange={handleChange}
                className={errors.asunto ? 'error' : ''}
                placeholder="¿De qué quieres hablar?"
              />
              {errors.asunto && <span className="error-message">{errors.asunto}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="mensaje">Mensaje *</label>
              <textarea
                id="mensaje"
                name="mensaje"
                value={formData.mensaje}
                onChange={handleChange}
                className={errors.mensaje ? 'error' : ''}
                rows="6"
                placeholder="Escribe tu mensaje aquí..."
              />
              {errors.mensaje && <span className="error-message">{errors.mensaje}</span>}
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contacto;