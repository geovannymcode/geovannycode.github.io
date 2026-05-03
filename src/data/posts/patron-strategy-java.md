---
title: 'Patrón Strategy en Java: cómo dejar de escribir if/else eternos'
date: '2026-05-02'
image: "/img/blog/20.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Patrones de Diseño
    - Strategy Pattern
    - Spring Boot
    - Java 21
author: Geovanny Mendoza
short: El patrón Strategy convierte un if/else que nadie quiere tocar en una lista de clases donde cada una sabe exactamente qué puede hacer. Con Spring Boot, agregar un proveedor nuevo es crear un archivo nuevo, sin editar nada que ya funciona.
---

## Introducción

Hay un problema que todos hemos escrito al menos una vez. Empieza inocente:

```java
if (paymentMethod.equals("PSE")) {
    // lógica PSE
} else if (paymentMethod.equals("CARD")) {
    // lógica tarjeta
}
```

Funciona. El código sale a producción. Tres semanas después el equipo de negocio llega con "necesitamos Nequi". Luego Daviplata. Luego PayPal. Ese `if/else` que empezó en diez líneas ahora tiene ochenta, y cualquiera que lo toque siente que está desactivando una bomba.

El **Patrón Strategy** resuelve exactamente eso. No es magia, es una idea simple: en vez de meter toda la lógica en un mismo lugar, cada variante vive en su propia clase. El sistema elige cuál usar en tiempo de ejecución, y agregar una nueva opción se vuelve crear un archivo nuevo en vez de editar uno que ya funciona.

## 1. El problema con los condicionales que crecen

Antes de ver la solución, vale la pena entender por qué el problema es real.

Imagina un servicio de pagos. La primera versión solo tenía PSE:

```java
@Service
public class PaymentService {

    public void processPayment(String method, double amount) {
        if (method.equals("PSE")) {
            double commission = amount * 0.015;
            double total = amount + commission;
            // conectar con banco, debitar, registrar...
        }
    }
}
```

Seis meses después ese método tiene esto:

```java
public void processPayment(String method, double amount, String customerId) {
    if (method.equals("PSE")) {
        double commission = amount * 0.015;
        // 20 líneas de lógica PSE
    } else if (method.equals("CARD")) {
        // validar CVV, consultar antifraude
        // 30 líneas de lógica de tarjeta
    } else if (method.equals("NEQUI")) {
        // verificar cuenta, consultar saldo
        // 25 líneas de lógica Nequi
    } else if (method.equals("DAVIPLATA")) {
        // casi igual a Nequi pero con diferencias sutiles
        // 28 líneas
    } else {
        throw new IllegalArgumentException("Método no soportado");
    }
}
```

Hay varios problemas aquí. El primero y más obvio: cada vez que agregas un proveedor, tocas este método. Si algo se rompe, puede afectar a los demás. El segundo: las pruebas unitarias se vuelven un infierno porque tienes que cubrir todas las ramas de un solo método. El tercero, y el que más duele en producción: mezclas la lógica de selección con la lógica de ejecución, y esas dos cosas no tienen por qué vivir juntas.

## 2. La idea detrás del patrón

El Patrón Strategy separa esas dos responsabilidades:

- **¿Cuál algoritmo usar?** Lo decide el contexto (el service, el controller, quien sea).
- **¿Cómo ejecutar ese algoritmo?** Lo sabe cada estrategia por separado.

Para que eso funcione necesitas tres piezas:

1. Una **interfaz común** que todas las estrategias implementen.
2. Una **clase por estrategia**, que solo sabe de su propio algoritmo.
3. Un **contexto** que recibe la estrategia y la llama, sin saber qué hay dentro.

## 3. Caso real: API de pagos con Spring Boot y Java 21

Construyamos un endpoint `POST /api/v1/payments` que soporte múltiples métodos de pago. El objetivo es que agregar un proveedor nuevo no requiera tocar ningún archivo existente.

### Estructura del proyecto

```mermaid
com.geovannycode.payments
├── controller/
│   └── PaymentController.java
├── service/
│   └── PaymentService.java
├── strategy/
│   ├── PaymentStrategy.java          ← la interfaz
│   ├── CardPaymentStrategy.java
│   ├── PsePaymentStrategy.java
│   └── WalletPaymentStrategy.java
└── model/
    ├── PaymentRequest.java
    └── PaymentResponse.java
```

### Los modelos con records de Java 21

```java
public record PaymentRequest(
    @NotBlank String customerId,
    @Positive double amount,
    @NotBlank String currency,
    @NotBlank String paymentMethod
) {}

public record PaymentResponse(
    boolean success,
    String  transactionId,
    String  provider,
    double  amountCharged,
    String  message
) {}
```

Los `records` de Java 21 son perfectos para los DTOs de una API. Son clases inmutables que generan automáticamente constructor, getters, `equals`, `hashCode` y `toString`. No necesitas Lombok ni nada adicional. El compilador hace ese trabajo. Una `PaymentRequest` creada nunca va a cambiar su estado interno, que es exactamente lo que quieres de un objeto que represente la intención de un cliente.

