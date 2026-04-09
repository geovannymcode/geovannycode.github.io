---
#preview
title: 'Apache Kafka con Spring Boot y Kotlin: Arquitectura Orientada a Eventos'
date: '2026-03-29'
image: "/img/blog/11.png"
categories:
    - Backend
    - Arquitectura
tags:
    - Kotlin
    - Kafka
    - Spring Boot
    - Docker
    - Arquitectura
author: Geovanny Mendoza
short: Construye un sistema de mensajería con Apache Kafka, Spring Boot y Kotlin. Productor, consumidor, persistencia con H2, pruebas unitarias e integración, y visualización con el plugin Kafkalytic.
---

# Apache Kafka con Spring Boot y Kotlin: Arquitectura Orientada a Eventos

## Introducción

Las arquitecturas orientadas a eventos permiten que los sistemas reaccionen de forma asincrónica a cambios de estado del negocio. Kafka, Spring Boot y Kotlin forman una combinación sólida para implementarlas en la JVM: Kafka gestiona el flujo de mensajes, Spring Boot reduce la configuración necesaria y Kotlin hace el código más compacto sin perder claridad.

Este artículo construye paso a paso un sistema de mensajería funcional con estos tres componentes. Los ejemplos son funcionales y sirven de base para proyectos reales.

## Apache Kafka

Apache Kafka es una plataforma de mensajería distribuida diseñada para publicaciones, suscripciones, almacenamiento persistente y procesamiento de registros en tiempo real. Nació en LinkedIn y hoy es el estándar en sistemas distribuidos para transmisión confiable de eventos.

Sus características técnicas principales:

- Distribuye particiones entre múltiples nodos del clúster, procesando millones de mensajes por segundo sin degradación del rendimiento
- Replica mensajes por tópico para sobrevivir fallos de hardware o software
- Escribe secuencialmente en disco, lo que da latencias en el orden de milisegundos
- Almacena mensajes durante períodos configurables, permitiendo reprocesar, auditar y analizar después

Estas capacidades lo hacen adecuado para arquitecturas de microservicios, procesamiento en tiempo real y pipelines de datos de alto volumen.

## Kotlin

Kotlin es un lenguaje estáticamente tipado que corre en la JVM, desarrollado por JetBrains. Sus ventajas prácticas frente a Java en este contexto:

- Las `data class` generan automáticamente `equals`, `hashCode`, `toString` y `copy`, reduciendo el boilerplate de DTOs y entidades
- El sistema de tipos distingue entre nulable y no nulable, lo que elimina la mayoría de los `NullPointerException`
- La interoperabilidad con Java es total: cualquier biblioteca o framework Java funciona sin adaptadores
- Soporta funciones de orden superior, lambdas y operadores funcionales (`map`, `filter`, `fold`)

La integración de Kotlin con Spring Boot está bien optimizada en versiones recientes, con extensiones específicas para la mayoría de los módulos.

## Stack tecnológico

| Componente | Versión / Función |
|---|---|
| Kotlin 2.x | Lenguaje principal para el backend |
| Java 21 | Plataforma de ejecución JVM (LTS) |
| Spring Boot 3.4.x | Framework web y empresarial |
| Apache Kafka | Plataforma de mensajería distribuida |
| Kafkalytic | Plugin de IntelliJ para visualizar y producir eventos |
| Docker | Contenerización de servicios |

Kafkalytic no es una herramienta externa: es un plugin de JetBrains que se integra directamente en IntelliJ IDEA. Permite conectarse a un clúster Kafka, inspeccionar tópicos, generar eventos manualmente, ver particiones y validar el comportamiento de los consumidores sin salir del IDE.

## Configuración del entorno de desarrollo

La infraestructura de desarrollo corre en Docker. Con `spring-boot-docker-compose` en el classpath, Spring Boot detecta y gestiona el `compose.yml` automáticamente al arrancar.

El archivo `compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

Dos servicios: Zookeeper para la coordinación del clúster y Kafka como broker escuchando en `localhost:9092`.

## Inicialización del proyecto

Creamos el proyecto desde [Spring Initializr](https://start.spring.io/) con estos parámetros:

- Gestor de dependencias: Gradle-Kotlin
- Lenguaje: Kotlin
- Spring Boot: 3.4.x
- Java: 21
- Dependencias: Spring Web, Spring for Apache Kafka, Docker Compose Support

## Arquitectura de la aplicación

La estructura del proyecto sigue una organización por paquetes:

```mermaid
src/main/kotlin/com/geovannycode/
├── KotlinKafkaApplication.kt
│
├── config/
│   ├── DatabaseConfig.kt
│   └── MessageConfig.kt
│
├── message/
│   ├── MessageEntities.kt
│   ├── MessageDTO.kt
│   ├── MessageRepository.kt
│   ├── MessageProducer.kt
│   └── MessageConsumer.kt
│
└── web/
    └── controller/
        └── MessageController.kt

