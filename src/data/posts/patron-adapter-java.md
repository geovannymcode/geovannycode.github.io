---
title: 'Patrón Adapter en Java: cuando el mundo externo no habla tu idioma'
date: '2026-05-04'
image: "/img/blog/21.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Patrones de Diseño
    - Adapter Pattern
    - Spring Boot
    - Java 21
author: Geovanny Mendoza
short: El Patrón Adapter es la capa de traducción entre tu sistema y los SDKs externos. Twilio, SendGrid, Firebase — cada uno habla su idioma. El adapter los hace hablar el tuyo. Si el proveedor cambia, solo cambia el adapter. El service y el controller no se enteran.
---

## Introducción

Existe una situación que tarde o temprano le pasa a todo desarrollador backend: tienes que integrar un SDK de terceros, lo abres, y sus métodos no se parecen en nada a lo que tu sistema espera. Twilio llama `sendWhatsApp()`. SendGrid llama `dispatchEmail()`. El SDK del banco tiene `realizarDebito()`. Cada uno con sus propios parámetros, sus propias convenciones, su propia lógica de respuesta.

La tentación inicial es adaptar tu sistema a cada SDK. Poner la llamada de Twilio directamente en el service, poner la de SendGrid también, y rezar para que nadie pida agregar otro canal. Esa decisión te va a cobrar intereses.

El **Patrón Adapter** hace exactamente lo que dice su nombre: es el enchufe que conecta dos cosas que no fueron diseñadas para trabajar juntas. Tu sistema habla con una interfaz común. El adapter traduce esa conversación al idioma de cada SDK externo. Si el SDK cambia o lo reemplazas, solo cambia el adapter. El resto del sistema no se entera.

## 1. Por qué no puedes simplemente usar el SDK directo

El problema no es que el SDK funcione mal. El problema es el acoplamiento.

Cuando llamas al SDK de Twilio directamente desde tu service, le estás diciendo al service "tú eres responsable de saber cómo funciona Twilio". Si mañana suben los precios y migras a otro proveedor, tienes que modificar el service. Si quieres probar el service sin mandar mensajes reales, tienes que mockear la clase de Twilio específicamente. Si agregas un nuevo canal, el service crece.

Hay un principio en diseño de software que dice que deberías depender de abstracciones, no de implementaciones concretas. El Adapter es cómo lo llevas a la práctica cuando el mundo externo no coopera.

## 2. Caso real: API de notificaciones multicanal

Construyamos `POST /api/v1/notifications` — un endpoint que recibe un mensaje y lo envía por el canal que el cliente indique: WhatsApp, SMS o Email. Cada canal usa un SDK distinto con métodos completamente diferentes.

### Estructura del proyecto

```mermaid
com.geovannycode.notifications
├── controller/
│   └── NotificationController.java
├── service/
│   └── NotificationService.java
├── adapter/
│   ├── NotificationAdapter.java       ← la interfaz que tu sistema conoce
│   ├── WhatsAppAdapter.java
│   ├── SmsAdapter.java
│   └── EmailAdapter.java
├── client/                             ← SDKs externos simulados
│   ├── TwilioClient.java
│   └── SendGridClient.java
└── model/
    ├── NotificationRequest.java
    └── NotificationResponse.java
```

### Los modelos

```java
public record NotificationRequest(
    @NotBlank String destination,  // teléfono o email según el canal
    @NotBlank String subject,
    @NotBlank String body,
    @NotBlank String channel       // "WHATSAPP" | "SMS" | "EMAIL"
) {}

public record NotificationResponse(
    boolean delivered,
    String  messageId,
    String  channel,
    String  destination
) {}
```

Los `records` de Java 21 generan constructor, getters, `equals`, `hashCode` y `toString` automáticamente. Para los DTOs de una API REST son la opción correcta: inmutables por naturaleza, sin Lombok, sin código de relleno.

### Los SDKs externos — el problema

Estos son los SDKs de terceros. No los puedes modificar. Cada uno tiene su propia forma de hacer las cosas:

