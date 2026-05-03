---
title: 'Patrón Facade en Java: un solo punto de entrada para la complejidad'
date: '2026-05-05'
image: "/img/blog/22.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Patrones de Diseño
    - Facade Pattern
    - Spring Boot
    - Java 21
author: Geovanny Mendoza
short: La Facade es el caso de uso hecho clase. Cuando un endpoint empieza a coordinar cinco servicios en orden, con validaciones intermedias, esa lógica no pertenece al controller. Pertenece a la Facade, donde el flujo es legible y los cambios de negocio tienen un solo lugar al que ir.
---

## Introducción

Hay una pregunta que vale hacerse cuando diseñas un controller: ¿cuántas cosas debería saber este endpoint sobre cómo funciona el sistema internamente?

La respuesta honesta es: lo menos posible.

El problema aparece cuando `POST /api/v1/checkout` empieza a verse así:

```java
@PostMapping
public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request) {
    if (!authService.isAuthenticated(request.userId())) {
        return ResponseEntity.status(401).build();
    }
    var stock = inventoryService.getStock(request.productId());
    if (stock < request.quantity()) {
        return ResponseEntity.status(409).build();
    }
    var payment = paymentService.charge(request.userId(), request.total());
    if (!payment.approved()) {
        return ResponseEntity.status(402).build();
    }
    inventoryService.reserve(request.productId(), request.quantity());
    String orderId = orderService.create(request.userId(), payment.txId());
    notificationService.sendConfirmation(request.userId(), orderId);
    return ResponseEntity.status(201).body(orderId);
}
```

Ese controller sabe demasiado. Conoce el orden exacto de los pasos, maneja los errores de cinco servicios distintos, y si el proceso de checkout cambia, tienes que venir aquí a modificarlo. Eso es frágil.

El **Patrón Facade** extrae toda esa orquestación a una sola clase. El controller hace una llamada. La Facade coordina todo internamente. El controller ni se entera de cuántos pasos tiene el proceso.

## 1. Qué hace exactamente una Facade

Una Facade no es una clase que "agrupa métodos". Es una clase que representa un caso de uso completo. Cuando el controller llama a `facade.checkout(request)`, la Facade es responsable de llamar a los subsistemas en el orden correcto, manejar las condiciones de error de cada uno, decidir qué hacer si algo falla en la mitad del proceso, y devolver un resultado coherente al llamador.

El controller no coordina nada. Solo delega.

## 2. Caso real: Checkout de un e-commerce

Un proceso de compra típico involucra autenticación, validación de inventario, cobro, reserva de stock, creación de la orden y notificación al cliente. Seis pasos, cinco servicios. Exactamente el escenario donde una Facade vale la pena.

### Estructura del proyecto

```mermaid
com.geovannycode.store
├── controller/
│   └── CheckoutController.java
├── facade/
│   └── CheckoutFacade.java           ← el corazón de este patrón
├── service/
│   ├── AuthService.java
│   ├── InventoryService.java
│   ├── PaymentService.java
│   ├── OrderService.java
│   └── NotificationService.java
└── model/
    ├── CheckoutRequest.java
    └── CheckoutResponse.java
```

### Los modelos

```java
public record CheckoutRequest(
    @NotBlank String userId,
    @NotBlank String productId,
    @Positive int    quantity,
    @NotBlank String paymentMethod
) {}

public record CheckoutResponse(
    boolean success,
    String  orderId,
    String  paymentTransactionId,
    double  totalCharged,
    String  message
) {}
```

### Los subsistemas — cada uno hace una sola cosa

```java
// Verifica que el usuario tenga sesión válida
@Service
public class AuthService {

    public boolean isAuthenticated(String userId) {
        /*
         * En producción esto validaría el JWT contra Redis
         * o consultaría el servicio de sesiones.
         */
        return userId != null && !userId.isBlank();
    }
}
```

```java
@Service
public class InventoryService {

    // En producción esto viene de la base de datos
    public record StockInfo(String productId, String name, int available, double unitPrice) {}

    public StockInfo getStock(String productId) {
        return new StockInfo(productId, "Kombucha Jengibre 500ml", 47, 18_500.0);
    }

    public void reserveStock(String productId, int quantity) {
        /*
         * Descuenta el stock y publica un evento de dominio.
         * Los observers de inventario reaccionan desde aquí.
         */
    }
}
```