src/main/resources/
├── application.yaml
└── schema.sql

src/test/kotlin/com/geovannycode/
└── message/
    └── MessageTest.kt
```

## Configuración de `application.yml`

```yaml
spring:
  application:
    name: kotlin-kafka

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: geovannycode-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
    topic:
      name: geovannycode-topic

  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
    password:

  h2:
    console:
      enabled: true
      path: /h2-console

  sql:
    init:
      mode: always
```

## Esquema de base de datos

El archivo `schema.sql` en `src/main/resources/`:

```sql
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_id UNIQUE (message_id)
);

CREATE INDEX IF NOT EXISTS idx_message_id ON messages (message_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON messages (created_at);
```

## Modelo de datos

```kotlin
package com.geovannycode.message

import java.time.Instant

data class CustomMessage(
    val content: String,
    val messageId: String,
    val timestamp: Long = Instant.now().toEpochMilli()
)
```

Con `data class`, Kotlin genera automáticamente `equals`, `hashCode`, `toString` y `copy`.

## Repositorio de mensajes

El repositorio usa `JdbcTemplate` para operaciones SQL directas. Implementa tres métodos: guardar, buscar por ID y listar todos. Cada método atrapa excepciones internamente y devuelve `null` o `emptyList()` en caso de fallo, sin propagar el error hacia arriba.

```kotlin
package com.geovannycode.message

import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.Timestamp

@Repository
class MessageRepository(private val jdbcTemplate: JdbcTemplate) {
    private val logger = LoggerFactory.getLogger(MessageRepository::class.java)

    fun save(message: CustomMessage): Boolean {
        return try {
            jdbcTemplate.update(
                """
                INSERT INTO messages (message_id, content, created_at)
                VALUES (?, ?, ?)
                """,
                message.messageId,
                message.content,
                Timestamp(message.timestamp)
            )
            logger.debug("Mensaje guardado en base de datos: ID={}", message.messageId)
            true
        } catch (e: Exception) {
            logger.error("Error al guardar mensaje en base de datos: {}", e.message, e)
            false
        }
    }

    fun findById(messageId: String): CustomMessage? {
        return try {
            jdbcTemplate.queryForObject(
                """
                SELECT message_id, content, created_at
                FROM messages
                WHERE message_id = ?
                """,
                { rs, _ ->
                    CustomMessage(
                        content = rs.getString("content"),
                        messageId = rs.getString("message_id"),
                        timestamp = rs.getTimestamp("created_at").time
                    )
                },
                messageId
            )
        } catch (e: Exception) {
            logger.error("Error al buscar mensaje con ID {}: {}", messageId, e.message)
            null
        }
    }

    fun findAll(): List<CustomMessage> {
        return try {
            jdbcTemplate.query(
                """
                SELECT message_id, content, created_at
                FROM messages
                ORDER BY created_at DESC
                """,
                { rs, _ ->
                    CustomMessage(
                        content = rs.getString("content"),
                        messageId = rs.getString("message_id"),
                        timestamp = rs.getTimestamp("created_at").time
                    )
                }
            )
        } catch (e: Exception) {
            logger.error("Error al recuperar todos los mensajes: {}", e.message, e)
            emptyList()
        }
    }
}
```

## Configuración de la base de datos

`DatabaseConfig` inicializa la base de datos H2 embebida y el `JdbcTemplate`:

```kotlin
package com.geovannycode.config

import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType
import javax.sql.DataSource

@Configuration
class DatabaseConfig {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)

    @Bean
    fun dataSource(): DataSource {
        logger.info("Inicializando base de datos embebida H2")
        return EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .addScript("classpath:schema.sql")
            .build()
            .also { logger.info("Base de datos H2 inicializada correctamente") }
    }

    @Bean
    fun jdbcTemplate(dataSource: DataSource): JdbcTemplate {
        logger.info("Configurando JdbcTemplate")
        return JdbcTemplate(dataSource)
    }
}
```

## Configuración de Kafka

`MessageConfig` crea el tópico automáticamente al arrancar y registra el error handler centralizado:

```kotlin
package com.geovannycode.config