```java
/*
 * SDK de Twilio para mensajería.
 * Sus métodos tienen nombres y firmas que no coinciden
 * con lo que tu sistema necesita.
 */
public class TwilioClient {

    public String sendWhatsApp(String phoneNumber, String message) {
        // Llama a la API REST de Twilio internamente
        System.out.println("Twilio WA → " + phoneNumber + ": " + message);
        return "WA-" + UUID.randomUUID();
    }

    public String sendSms(String phoneNumber, String text) {
        System.out.println("Twilio SMS → " + phoneNumber + ": " + text);
        return "SMS-" + UUID.randomUUID();
    }
}

/*
 * SDK de SendGrid para emails.
 * Método completamente distinto: dispatchEmail en vez de send,
 * parámetros en otro orden, retorna un String en vez de un objeto.
 */
public class SendGridClient {

    public String dispatchEmail(String toEmail, String subject, String htmlBody) {
        System.out.println("SendGrid → " + toEmail + " | Asunto: " + subject);
        return "SG-" + UUID.randomUUID();
    }
}
```

Ahí está el problema en concreto. `sendWhatsApp`, `sendSms`, `dispatchEmail` — tres métodos con firmas distintas para hacer conceptualmente lo mismo: enviar un mensaje. Tu sistema necesita una sola forma de hablar con todos ellos.

### La interfaz Target — el contrato que tu sistema conoce

```java
/*
 * Esta es la única interfaz que el resto del sistema va a ver.
 * Ni el controller ni el service saben que Twilio o SendGrid existen.
 * Solo saben que hay algo que puede enviar notificaciones.
 */
public interface NotificationAdapter {
    NotificationResponse send(NotificationRequest request);
    boolean supports(String channel);
}
```

Dos métodos. `send()` hace el trabajo y `supports()` dice si este adapter sabe manejar el canal solicitado. En vez de un `if/else` en el service, le preguntas a cada adapter si puede manejar el canal que llegó.

### Los Adapters — la traducción

```java
@Component
public class WhatsAppAdapter implements NotificationAdapter {

    private final TwilioClient twilioClient;

    /*
     * El TwilioClient se inyecta aquí, no en el service.
     * El service nunca va a saber que Twilio existe.
     */
    public WhatsAppAdapter(TwilioClient twilioClient) {
        this.twilioClient = twilioClient;
    }

    @Override
    public NotificationResponse send(NotificationRequest request) {
        /*
         * WhatsApp no tiene concepto de "subject" como el email.
         * El adapter resuelve esa diferencia: concatena el asunto
         * al inicio del mensaje con formato Markdown de WhatsApp.
         * Esa decisión vive aquí, no en el service.
         */
        String message = request.subject().isBlank()
            ? request.body()
            : "*%s*\n%s".formatted(request.subject(), request.body());

        String messageId = twilioClient.sendWhatsApp(request.destination(), message);

        return new NotificationResponse(true, messageId, "WHATSAPP", request.destination());
    }

    @Override
    public boolean supports(String channel) {
        return "WHATSAPP".equalsIgnoreCase(channel);
    }
}
```

```java
@Component
public class SmsAdapter implements NotificationAdapter {

    private static final int SMS_CHARACTER_LIMIT = 160;
    private final TwilioClient twilioClient;

    public SmsAdapter(TwilioClient twilioClient) {
        this.twilioClient = twilioClient;
    }

    @Override
    public NotificationResponse send(NotificationRequest request) {
        /*
         * SMS tiene un límite de 160 caracteres por mensaje.
         * Esta restricción técnica del canal la maneja el adapter.
         * El service no tiene que saber nada de eso.
         *
         * Si el texto supera el límite, lo truncamos y agregamos "..."
         * para que el receptor sepa que el mensaje fue cortado.
         */
        String fullText = "%s: %s".formatted(request.subject(), request.body());
        String smsText  = fullText.length() > SMS_CHARACTER_LIMIT
            ? fullText.substring(0, SMS_CHARACTER_LIMIT - 3) + "..."
            : fullText;

        String messageId = twilioClient.sendSms(request.destination(), smsText);

        return new NotificationResponse(true, messageId, "SMS", request.destination());
    }

    @Override
    public boolean supports(String channel) {
        return "SMS".equalsIgnoreCase(channel);
    }
}
```

