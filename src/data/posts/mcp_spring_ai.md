---
#preview
title: 'Spring Boot 4 y Spring Framework 7: La Evolución Deliberada del Desarrollo Java Empresarial'
date: '2025-11-07'
image: "/img/blog/1.png"
categories:
    - Backend
tags:
    - Java
    - Spring Boot
author: Geovanny Mendoza
short: Exploramos cómo las últimas versiones de Spring Boot y Spring Framework están transformando el desarrollo Java moderno con un enfoque más modular, eficiente y preparado para la nube.
---

# Spring AI + MCP: Fundamentos y Aplicaciones Prácticas para Desarrolladores

## Introducción: El Protocolo de Contexto de Modelo (MCP)

En el universo en constante evolución de la inteligencia artificial, los Modelos de Lenguaje Grande (LLMs) han revolucionado cómo interactuamos con la tecnología. Sin embargo, estos modelos tienen limitaciones inherentes: están entrenados con datos hasta cierto punto en el tiempo y no pueden acceder a información específica o propietaria sin ayuda. Es aquí donde entra el Protocolo de Contexto de Modelo (MCP).

El MCP es un estándar emergente que permite a los desarrolladores aumentar las capacidades de los LLMs con contexto personalizado y funcionalidades adicionales. Imagínelo como un "puente" que conecta los modelos de lenguaje con fuentes de datos y capacidades externas. A diferencia de las APIs tradicionales que conectan servicios con clientes, los MCP están diseñados específicamente para potenciar los LLMs, permitiéndoles acceder a información en tiempo real o ejecutar acciones que normalmente estarían fuera de su alcance.

## ¿Por qué necesitamos MCP? Limitaciones de los LLMs

Para entender la importancia del MCP, primero debemos comprender las limitaciones de los LLMs:

1. **Conocimiento congelado**: Los LLMs solo conocen información hasta su fecha de corte de entrenamiento. Cualquier evento o dato posterior es desconocido para ellos.

2. **Sin acceso a datos propietarios**: No tienen acceso natural a información específica de su empresa, documentos internos o bases de datos propietarias.

3. **Incapacidad para ejecutar acciones**: No pueden interactuar directamente con sistemas externos como APIs, bases de datos o servicios web.

4. **Sin acceso a información en tiempo real**: No pueden acceder a información actualizada sobre mercados financieros, clima, noticias recientes, etc.

Un ejemplo práctico: si pregunta a un LLM estándar "¿Cuál es el estado actual de nuestro servidor de producción?" o "¿Cuál fue el último correo electrónico de nuestro cliente principal?", no podrá responder con precisión porque carece de acceso a sus sistemas.

## Spring AI: El puente hacia el futuro de las aplicaciones IA

Spring AI es un proyecto de Spring que facilita la integración de capacidades de IA en aplicaciones Java. Ofrece una interfaz unificada para trabajar con varios proveedores de LLMs (OpenAI, Anthropic, Google Gemini, etc.) y simplifica significativamente la implementación de clientes y servidores MCP.

Las ventajas principales de utilizar Spring AI incluyen:

- **Abstracción del proveedor**: Escriba código una vez y cámbielo entre diferentes proveedores de LLMs sin modificaciones.
- **Integración nativa con el ecosistema Spring**: Aproveche todas las capacidades del ecosistema Spring que ya conoce.
- **Soporte completo para MCP**: Implementación simplificada tanto para clientes como servidores MCP.

## Configurando un Cliente MCP con Spring Boot

Vamos a ver cómo configurar un cliente MCP básico utilizando Spring Boot. Este cliente se conectará a un servidor MCP y utilizará sus capacidades para mejorar las respuestas de un LLM.

### Paso 1: Configuración del proyecto

Primero, cree un proyecto Spring Boot con las dependencias necesarias:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

### Paso 2: Configuración del cliente MCP

Configure su aplicación en el archivo `application.yml`:

```yaml
spring:
  application:
    name: mcp-client-example
  
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
    
    mcp:
      client:
        name: example-mcp-client
        version: 0.0.1
        tool-callbacks-enabled: true
        streamable-http:
          connections:
            companyData:
              url: https://mcp.example-geovannycode.com/mcp
            marketData:
              url: https://market-data-mcp.example.com/mcp
```

Este ejemplo configura un cliente MCP que se conecta a dos servidores MCP diferentes: uno para datos de la empresa y otro para datos de mercado.

## Tipos de Transporte para Servidores MCP

Spring AI soporta tres tipos principales de transporte para servidores MCP:

1. **Streamable HTTP**: El enfoque preferido para servidores MCP remotos. Utiliza HTTP para la comunicación y admite streaming de respuestas.

2. **SSE (Server-Sent Events)**: Utiliza eventos enviados por el servidor para comunicación unidireccional desde el servidor al cliente.

3. **STDIO (Standard Input/Output)**: Ideal para servidores MCP locales que se ejecutan en el mismo sistema.

La elección del transporte depende de su caso de uso específico y la ubicación del servidor MCP.

### Configuración de diferentes transportes:

Para STDIO (servidores locales):
```yaml
spring:
  ai:
    mcp:
      client:
        stdio:
          connections:
            localTool:
              command: ["python", "/path/to/local_mcp_server.py"]
```

Para SSE:
```yaml
spring:
  ai:
    mcp:
      client:
        sse:
          connections:
            sseServer:
              url: https://sse-mcp-server.example.com/mcp
```

## Integrando OpenAI con Servidores MCP

Una vez configurado el cliente MCP, necesitamos integrarlo con un LLM. Vamos a utilizar OpenAI como ejemplo, pero el proceso es similar para otros proveedores como Anthropic o Google Gemini.

```java
@RestController
public class ChatController {
    
    private final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private final ChatClient chatClient;
    
    public ChatController(ChatClient.Builder builder, 
                          ToolCallbackProvider toolCallbackProvider) {
        
        // Listar todas las herramientas disponibles
        Arrays.stream(toolCallbackProvider.getToolCallbacks())
              .forEach(tool -> 
                  logger.info("Tool callback found: {}", 
                      tool.getToolDefinition().getName()));
        
        // Configurar el cliente de chat con las herramientas MCP
        this.chatClient = builder
            .defaultToolCallbacks(toolCallbackProvider.getToolCallbacks())
            .build();
    }
    
    @GetMapping("/chat")
    public String chat(@RequestParam String message) {
        return chatClient.prompt(message).content().text();
    }
}
```

Este controlador configura un `ChatClient` con todas las herramientas disponibles del proveedor de callbacks de herramientas, y expone un endpoint `/chat` que acepta un mensaje y devuelve la respuesta del LLM aumentada con las capacidades de los servidores MCP.

## Implementaciones Posibles en Entornos Reales

### Caso 1: Sistema Financiero con Datos de Mercado en Tiempo Real

Imaginemos un banco que quiere proporcionar análisis financiero personalizado a sus clientes. Mediante un cliente MCP, pueden conectar su LLM a:

1. Un servidor MCP de datos de mercado en tiempo real
2. Un servidor MCP con el historial financiero del cliente
3. Un servidor MCP con recomendaciones de productos financieros

Cuando un cliente pregunta: **¿Debería invertir en acciones tecnológicas considerando mi cartera actual?**, el LLM puede:

- Obtener los datos de mercado más recientes
- Analizar la cartera actual del cliente
- Considerar su perfil de riesgo histórico
- Proporcionar recomendaciones personalizadas basadas en productos disponibles

Todo esto sin que el LLM tenga acceso directo a información sensible del cliente o datos de mercado propietarios.

### Caso 2: Sistema de Soporte Técnico Corporativo

Una empresa tecnológica podría implementar un asistente de soporte técnico que:

1. Accede a la documentación interna mediante un servidor MCP
2. Consulta el estado actual de los sistemas a través de otro servidor MCP
3. Puede abrir tickets de soporte mediante un tercer servidor MCP

Cuando un empleado pregunta: **¿Por qué no puedo acceder a la base de datos de clientes?**, el asistente podría:

- Verificar el estado actual de la base de datos
- Revisar los logs de acceso del usuario
- Consultar problemas conocidos en la documentación interna
- Generar un ticket de soporte si es necesario

### Caso 3: Asistente Médico Inteligente

Un hospital podría implementar un asistente para médicos que:

1. Se conecta a la base de datos de historiales médicos mediante un servidor MCP
2. Accede a las últimas investigaciones médicas a través de otro servidor MCP
3. Puede ayudar a programar exámenes mediante un tercer servidor MCP

Cuando un médico pregunta: **¿Qué tratamiento recomiendas para este paciente con hipertensión y diabetes?**, el asistente puede:

- Revisar el historial médico completo del paciente
- Considerar las últimas investigaciones sobre tratamientos combinados
- Sugerir opciones basadas en los medicamentos disponibles en la farmacia del hospital
- Programar los exámenes de seguimiento necesarios

## Implementando un Cliente MCP de Extremo a Extremo

A continuación exploraremos cómo construir un cliente MCP totalmente funcional aplicado a un escenario típico dentro de un sistema de gestión de recursos humanos:

```java
@SpringBootApplication
public class HRAssistantApplication {

    public static void main(String[] args) {
        SpringApplication.run(HRAssistantApplication.class, args);
    }
    
    @RestController
    @RequestMapping("/hr-assistant")
    public class HRAssistantController {
        
        private final ChatClient chatClient;
        
        public HRAssistantController(ChatClient.Builder builder, 
                              ToolCallbackProvider toolProvider) {
            
            // Configurar el cliente de chat con un mensaje de sistema por defecto
            this.chatClient = builder
                .defaultToolCallbacks(toolProvider.getToolCallbacks())
                .defaultSystemMessage("Eres un asistente de RRHH que ayuda a los " +
                    "empleados con consultas relacionadas con políticas, " +
                    "beneficios y procedimientos de la empresa.")
                .build();
        }
        
        @PostMapping("/query")
        public ResponseEntity<Map<String, String>> handleQuery(
                @RequestBody Map<String, String> request) {
            
            String userQuery = request.get("query");
            String employeeId = request.get("employeeId");
            
            // Crear un mensaje con metadatos para el contexto
            UserMessage userMessage = new UserMessage(userQuery, 
                Map.of("employeeId", employeeId));
            
            // Obtener respuesta del LLM aumentado con herramientas MCP
            Prompt prompt = new Prompt(userMessage);
            Generation response = chatClient.generate(prompt);
            
            Map<String, String> responseBody = new HashMap<>();
            responseBody.put("response", response.getText());
            
            return ResponseEntity.ok(responseBody);
        }
    }
}
```

La configuración YAML correspondiente:

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
    
    mcp:
      client:
        name: hr-assistant-client
        version: 1.0.0
        tool-callbacks-enabled: true
        streamable-http:
          connections:
            employeeData:
              url: https://hr-data.geovannycode.internal/mcp
            companyPolicies:
              url: https://policies.geovannycode.internal/mcp
            benefitsSystem:
              url: https://benefits.geovannycode.internal/mcp
            ticketingSystem:
              url: https://tickets.geovannycode.internal/mcp