### La interfaz Strategy: el corazón del patrón

```java
public interface PaymentStrategy {
    PaymentResponse pay(PaymentRequest request);
    boolean supports(String paymentMethod);
}
```

Este es el punto más importante del patrón y merece atención. La interfaz tiene dos métodos:

`pay()` es la lógica de negocio. Toma el request y devuelve una respuesta. Cada estrategia lo implementa a su manera.

`supports()` es el mecanismo de selección. Devuelve `true` si esa estrategia sabe manejar el método de pago indicado. Esto reemplaza completamente el `if/else` del service. En vez de preguntar "¿el método es PSE? ¿es CARD?", le preguntas a cada estrategia si puede manejar lo que llegó.

### Las estrategias concretas: una clase, una responsabilidad

```java
@Component
public class PsePaymentStrategy implements PaymentStrategy {

    private static final double PSE_COMMISSION = 0.015;

    @Override
    public PaymentResponse pay(PaymentRequest request) {
        /*
         * PSE aplica una comisión del 1.5% sobre el valor original.
         * El cliente paga el total con comisión incluida.
         */
        double commission = request.amount() * PSE_COMMISSION;
        double total      = request.amount() + commission;
        String txId       = "PSE-" + UUID.randomUUID();

        return new PaymentResponse(
            true,
            txId,
            "PSE",
            total,
            "Débito PSE procesado. Comisión aplicada: $" + commission
        );
    }

    @Override
    public boolean supports(String paymentMethod) {
        return "PSE".equalsIgnoreCase(paymentMethod);
    }
}
```

Nota el `@Component`. Spring va a encontrar esta clase en el classpath y la va a registrar como un bean. Eso es importante para lo que viene después.

```java
@Component
public class CardPaymentStrategy implements PaymentStrategy {

    @Override
    public PaymentResponse pay(PaymentRequest request) {
        /*
         * Las tarjetas no tienen comisión visible para el usuario en este flujo.
         * La integración real iría contra Wompi, PayU u otro gateway.
         */
        String txId = "CARD-" + UUID.randomUUID();

        return new PaymentResponse(
            true,
            txId,
            "CARD",
            request.amount(),
            "Pago con tarjeta aprobado"
        );
    }

    @Override
    public boolean supports(String paymentMethod) {
        return "CARD".equalsIgnoreCase(paymentMethod);
    }
}
```

```java
@Component
public class WalletPaymentStrategy implements PaymentStrategy {

    /*
     * Esta estrategia maneja múltiples billeteras digitales.
     * Todas comparten el mismo flujo, así que no tiene sentido
     * crear una clase por billetera.
     */
    private static final Set<String> SUPPORTED_WALLETS = Set.of("NEQUI", "DAVIPLATA");

    @Override
    public PaymentResponse pay(PaymentRequest request) {
        String provider = request.paymentMethod().toUpperCase();
        String txId     = provider + "-" + UUID.randomUUID();

        return new PaymentResponse(
            true,
            txId,
            provider,
            request.amount(),
            "Billetera " + provider + " debitada exitosamente"
        );
    }

    @Override
    public boolean supports(String paymentMethod) {
        return SUPPORTED_WALLETS.contains(paymentMethod.toUpperCase());
    }
}
```

Cada clase sabe exactamente una cosa. `PsePaymentStrategy` sabe cómo cobrar con PSE, no si es la estrategia correcta para el request que llegó. Eso lo decide el service.

### El Service: donde el patrón brilla

```java
@Service
public class PaymentService {

    private final List<PaymentStrategy> strategies;

    /*
     * Cuando declaras List<PaymentStrategy> en el constructor,
     * Spring busca TODOS los beans que implementen esa interfaz
     * y los inyecta automáticamente en la lista.
     *
     * Eso incluye PsePaymentStrategy, CardPaymentStrategy y WalletPaymentStrategy.
     * Si mañana agregas una cuarta clase con @Component, Spring la incluye
     * en esta lista sin que toques este archivo.
     */
    public PaymentService(List<PaymentStrategy> strategies) {
        this.strategies = strategies;
    }

    public PaymentResponse process(PaymentRequest request) {
        return strategies.stream()
            .filter(s -> s.supports(request.paymentMethod()))  // pregunta a cada estrategia
            .findFirst()                                        // toma la primera que diga "sí"
            .map(s -> s.pay(request))                          // ejecuta el pago
            .orElseThrow(() -> new ResponseStatusException(    // si ninguna aplica, error claro
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Método de pago no soportado: " + request.paymentMethod()
            ));
    }
}
```

Ese `.stream().filter(s -> s.supports(...)).findFirst()` reemplaza todo el `if/else` de antes. El service no sabe cuántas estrategias existen ni los nombres de ninguna. Solo sabe que tiene una lista y que alguna de ellas sabe manejar el request. Si ninguna lo sabe, devuelve un `422` con un mensaje claro.

### El Controller: lo más delgado posible