import org.apache.kafka.clients.admin.NewTopic
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.TopicBuilder
import org.springframework.kafka.listener.KafkaListenerErrorHandler
import org.springframework.kafka.support.converter.JsonMessageConverter
import org.springframework.kafka.support.converter.RecordMessageConverter

@Configuration
class MessageConfig {
    private val logger = LoggerFactory.getLogger(MessageConfig::class.java)

    @Value("\${spring.kafka.topic.name}")
    private lateinit var topicName: String

    @Bean
    fun messageTopic(): NewTopic {
        logger.info("Creando tópico Kafka: {}", topicName)
        return TopicBuilder
            .name(topicName)
            .partitions(1)
            .replicas(1)
            .build()
            .also { logger.info("Tópico {} configurado correctamente", topicName) }
    }

    @Bean
    fun kafkaErrorHandler(): KafkaListenerErrorHandler {
        return KafkaListenerErrorHandler { message, exception ->
            logger.error("Error al procesar mensaje: {}", message.payload)
            logger.error("Excepción: {}", exception.cause?.message, exception.cause)
            message.payload ?: ""
        }
    }
}
```

## Productor de mensajes

El productor envía mensajes al tópico configurado. Usa inyección por constructor en lugar de `@Autowired` en campo, lo que facilita las pruebas unitarias:

```kotlin
package com.geovannycode.message

import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
class MessageConsumer(private val messageRepository: MessageRepository) {
    private val logger = LoggerFactory.getLogger(MessageConsumer::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        .withZone(ZoneId.systemDefault())

    @KafkaListener(
        topics = ["\${spring.kafka.topic.name}"],
        groupId = "\${spring.kafka.consumer.group-id}"
    )
    fun listen(@Payload content: String) {
        logger.info("Mensaje recibido: {}", content)

        try {
            val message = CustomMessage(
                content = content.uppercase(),
                messageId = UUID.randomUUID().toString()
            )

            val instant = Instant.ofEpochMilli(message.timestamp)
            val formattedTime = dateFormatter.format(instant)

            messageRepository.save(message)

            logger.info("Mensaje procesado exitosamente a las {}", formattedTime)
        } catch (e: Exception) {
            logger.error("Error al procesar el mensaje: {}", e.message, e)
        }
    }
}
```

## Consumidor de mensajes

El consumidor escucha el tópico y persiste cada mensaje recibido en la base de datos:

```kotlin
package com.geovannycode.message

import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
class MessageConsumer(private val messageRepository: MessageRepository) {
    private val logger = LoggerFactory.getLogger(MessageConsumer::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        .withZone(ZoneId.systemDefault())

    @KafkaListener(
        topics = ["\${spring.kafka.topic.name}"],
        groupId = "\${spring.kafka.consumer.group-id}"
    )
    fun listen(@Payload content: String) {
        logger.info("Mensaje recibido: {}", content)

        try {
            val message = CustomMessage(
                content = content.uppercase(),
                messageId = UUID.randomUUID().toString()
            )

            val instant = Instant.ofEpochMilli(message.timestamp)
            val formattedTime = dateFormatter.format(instant)

            messageRepository.save(message)

            logger.info("Mensaje procesado exitosamente a las {}", formattedTime)
        } catch (e: Exception) {
            logger.error("Error al procesar el mensaje: {}", e.message, e)
        }
    }
}
```

## Manejo de errores

`kafkaErrorHandler` en `MessageConfig` centraliza el manejo de errores para todos los consumidores. Con un handler centralizado no necesitas repetir la lógica de error en cada listener.

Para asociarlo al consumidor, agrega `errorHandler = "kafkaErrorHandler"` en la anotación:

```kotlin
@KafkaListener(
    topics = ["\${kafka.topic.name}"],
    groupId = "\${spring.kafka.consumer.group-id}",
    errorHandler = "kafkaErrorHandler"
)
fun listen(message: CustomMessage) {
    // lógica de procesamiento
}
```

## DTOs y Controller REST

Los DTOs desacoplan el modelo interno de la representación que recibe el cliente:

```kotlin
package com.geovannycode.message

data class MessageRequest(
    val content: String
)

data class MessageResponse(
    val id: String,
    val content: String,
    val timestamp: String
)

data class ApiResponse(
    val success: Boolean,
    val message: String,
    val data: Any? = null,
    val error: String? = null
)
```

El controller expone tres endpoints: `POST /api/messages` para enviar, `GET /api/messages` para listar y `GET /api/messages/{id}` para buscar por ID:

```kotlin
package com.geovannycode.web.controller

import com.geovannycode.message.ApiResponse
import com.geovannycode.message.CustomMessage
import com.geovannycode.message.MessageProducer
import com.geovannycode.message.MessageRepository
import com.geovannycode.message.MessageRequest
import com.geovannycode.message.MessageResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/messages")
class MessageController(
    private val messageProducer: MessageProducer,
    private val messageRepository: MessageRepository
) {
    private val logger = LoggerFactory.getLogger(MessageController::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        .withZone(ZoneId.systemDefault())

    @PostMapping(consumes = [MediaType.APPLICATION_JSON_VALUE])
    fun sendMessage(@RequestBody request: MessageRequest): ResponseEntity<ApiResponse> {
        logger.debug("Solicitud recibida para enviar mensaje: {}", request.content)

        return try {
            val message = messageProducer.sendMessage(request.content)
            ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse(
                success = true,
                message = "Mensaje enviado correctamente",
                data = mapToResponse(message)
            ))
        } catch (e: Exception) {
            logger.error("Error al enviar mensaje: {}", e.message, e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse(
                    success = false,
                    message = "Error al enviar mensaje",
                    error = e.message
                ))
        }
    }

    @GetMapping
    fun getAllMessages(): ResponseEntity<ApiResponse> {
        logger.debug("Solicitud recibida para obtener todos los mensajes")

        val messages = messageRepository.findAll()
        val messageResponses = messages.map { mapToResponse(it) }

        return ResponseEntity.ok(ApiResponse(
            success = true,
            message = "Mensajes recuperados con éxito",
            data = messageResponses
        ))
    }

    @GetMapping("/{id}")
    fun getMessageById(@PathVariable id: String): ResponseEntity<ApiResponse> {
        logger.debug("Solicitud recibida para obtener mensaje con ID: {}", id)

        val message = messageRepository.findById(id)

        return if (message != null) {
            ResponseEntity.ok(ApiResponse(
                success = true,
                message = "Mensaje recuperado con éxito",
                data = mapToResponse(message)
            ))
        } else {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse(
                    success = false,
                    message = "Mensaje no encontrado",
                    error = "No existe mensaje con ID: $id"
                ))
        }
    }