```java
@Service
public class PaymentService {

    public record PaymentResult(boolean approved, String transactionId, double charged) {}

    public PaymentResult charge(String userId, double amount, String method) {
        /*
         * Aquí viviría la integración real con el gateway de pagos.
         * El resultado viene del proveedor externo.
         */
        String txId = method.toUpperCase() + "-" + UUID.randomUUID();
        return new PaymentResult(true, txId, amount);
    }
}
```

```java
@Service
public class OrderService {

    public String createOrder(String userId, String productId, int qty, String txId) {
        // Persiste en base de datos y retorna el ID generado
        return "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
```

```java
@Service
public class NotificationService {

    public void sendOrderConfirmation(String userId, String orderId, double total) {
        /*
         * Dispara el canal preferido del usuario: email, WhatsApp o push.
         * El servicio de notificaciones sabe cuál usar según el perfil.
         */
    }
}
```

Cada servicio es pequeño, enfocado y testeable por separado. Ninguno sabe que los otros existen. Eso es lo que la Facade va a coordinar.

### La Facade — la orquestadora

```java
@Service
public class CheckoutFacade {

    private final AuthService         authService;
    private final InventoryService    inventoryService;
    private final PaymentService      paymentService;
    private final OrderService        orderService;
    private final NotificationService notificationService;

    /*
     * Spring inyecta los cinco servicios aquí.
     * Nota que usamos inyección por constructor, no @Autowired en campo.
     * Eso hace que las dependencias sean explícitas y el objeto siempre
     * esté en un estado válido al construirse.
     */
    public CheckoutFacade(
            AuthService authService,
            InventoryService inventoryService,
            PaymentService paymentService,
            OrderService orderService,
            NotificationService notificationService) {

        this.authService         = authService;
        this.inventoryService    = inventoryService;
        this.paymentService      = paymentService;
        this.orderService        = orderService;
        this.notificationService = notificationService;
    }

    public CheckoutResponse checkout(CheckoutRequest request) {

        // Paso 1: ¿el usuario está autenticado?
        if (!authService.isAuthenticated(request.userId())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }

        // Paso 2: ¿hay suficiente stock?
        var stock = inventoryService.getStock(request.productId());
        if (stock.available() < request.quantity()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Stock insuficiente. Disponible: %d, solicitado: %d"
                    .formatted(stock.available(), request.quantity()));
        }

        // Paso 3: cobrar
        double total  = stock.unitPrice() * request.quantity();
        var payment   = paymentService.charge(request.userId(), total, request.paymentMethod());

        if (!payment.approved()) {
            throw new ResponseStatusException(
                HttpStatus.PAYMENT_REQUIRED, "El pago fue rechazado por la entidad");
        }

        // Paso 4: reservar el stock (ya validamos que había suficiente)
        inventoryService.reserveStock(request.productId(), request.quantity());

        // Paso 5: crear la orden en base de datos
        String orderId = orderService.createOrder(
            request.userId(),
            request.productId(),
            request.quantity(),
            payment.transactionId()
        );

        // Paso 6: notificar al cliente
        notificationService.sendOrderConfirmation(request.userId(), orderId, payment.charged());

        return new CheckoutResponse(
            true,
            orderId,
            payment.transactionId(),
            payment.charged(),
            "Compra realizada con éxito"
        );
    }
}
```

El orden importa. La validación de autenticación va primero porque es lo más barato de verificar. El stock se valida antes de cobrar porque no tiene sentido cobrarle a alguien si no hay producto. La reserva de stock va después del cobro porque si el pago falla no queremos reservar nada. Esas decisiones de negocio viven aquí, en la Facade, no repartidas entre el controller y los servicios.

### El Controller — delgado como debe ser

```java
@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    private final CheckoutFacade facade;

    public CheckoutController(CheckoutFacade facade) {
        this.facade = facade;
    }

    /**
     * POST /api/v1/checkout
     *
     * Ejecuta el proceso completo de compra.
     * Internamente coordina autenticación, inventario, pago, orden y notificación.
     */
    @PostMapping
    public ResponseEntity<CheckoutResponse> checkout(
            @RequestBody @Valid CheckoutRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED).body(facade.checkout(request));
    }
}
```