```java
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    /**
     * POST /api/v1/payments
     *
     * Procesa un pago usando el método indicado en el body.
     * El sistema selecciona automáticamente la estrategia correspondiente.
     */
    @PostMapping
    public ResponseEntity<PaymentResponse> pay(
            @RequestBody @Valid PaymentRequest request) {

        PaymentResponse response = service.process(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

El controller no sabe nada de PSE, tarjetas ni billeteras. Recibe el request, lo manda al service, devuelve el resultado. Si en el futuro el endpoint necesita autenticación o rate limiting, se agrega aquí sin tocar nada de la lógica de pagos.

## 4. Probando el endpoint

**Pago con PSE:**

```http
POST /api/v1/payments
Content-Type: application/json

{
  "customerId": "user-001",
  "amount": 120000,
  "currency": "COP",
  "paymentMethod": "PSE"
}
```

```json
HTTP/1.1 201 Created

{
  "success": true,
  "transactionId": "PSE-3f2a1b4c-9e8d-...",
  "provider": "PSE",
  "amountCharged": 121800.0,
  "message": "Débito PSE procesado. Comisión aplicada: $1800.0"
}
```

**Pago con Nequi:**

```http
POST /api/v1/payments
Content-Type: application/json

{
  "customerId": "user-002",
  "amount": 55000,
  "currency": "COP",
  "paymentMethod": "NEQUI"
}
```

```json
HTTP/1.1 201 Created

{
  "success": true,
  "transactionId": "NEQUI-7c8d2e3f-...",
  "provider": "NEQUI",
  "amountCharged": 55000.0,
  "message": "Billetera NEQUI debitada exitosamente"
}
```

**Método que no existe:**

```http
POST /api/v1/payments
Content-Type: application/json

{
  "customerId": "user-003",
  "amount": 30000,
  "currency": "COP",
  "paymentMethod": "BITCOIN"
}
```

```json
HTTP/1.1 422 Unprocessable Entity

{
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Método de pago no soportado: BITCOIN"
}
```

## 5. La prueba definitiva: agregar un proveedor nuevo

El negocio quiere soportar PayPal. Esto es lo único que tienes que hacer:

```java
@Component
public class PayPalPaymentStrategy implements PaymentStrategy {

    @Override
    public PaymentResponse pay(PaymentRequest request) {
        /*
         * PayPal convierte a USD antes de procesar.
         * La tasa de cambio en producción vendría de un servicio externo.
         */
        double usdAmount = request.amount() / 4_200.0;
        String txId = "PAYPAL-" + UUID.randomUUID();

        return new PaymentResponse(
            true,
            txId,
            "PAYPAL",
            request.amount(),
            "PayPal procesado. Equivalente USD: $" + String.format("%.2f", usdAmount)
        );
    }

    @Override
    public boolean supports(String paymentMethod) {
        return "PAYPAL".equalsIgnoreCase(paymentMethod);
    }
}
```

Eso es todo. Creas el archivo, Spring lo descubre, lo inyecta en la lista del service, y el endpoint ya acepta `"paymentMethod": "PAYPAL"` sin que hayas tocado `PaymentController.java`, `PaymentService.java` ni ninguna estrategia existente.

Eso es el principio Open/Closed en la práctica: el sistema está abierto para extensión pero cerrado para modificación.

## 6. Cuándo tiene sentido usar este patrón

No todo merece una interfaz y tres implementaciones. Si tienes dos variantes simples que no van a crecer, un `if/else` es perfectamente válido.

Pero si reconoces estas señales, el Strategy vale la pena:

- El condicional ya tiene más de tres ramas y sigue creciendo.
- Cada rama tiene su propia complejidad interna: llamadas a APIs distintas, reglas de negocio distintas.
- Quieres poder probar cada variante de forma aislada.
- El equipo de negocio te pide nuevos proveedores con frecuencia.

## Conclusión

El Patrón Strategy convierte las variantes de comportamiento en clases de primera clase. En vez de un `if/else` que nadie quiere tocar, tienes una lista de estrategias donde cada una sabe exactamente qué puede hacer.

Con Spring Boot, la inyección de `List<PaymentStrategy>` hace que el framework maneje el registro automáticamente. El resultado es un sistema donde agregar un proveedor nuevo no asusta a nadie, las pruebas son limpias porque cada estrategia es independiente, y cuando algo falla sabes exactamente dónde mirar.

---

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Libro: *Design Patterns: Elements of Reusable Object-Oriented Software*
    - 🖋️ Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
    - Capítulo 5: Behavioral Patterns — Strategy

- Libro: *Head First Design Patterns, 2nd Edition*
    - 🖋️ Eric Freeman, Elisabeth Robson — O'Reilly Media

- Documentación de Spring Framework: Dependency Injection
    - 📄 Inyección de colecciones de beans — base del registro automático de estrategias
    - 🔗 [https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)

- Artículo: *The Strategy Pattern in Java*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/java-strategy-pattern](https://www.baeldung.com/java-strategy-pattern)