```java
@Component
public class EmailAdapter implements NotificationAdapter {

    private final SendGridClient sendGridClient;

    public EmailAdapter(SendGridClient sendGridClient) {
        this.sendGridClient = sendGridClient;
    }

    @Override
    public NotificationResponse send(NotificationRequest request) {
        /*
         * SendGrid espera el contenido en HTML.
         * El adapter hace esa conversión: toma el texto plano
         * del request y lo envuelve en estructura HTML básica.
         *
         * Los saltos de línea del body se convierten en <br/> para
         * que el email se vea bien en cualquier cliente de correo.
         */
        String htmlBody = "<html><body><p>%s</p></body></html>"
            .formatted(request.body().replace("\n", "<br/>"));

        String messageId = sendGridClient.dispatchEmail(
            request.destination(),
            request.subject(),
            htmlBody
        );

        return new NotificationResponse(true, messageId, "EMAIL", request.destination());
    }

    @Override
    public boolean supports(String channel) {
        return "EMAIL".equalsIgnoreCase(channel);
    }
}
```

Cada adapter maneja las particularidades de su canal. El límite de 160 caracteres del SMS vive en `SmsAdapter`. La conversión a HTML vive en `EmailAdapter`. La concatenación del subject vive en `WhatsAppAdapter`. Ninguna de esas reglas contamina el service.

### El Service — sin rastro de SDKs

```java
@Service
public class NotificationService {

    /*
     * Spring inyecta aquí todos los beans que implementen NotificationAdapter:
     * WhatsAppAdapter, SmsAdapter y EmailAdapter.
     *
     * Si mañana agregas PushNotificationAdapter con @Component,
     * aparece en esta lista automáticamente.
     */
    private final List<NotificationAdapter> adapters;

    public NotificationService(List<NotificationAdapter> adapters) {
        this.adapters = adapters;
    }

    public NotificationResponse send(NotificationRequest request) {
        return adapters.stream()
            .filter(a -> a.supports(request.channel()))
            .findFirst()
            .map(a -> a.send(request))
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Canal no soportado: " + request.channel()
            ));
    }
}
```

El service no menciona Twilio. No menciona SendGrid. No menciona WhatsApp ni SMS ni Email. Solo sabe que tiene una lista de adapters y que alguno de ellos sabe manejar el canal que llegó en el request.

### El Controller

```java
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    /**
     * POST /api/v1/notifications
     *
     * Envía una notificación por el canal indicado.
     * Canales disponibles: WHATSAPP, SMS, EMAIL.
     */
    @PostMapping
    public ResponseEntity<NotificationResponse> send(
            @RequestBody @Valid NotificationRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED).body(service.send(request));
    }
}
```

## 3. Probando el endpoint

**Notificación por WhatsApp:**

```http
POST /api/v1/notifications
Content-Type: application/json

{
  "destination": "+573001234567",
  "subject": "Confirmación de pago",
  "body": "Tu pago de $85.000 fue procesado exitosamente.",
  "channel": "WHATSAPP"
}
```

```json
HTTP/1.1 201 Created

{
  "delivered": true,
  "messageId": "WA-a1b2c3d4-...",
  "channel": "WHATSAPP",
  "destination": "+573001234567"
}
```

Lo que Twilio recibe internamente es `*Confirmación de pago*\nTu pago de $85.000 fue procesado exitosamente.` — con el formato que WhatsApp entiende para negrita. El controller no sabe eso. El service no sabe eso. Solo el adapter lo sabe.

**Notificación por Email:**

```http
POST /api/v1/notifications
Content-Type: application/json

{
  "destination": "cliente@email.com",
  "subject": "Resumen de tu orden",
  "body": "Hola,\nTu orden ORD-001 fue despachada.\nLlega en 2-3 días hábiles.",
  "channel": "EMAIL"
}
```

```json
HTTP/1.1 201 Created

{
  "delivered": true,
  "messageId": "SG-f7e8d9...",
  "channel": "EMAIL",
  "destination": "cliente@email.com"
}
```