    private fun mapToResponse(message: CustomMessage): MessageResponse {
        return MessageResponse(
            id = message.messageId,
            content = message.content,
            timestamp = dateFormatter.format(Instant.ofEpochMilli(message.timestamp))
        )
    }
}
```

## Prueba unitaria del productor

La prueba usa Mockito para simular el `KafkaTemplate` sin necesitar un broker real. Solo verifica que se llame `send()` con los argumentos correctos:

```kotlin
package com.geovannycode

import com.geovannycode.message.MessageProducer
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.springframework.kafka.core.KafkaTemplate

class MessageProducerTests {

    private val topicName = "test-topic"
    private val kafkaTemplate = mock<KafkaTemplate<String, String>>()
    private val messageProducer = MessageProducer(kafkaTemplate, topicName)

    @Test
    fun `cuando se envía un mensaje, se debe publicar en Kafka`() {
        // Given
        val content = "Mensaje de prueba"

        // When
        messageProducer.sendMessage(content)

        // Then
        verify(kafkaTemplate).send(eq(topicName), any())
    }
}
```

## Prueba de integración

`@EmbeddedKafka` levanta un broker en memoria. La prueba confirma que el mensaje enviado por el productor llega al consumidor:

```kotlin
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = ["example-topic"])
class KafkaIntegrationTests {

    @Autowired
    private lateinit var messageProducer: MessageProducer

    @Autowired
    private lateinit var consumerFactory: ConsumerFactory<String, CustomMessage>

    @Test
    fun `el mensaje enviado debe ser recibido por el consumidor`() {
        // Given
        val mensaje = "Mensaje de integración"
        val consumer = consumerFactory.createConsumer("test-group", "auto.offset.reset=earliest")
        consumer.subscribe(listOf("example-topic"))

        // When
        messageProducer.sendMessage(mensaje)

        // Then
        await()
            .atMost(Duration.ofSeconds(10))
            .untilAsserted {
                val records = KafkaTestUtils.getRecords(consumer)
                assert(records.count() > 0)
                val record = records.first()
                assert(record.value().message == mensaje)
            }
    }
}
```

## Ejecución del proyecto

```bash
# Correr la aplicación
./gradlew bootRun

