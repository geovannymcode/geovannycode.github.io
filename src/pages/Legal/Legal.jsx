import React from 'react';
import './Legal.css';

const Legal = () => {
  return (
    <div className="page legal-page">
      <h1>Información Legal</h1>
      
      <div className="legal-content">
        {/* Licencia */}
        <section className="legal-section">
          <h2>📄 Licencia del Proyecto</h2>
          <div className="license-badge">
            <img 
              src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" 
              alt="Licencia Creative Commons"
            />
            <p>Creative Commons BY-NC-SA 4.0</p>
          </div>
          
          <p>
            Este sitio web y su contenido están licenciados bajo la 
            <strong> Licencia Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional</strong>.
          </p>

          <h3>Esto significa que puedes:</h3>
          <ul className="permisos-list permitido">
            <li>✅ <strong>Compartir</strong> — copiar y redistribuir el material en cualquier medio o formato</li>
            <li>✅ <strong>Adaptar</strong> — remezclar, transformar y construir a partir del material</li>
            <li>✅ <strong>Usar</strong> el código para aprender y proyectos personales</li>
          </ul>

          <h3>Bajo las siguientes condiciones:</h3>
          <ul className="permisos-list condiciones">
            <li>🔵 <strong>Atribución</strong> — Debes dar crédito apropiado, proporcionar un enlace a la licencia e indicar si se han realizado cambios</li>
            <li>🔵 <strong>NoComercial</strong> — No puedes usar el material con fines comerciales</li>
            <li>🔵 <strong>CompartirIgual</strong> — Si remezclas, transformas o creas a partir del material, debes distribuir tus contribuciones bajo la misma licencia</li>
          </ul>

          <h3>No puedes:</h3>
          <ul className="permisos-list prohibido">
            <li>❌ Usar el contenido con fines comerciales sin permiso explícito</li>
            <li>❌ Aplicar términos legales o medidas tecnológicas que restrinjan legalmente a otros hacer cualquier cosa que permita la licencia</li>
          </ul>

          <a 
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-link"
          >
            Ver licencia completa →
          </a>
        </section>

        {/* Términos de Uso */}
        <section className="legal-section">
          <h2>📋 Términos de Uso</h2>
          
          <h3>Uso del Sitio Web</h3>
          <p>
            Este sitio web es proporcionado por Geovanny con fines informativos y educativos. 
            Al acceder y utilizar este sitio, aceptas cumplir con estos términos.
          </p>

          <h3>Propiedad Intelectual</h3>
          <p>
            Todo el contenido original de este sitio, incluyendo pero no limitado a textos, 
            gráficos, logos, imágenes, código fuente y diseño, es propiedad de Geovanny 
            o sus licenciantes y está protegido por las leyes de derechos de autor.
          </p>

          <h3>Enlaces Externos</h3>
          <p>
            Este sitio puede contener enlaces a sitios web de terceros. No somos responsables 
            del contenido de dichos sitios externos y no respaldamos necesariamente las opiniones 
            expresadas en ellos.
          </p>
        </section>

        {/* Privacidad */}
        <section className="legal-section">
          <h2>🔒 Política de Privacidad</h2>
          
          <h3>Recopilación de Información</h3>
          <p>
            Este sitio web no recopila información personal identificable sin tu consentimiento 
            explícito. Si nos contactas a través del formulario de contacto, únicamente utilizaremos 
            tu información para responder a tu consulta.
          </p>

          <h3>Cookies</h3>
          <p>
            Este sitio no utiliza cookies de seguimiento. Solo se utilizan cookies técnicas 
            necesarias para el funcionamiento básico del sitio.
          </p>

          <h3>Datos del Formulario de Contacto</h3>
          <p>
            Los datos proporcionados a través del formulario de contacto (nombre, email, mensaje) 
            se utilizan únicamente para responder a tu consulta y no se comparten con terceros.
          </p>

          <h3>Tus Derechos</h3>
          <p>
            Tienes derecho a acceder, rectificar o eliminar tus datos personales. 
            Para ejercer estos derechos, contáctame en contact@geovannycode.com
          </p>
        </section>

        {/* Descargo de Responsabilidad */}
        <section className="legal-section">
          <h2>⚠️ Descargo de Responsabilidad</h2>
          
          <p>
            La información proporcionada en este sitio web es solo para fines informativos generales. 
            Si bien me esfuerzo por mantener la información actualizada y correcta, no hago 
            representaciones ni garantías de ningún tipo sobre la integridad, precisión, 
            confiabilidad o disponibilidad del sitio o de la información contenida en el mismo.
          </p>

          <p>
            En ningún caso seré responsable de cualquier pérdida o daño, incluidos, entre otros, 
            pérdidas o daños indirectos o consecuentes, o cualquier pérdida o daño que surja de 
            la pérdida de datos o beneficios que surjan de, o en conexión con, el uso de este sitio web.
          </p>
        </section>

        {/* Derechos de Autor */}
        <section className="legal-section copyright">
          <h2>© Derechos de Autor</h2>
          <p>
            © 2025 Geovanny. Todos los derechos reservados, excepto donde se indique lo contrario 
            bajo la licencia Creative Commons.
          </p>
          <p>
            El código fuente de este proyecto está disponible en 
            <a href="https://github.com/geovannycode" target="_blank" rel="noopener noreferrer"> GitHub</a> 
            bajo la licencia especificada.
          </p>
        </section>

        {/* Contacto Legal */}
        <section className="legal-section contacto-legal">
          <h2>📧 Contacto Legal</h2>
          <p>
            Si tienes preguntas sobre estos términos legales o sobre el uso de este sitio, 
            por favor contáctame en:
          </p>
          <p className="contact-info">
            <strong>Email:</strong> legal@geovannycode.com<br/>
            <strong>Web:</strong> <a href="https://geovannycode.com">geovannycode.com</a>
          </p>
        </section>

        <div className="last-updated">
          <p>Última actualización: Octubre 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Legal;