SendGrid recibe el body convertido a HTML con `<br/>` en los saltos de línea. Esa conversión ocurrió en `EmailAdapter.send()` antes de llegar al SDK.

**Canal no soportado:**

```http
POST /api/v1/notifications
Content-Type: application/json

{
  "destination": "@usuario",
  "subject": "Hola",
  "body": "Mensaje de prueba",
  "channel": "TELEGRAM"
}
```

```json
HTTP/1.1 422 Unprocessable Entity

{
  "status": 422,
  "message": "Canal no soportado: TELEGRAM"
}
```

## 4. Agregar un canal nuevo sin tocar nada

El equipo decide agregar notificaciones push con Firebase. Esto es lo único que tienes que escribir:

```java
@Component
public class PushNotificationAdapter implements NotificationAdapter {

    /*
     * El SDK de Firebase tiene su propio cliente y sus propios métodos.
     * Toda esa complejidad queda encapsulada aquí.
     */
    private final FirebaseFcmClient fcmClient;

    public PushNotificationAdapter(FirebaseFcmClient fcmClient) {
        this.fcmClient = fcmClient;
    }

    @Override
    public NotificationResponse send(NotificationRequest request) {
        String messageId = fcmClient.pushToDevice(
            request.destination(),  // device token
            request.subject(),
            request.body()
        );
        return new NotificationResponse(true, messageId, "PUSH", request.destination());
    }

    @Override
    public boolean supports(String channel) {
        return "PUSH".equalsIgnoreCase(channel);
    }
}
```

Creas el archivo. Spring lo descubre. La lista del service lo incluye. El endpoint ya acepta `"channel": "PUSH"`. Cero cambios en `NotificationService`, `NotificationController` ni en los otros adapters.

## 5. La diferencia entre Adapter y Strategy

Es común confundirlos porque los dos usan una interfaz común con múltiples implementaciones. La diferencia está en el propósito.

**Strategy** encapsula algoritmos intercambiables que hacen lo mismo de formas distintas. Todos son ciudadanos de tu sistema, los controlas tú. Si quieres ver un ejemplo completo, en el post anterior cubrimos el [Patrón Strategy con pagos](https://www.geovannycode.com/blog/patron-strategy-java/).

**Adapter** traduce interfaces externas incompatibles para que encajen en tu sistema. Los SDKs son de terceros y no los controlas.

En la práctica, cuando ves que el problema es "este SDK externo no encaja con mi interfaz", es Adapter. Cuando el problema es "esta lógica tiene múltiples variantes que crecen con el tiempo", es Strategy.

## Conclusión

El Patrón Adapter es la respuesta correcta cuando el mundo externo no coopera. En vez de dejar que los SDKs de Twilio, SendGrid o cualquier proveedor contaminen tu lógica de negocio, creas una capa de traducción limpia entre ellos y tu sistema.

Con Spring Boot, el mismo mecanismo de inyección de `List<NotificationAdapter>` que vimos en Strategy hace que los adapters se registren solos. Si el proveedor sube precios y migras a otro, cambias un adapter. El service, el controller y los tests de negocio no se tocan. Eso es exactamente lo que quieres cuando dependes de servicios que no controlas.

---

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Libro: *Design Patterns: Elements of Reusable Object-Oriented Software*
    - 🖋️ Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
    - Capítulo 4: Structural Patterns — Adapter

- Libro: *Head First Design Patterns, 2nd Edition*
    - 🖋️ Eric Freeman, Elisabeth Robson — O'Reilly Media

- Documentación de Spring Framework: Dependency Injection
    - 📄 Inyección de colecciones de beans — base del registro automático de adapters
    - 🔗 [https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)

- Artículo: *The Adapter Pattern in Java*
    - 📄 Baeldung — ejemplo práctico de implementación
    - 🔗 [https://www.baeldung.com/java-adapter-pattern](https://www.baeldung.com/java-adapter-pattern)

- Documentación de Twilio Java SDK
    - 🔗 [https://www.twilio.com/docs/libraries/java](https://www.twilio.com/docs/libraries/java)