# Correr las pruebas
./gradlew test
```

Spring Boot levanta el entorno Docker automáticamente y crea el tópico configurado en `MessageConfig`.

## Kafkalytic: visualización desde IntelliJ IDEA

Kafkalytic es un plugin para IntelliJ IDEA que deja explorar tópicos, producir mensajes de prueba y ver offsets sin salir del IDE. Es gratuito y funciona en Community y Ultimate Edition.

### Instalación

Ve a **File → Settings → Plugins → Marketplace**, busca "Kafkalytic", instálalo y reinicia el IDE.

### Conectar al cluster

1. Abre la vista del plugin en **View → Tool Windows → kafkalytic**
2. Presiona "+" para agregar un cluster
3. Completa el formulario:

| Campo | Descripción |
|---|---|
| Bootstrap servers | Dirección del broker, ej: `localhost:9092` |
| Cluster name | Nombre para identificar el cluster |
| Truststore path | Ruta al Truststore si usas SSL |
| Truststore password | Contraseña del Truststore |
| Request timeout (ms) | Tiempo de espera para conexión (por defecto 5000) |
| Keystore path | Ruta al Keystore si usas SSL con cliente autenticado |
| Keystore password | Contraseña del Keystore |
| Truststore type | Tipo de almacén (JKS, PKCS12) |
| Security protocol | PLAINTEXT, SSL, SASL_SSL |
| SASL mechanism | PLAIN, SCRAM-SHA-512 si aplica |
| SASL jaas config | Configuración JAAS si aplica |

4. Carga valores desde un `.properties` con "Load properties from file" si los tienes
5. Presiona "Test Connection" para validar
6. Haz clic en "OK" para guardar

<!-- Figura 1: New cluster -->
![Figura #1: Vista de nuevo cluster](/img/blog/arq-evento-kafka/Kafka_1.png)


### Generar mensajes en batch

Expande el cluster en la vista del plugin, ubica el tópico (ej. `geovannycode-topic`), haz clic derecho y selecciona **Message bulk generator**:

<!-- Figura 2: New cluster -->
![Figura #1: Vista del tópico](/img/blog/arq-evento-kafka/Kafka_2.png)

| Campo | Ejemplo | Descripción |
|---|---|---|
| Number of messages | 100 | Total de mensajes a producir |
| Delay ms | 10 | Tiempo entre mensajes |
| Batch size | 10 | Tamaño de lote |
| Compression | none | Tipo de compresión |
| Random part size | 100 | Longitud de la parte aleatoria |
| Message template | `Mensaje <random>` | Plantilla; `<random>` se reemplaza con contenido aleatorio |

<!-- Figura 3: vista del panel Kafkalytic con el offset actualizado -->
![Figura #3: Vista kafka message generator for topic](/img/blog/arq-evento-kafka/Kafka_3.png)


### Validar el offset

Selecciona el tópico en la vista del plugin y revisa la columna **Offset**. Si enviaste 100 mensajes, el valor pasa de 0 a 100. Desde el mismo panel puedes consumir mensajes, ver particiones, ISR y la configuración del tópico.

<!-- Figura 4: vista del panel Kafkalytic con el offset actualizado -->
![Figura #4: Vista del panel Kafkalytic con el offset actualizado](/img/blog/arq-evento-kafka/Kafka_4.png)

## Conclusión

Kafka, Spring Boot y Kotlin se complementan bien. Kafka maneja el volumen y la persistencia de mensajes. Spring Boot gestiona el ciclo de vida del productor, el consumidor y la infraestructura Docker. Kotlin reduce el boilerplate sin complicar la lectura del código. El sistema que vimos aquí es funcional, testeable y sirve como base para casos más complejos como mensajería con esquemas Avro, múltiples tópicos o reintentos con dead letter topics.

---

## Repositorio del proyecto

Puedes encontrar el código fuente completo en GitHub: [kotlin-kafka](https://github.com/geovannymcode/kotlin-kafka)

---

## Referencias

1. [Documentación oficial de Kotlin](https://kotlinlang.org/docs/home.html)
2. [Documentación de Apache Kafka](https://kafka.apache.org/documentation/)
3. [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
4. [Kafkalytic Plugin para IntelliJ](https://plugins.jetbrains.com/plugin/11946-kafkalytic)
5. [Spring Boot + Docker Compose](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.docker-compose)