```

Este ejemplo implementa un asistente de recursos humanos que puede acceder a:

1. Datos de los empleados
2. Políticas de la empresa
3. Sistema de beneficios
4. Sistema de tickets para problemas de RRHH

## Ventajas de Utilizar Clientes MCP

Los clientes MCP ofrecen numerosas ventajas para aplicaciones modernas de IA:

1. **Independencia del proveedor**: Puede cambiar entre diferentes LLMs sin modificar su código o sus integraciones.

2. **Acceso a datos privados sin exposición**: Los datos sensibles permanecen dentro de sus sistemas, solo se comparten los resultados relevantes.

3. **Información siempre actualizada**: Acceda a información en tiempo real sin necesidad de reentrenar modelos.

4. **Extensibilidad**: Agregue nuevas capacidades simplemente conectando nuevos servidores MCP.

5. **Reducción de hallucinations**: Al proporcionar contexto preciso y actualizado, reduce significativamente las respuestas incorrectas o "alucinaciones" de los LLMs.

6. **Composabilidad**: Combine múltiples servidores MCP para crear soluciones complejas y potentes.

## Consideraciones de Seguridad

Al implementar clientes MCP, debe considerar:

1. **Autenticación y autorización**: Asegure sus servidores MCP con autenticación adecuada, como Spring Security.

2. **Control de acceso**: Limite qué herramientas están disponibles para diferentes usuarios o contextos.

3. **Validación de datos**: Verifique la entrada y salida de datos para evitar vulnerabilidades.

4. **Auditoría**: Implemente registros de auditoría para rastrear el uso de herramientas MCP.

```java
// Ejemplo de implementación de seguridad para un cliente MCP
@Configuration
@EnableWebSecurity
public class MCPSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests((authz) -> authz
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/hr-assistant/**").hasRole("HR")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(OAuth2ResourceServerConfigurer::jwt);
        return http.build();
    }
}
```

## Escalando su Implementación MCP

A medida que su aplicación crece, puede escalar su implementación MCP:

1. **Múltiples instancias**: Ejecute múltiples instancias de sus servidores MCP para manejar cargas mayores.

2. **Caché**: Implemente caché para respuestas comunes para reducir la carga en sus servidores MCP.

3. **Monitoreo**: Utilice Spring Actuator para monitorear el rendimiento de sus clientes y servidores MCP.

4. **Orquestación**: Utilice herramientas como Kubernetes para orquestar sus servidores MCP.

## Conclusión: El Futuro es Aumentado

El Protocolo de Contexto de Modelo representa un avance significativo en cómo integramos los LLMs en aplicaciones empresariales. Al proporcionar un mecanismo estándar para aumentar las capacidades de estos modelos, MCP permite crear aplicaciones más inteligentes, precisas y útiles.

Spring AI simplifica enormemente este proceso, permitiendo a los desarrolladores de Java aprovechar estas capacidades con un mínimo esfuerzo. Ya sea que esté construyendo un asistente interno para empleados, un sistema de análisis financiero o una aplicación de atención médica, los clientes MCP le permiten combinar lo mejor de los LLMs con sus datos y sistemas propietarios.

A medida que el ecosistema MCP continúa madurando, podemos esperar ver más herramientas, integraciones y casos de uso que empujen los límites de lo que es posible con la IA aumentada.

¿Listo para comenzar? Configure su primer cliente MCP hoy y experimente el poder de la IA contextualmente consciente en sus aplicaciones.

---

## Referencias y Recursos

1. **Anthropic - Model Context Protocol**  
   Documentación oficial del protocolo MCP  
   https://www.anthropic.com/news/model-context-protocol

2. **Spring AI - Documentation**  
   Documentación oficial de Spring AI  
   https://docs.spring.io/spring-ai/reference/

3. **Spring AI - MCP Client**  
   Guía de implementación de clientes MCP con Spring AI  
   https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client.html

4. **Spring AI - MCP Server**  
   Documentación sobre servidores MCP  
   https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server.html

5. **OpenAI API Reference**  
   Documentación de la API de OpenAI  
   https://platform.openai.com/docs/api-reference

6. **Spring Boot Documentation**  
   Documentación oficial de Spring Boot  
   https://spring.io/projects/spring-boot

7. **Spring Security**  
   Guía de implementación de seguridad en Spring  
   https://spring.io/projects/spring-security