Una línea en el método. El controller recibe el request, se lo pasa a la Facade y devuelve el resultado. No sabe cuántos pasos hay. No sabe qué pasa si el stock es insuficiente. No sabe el orden en que se llaman los servicios. Todo eso es responsabilidad de la Facade.

## 3. Probando el endpoint

**Checkout exitoso:**

```http
POST /api/v1/checkout
Content-Type: application/json

{
  "userId": "user-001",
  "productId": "KOMBUCHA-500",
  "quantity": 3,
  "paymentMethod": "PSE"
}
```

```json
HTTP/1.1 201 Created

{
  "success": true,
  "orderId": "ORD-A1B2C3D4",
  "paymentTransactionId": "PSE-f7e8d9...",
  "totalCharged": 55500.0,
  "message": "Compra realizada con éxito"
}
```

**Stock insuficiente:**

```http
POST /api/v1/checkout
Content-Type: application/json

{
  "userId": "user-002",
  "productId": "TEMPEH-250",
  "quantity": 100,
  "paymentMethod": "CARD"
}
```

```json
HTTP/1.1 409 Conflict

{
  "status": 409,
  "message": "Stock insuficiente. Disponible: 12, solicitado: 100"
}
```

**Usuario no autenticado:**

```http
POST /api/v1/checkout
Content-Type: application/json

{
  "userId": "",
  "productId": "KOMBUCHA-500",
  "quantity": 1,
  "paymentMethod": "NEQUI"
}
```

```json
HTTP/1.1 401 Unauthorized

{
  "status": 401,
  "message": "Usuario no autenticado"
}
```

## 4. Lo que ganas con este patrón

Para probar el controller solo necesitas mockear la Facade. Para probar la Facade, mockeas los cinco servicios de forma independiente. Para probar cada servicio, no necesitas nada más. La pirámide de tests es limpia porque las capas están separadas de verdad.

Si el equipo decide agregar validación de fraude entre el paso 2 y el paso 3, lo agregas en la Facade. El controller, los tests del controller y los clientes que consumen el endpoint no se enteran. El flujo de checkout queda documentado en un solo lugar: cualquiera que lea `CheckoutFacade.checkout()` entiende en dos minutos qué hace un proceso de compra sin tener que saltar entre cinco archivos.

## 5. Cuándo tiene sentido y cuándo no

Tiene sentido cuando un caso de uso orquesta tres o más servicios con un orden específico, hay validaciones intermedias que dependen de resultados anteriores, y quieres que el controller sea delgado y el proceso esté documentado en un solo lugar.

No lo fuerces cuando tienes un endpoint simple que hace una sola cosa. Un `GET /api/v1/products/{id}` que llama a `productService.findById()` no necesita Facade. El patrón existe para simplificar complejidad real, no para agregar capas donde no hacen falta.

## Conclusión

La Facade es el caso de uso hecho clase. Toma la complejidad de coordinar múltiples servicios y la encapsula en un solo punto. El controller delega, la Facade orquesta, cada servicio hace su parte.

Con Spring Boot y la inyección por constructor, las dependencias son explícitas y el objeto siempre está en estado válido. Cuando el negocio cambia el proceso de checkout, sabes exactamente a dónde ir: a la Facade. Eso es lo que hace valioso al patrón — no elimina la complejidad, la concentra donde tiene que estar.

---

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Libro: *Design Patterns: Elements of Reusable Object-Oriented Software*
    - 🖋️ Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
    - Capítulo 4: Structural Patterns — Facade

- Libro: *Head First Design Patterns, 2nd Edition*
    - 🖋️ Eric Freeman, Elisabeth Robson — O'Reilly Media

- Documentación de Spring Framework: Dependency Injection
    - 📄 Inyección por constructor — por qué es preferible a @Autowired en campo
    - 🔗 [https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)

- Artículo: *The Facade Pattern in Java*
    - 📄 Baeldung — ejemplo práctico de implementación
    - 🔗 [https://www.baeldung.com/java-facade-pattern](https://www.baeldung.com/java-facade-pattern)