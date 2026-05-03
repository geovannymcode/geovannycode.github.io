---
title: 'Patrón State en Java: cuando el mismo botón hace cosas distintas'
date: '2026-05-08'
image: "/img/blog/24.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Patrones de Diseño
    - State Pattern
    - Spring Boot
    - Java 21
author: Geovanny Mendoza
short: El Patrón State convierte las reglas de negocio implícitas en comportamiento explícito. Cada estado sabe exactamente qué puede y qué no puede hacer. Cuando el negocio agrega un nuevo estado del ciclo de vida, creas una clase nueva con sus propias reglas — las existentes no se tocan.
---

## Introducción

Hay un tipo de bug que es particularmente feo. No falla con un `NullPointerException` ni con un error de compilación. Falla silenciosamente: alguien cancela una orden que ya fue entregada, o el sistema intenta despachar una orden que todavía no fue confirmada, y en vez de un error claro, el estado queda inconsistente en base de datos.

Ese tipo de bug nace de este tipo de código:

```java
public void ship(String orderId) {
    var order = orderRepository.findById(orderId);
    // ¿Qué pasa si la orden está cancelada? ¿Si ya fue entregada?
    // ¿Si nunca fue confirmada?
    order.setStatus("SHIPPED");
    orderRepository.save(order);
}
```

No hay validación de estado. El método simplemente ejecuta. Y el problema se multiplica porque tienes `confirm()`, `ship()`, `deliver()` y `cancel()` — cada uno con la misma omisión.

La solución naive es llenar cada método de condicionales:

```java
public void ship(String orderId) {
    var order = orderRepository.findById(orderId);
    if (!order.getStatus().equals("PREPARING")) {
        throw new IllegalStateException("Solo se puede despachar una orden en preparación");
    }
    // ... continuar
}
```

Eso funciona, pero no escala. Cuando tienes seis estados y cinco acciones, estás gestionando treinta combinaciones posibles repartidas entre métodos distintos. Agregar un estado nuevo significa revisar todos los métodos existentes para ver si aplica.

El **Patrón State** resuelve eso extrayendo el comportamiento de cada estado a su propia clase. La orden delega cada acción al objeto de estado activo, y ese objeto sabe exactamente qué puede y qué no puede hacer en ese momento del ciclo de vida.

## 1. La idea central

Una orden no es siempre lo mismo. Una orden `PENDING` puede confirmarse o cancelarse, pero no puede despacharse. Una orden `SHIPPED` puede entregarse, pero ya no puede cancelarse. Una orden `DELIVERED` no puede hacer nada más — es un estado terminal.

En vez de codificar esas reglas en el service con condicionales, las pones en cada clase de estado. Cuando llega la acción `ship()`, la orden le pregunta a su estado actual si puede manejarla. Si puede, lo hace y transiciona al siguiente estado. Si no puede, lanza el error apropiado.

## 2. Caso real: ciclo de vida de una orden por API REST

Construyamos los endpoints que gestionan una orden: `POST /confirm`, `POST /prepare`, `POST /ship`, `POST /deliver`, `POST /cancel`. Cada uno se comporta diferente según el estado actual de la orden.

### Estructura del proyecto

```mermaid
com.geovannycode.orders
├── controller/
│   └── OrderController.java
├── service/
│   └── OrderService.java
├── state/
│   ├── OrderState.java              ← sealed interface
│   ├── PendingState.java
│   ├── ConfirmedState.java
│   ├── PreparingState.java
│   ├── ShippedState.java
│   ├── DeliveredState.java
│   └── CancelledState.java
└── model/
    ├── Order.java                   ← el Context
    └── OrderResponse.java
```

### El modelo de respuesta

```java
public record OrderResponse(
    String orderId,
    String status,
    String customerEmail,
    double total,
    String message
) {}
```

### La interfaz State — `sealed` en Java 21

```java
/*
 * sealed interface es una de las mejores features de Java 17+.
 * Le dice al compilador: "estas son TODAS las implementaciones posibles".
 *
 * Eso tiene una consecuencia importante: cuando usas pattern matching
 * con switch sobre este tipo, el compilador valida que cubras todos los casos.
 * Si agregas un nuevo estado y olvidas manejarlo en algún switch, el compilador te avisa.
 * No en producción. No en un bug report. En tiempo de compilación.
 */
public sealed interface OrderState
    permits PendingState, ConfirmedState, PreparingState,
            ShippedState, DeliveredState, CancelledState {

    void confirm(Order order);
    void startPreparing(Order order);
    void ship(Order order);
    void deliver(Order order);
    void cancel(Order order);
    String name();
}
```

### El Context — la Orden

```java
/*
 * Order es el Context: mantiene la referencia al estado actual
 * y delega todas las acciones a él.
 *
 * Lo importante es que Order no tiene ningún if/else sobre el estado.
 * Simplemente llama al método del estado activo y ese objeto
 * decide qué hacer.
 */
public class Order {

    private final String orderId;
    private final String customerEmail;
    private final double total;
    private OrderState   state;

    public Order(String orderId, String customerEmail, double total) {
        this.orderId       = orderId;
        this.customerEmail = customerEmail;
        this.total         = total;
        this.state         = new PendingState();  // toda orden empieza pendiente
    }

    // Delegación pura: Order no decide nada, el estado decide todo
    public void confirm()        { state.confirm(this); }
    public void startPreparing() { state.startPreparing(this); }
    public void ship()           { state.ship(this); }
    public void deliver()        { state.deliver(this); }
    public void cancel()         { state.cancel(this); }

    /*
     * Solo los estados llaman a este método para hacer transiciones.
     * El service nunca debería llamar a transitionTo() directamente.
     */
    public void transitionTo(OrderState newState) {
        this.state = newState;
    }

    public OrderResponse toResponse(String message) {
        return new OrderResponse(orderId, state.name(), customerEmail, total, message);
    }

    public String getOrderId()       { return orderId; }
    public String getCustomerEmail() { return customerEmail; }
}
```

### Los estados concretos

```java
/*
 * PENDING: la orden existe pero el pago no fue confirmado.
 * Puede confirmarse (pago recibido) o cancelarse (cliente desistió).
 * Cualquier otra acción es un error.
 */
public final class PendingState implements OrderState {

    @Override
    public void confirm(Order order) {
        /*
         * El pago fue confirmado. Transicionamos a CONFIRMED.
         * A partir de aquí el negocio considera que la venta ocurrió.
         */
        order.transitionTo(new ConfirmedState());
    }

    @Override
    public void startPreparing(Order order) {
        reject("Solo puedes preparar una orden que ya fue confirmada.");
    }

    @Override
    public void ship(Order order) {
        reject("No puedes despachar una orden que aún no tiene pago confirmado.");
    }

    @Override
    public void deliver(Order order) {
        reject("La orden no ha sido enviada todavía.");
    }

    @Override
    public void cancel(Order order) {
        // Cancelar antes del pago no genera reembolso
        order.transitionTo(new CancelledState());
    }

    @Override
    public String name() { return "PENDING"; }

    private void reject(String reason) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Acción no permitida en estado PENDING. " + reason);
    }
}
```

```java
/*
 * CONFIRMED: el pago fue recibido.
 * El siguiente paso lógico es que bodega empiece la preparación.
 * También puede cancelarse (con reembolso, que gestiona el service).
 */
public final class ConfirmedState implements OrderState {

    @Override
    public void confirm(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Esta orden ya fue confirmada.");
    }

    @Override
    public void startPreparing(Order order) {
        order.transitionTo(new PreparingState());
    }

    @Override
    public void ship(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Acción no permitida en CONFIRMED: la orden debe estar en preparación antes de despacharse.");
    }

    @Override
    public void deliver(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Acción no permitida en CONFIRMED: la orden no ha sido enviada.");
    }

    @Override
    public void cancel(Order order) {
        // Cancelar aquí implica reembolso — esa lógica está en el service
        order.transitionTo(new CancelledState());
    }

    @Override
    public String name() { return "CONFIRMED"; }
}
```

```java
/*
 * PREPARING: bodega está alistando el pedido.
 * El siguiente paso es el despacho.
 */
public final class PreparingState implements OrderState {

    @Override
    public void confirm(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya fue confirmada.");
    }

    @Override
    public void startPreparing(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya está en preparación.");
    }

    @Override
    public void ship(Order order) {
        order.transitionTo(new ShippedState());
    }

    @Override
    public void deliver(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "La orden aún no ha sido despachada.");
    }

    @Override
    public void cancel(Order order) {
        // Cancelar en preparación también implica reembolso y devolver stock
        order.transitionTo(new CancelledState());
    }

    @Override
    public String name() { return "PREPARING"; }
}
```

```java
/*
 * SHIPPED: la orden fue entregada al operador logístico y está en camino.
 * Ya no se puede cancelar — está fuera de nuestras manos.
 * Solo puede confirmarse la entrega.
 */
public final class ShippedState implements OrderState {

    @Override
    public void confirm(Order order)        { alreadyShipped(); }
    @Override
    public void startPreparing(Order order) { alreadyShipped(); }
    @Override
    public void ship(Order order)           { alreadyShipped(); }

    @Override
    public void deliver(Order order) {
        order.transitionTo(new DeliveredState());
    }

    @Override
    public void cancel(Order order) {
        /*
         * Una orden en tránsito no puede cancelarse por API.
         * El cliente debe contactar soporte para gestionar la devolución
         * directamente con el operador logístico.
         */
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "No puedes cancelar una orden que ya fue despachada. Contacta a soporte.");
    }

    @Override
    public String name() { return "SHIPPED"; }

    private void alreadyShipped() {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "La orden ya fue despachada.");
    }
}
```

```java
/*
 * DELIVERED: la orden llegó al cliente. Estado terminal.
 * No hay ninguna transición válida desde aquí.
 * Las devoluciones se gestionan por un flujo separado (RMA).
 */
public final class DeliveredState implements OrderState {

    @Override public void confirm(Order o)        { terminal(); }
    @Override public void startPreparing(Order o) { terminal(); }
    @Override public void ship(Order o)           { terminal(); }
    @Override public void deliver(Order o)        { terminal(); }

    @Override
    public void cancel(Order order) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "La orden ya fue entregada. Para devoluciones usa el portal de RMA.");
    }

    @Override
    public String name() { return "DELIVERED"; }

    private void terminal() {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "La orden ya fue entregada. No hay acciones disponibles.");
    }
}
```

```java
/*
 * CANCELLED: la orden fue cancelada. Estado terminal.
 * No hay vuelta atrás desde aquí.
 */
public final class CancelledState implements OrderState {

    @Override public void confirm(Order o)        { terminal(); }
    @Override public void startPreparing(Order o) { terminal(); }
    @Override public void ship(Order o)           { terminal(); }
    @Override public void deliver(Order o)        { terminal(); }

    @Override
    public void cancel(Order o) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "La orden ya fue cancelada.");
    }

    @Override
    public String name() { return "CANCELLED"; }

    private void terminal() {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "La orden fue cancelada. No hay acciones disponibles.");
    }
}
```

### El Service

```java
@Service
public class OrderService {

    /*
     * En producción esto sería un repositorio JPA o Redis.
     * Aquí usamos un mapa en memoria para mantener el ejemplo simple.
     */
    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    public OrderResponse createOrder(String customerEmail, double total) {
        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var order = new Order(orderId, customerEmail, total);
        orders.put(orderId, order);
        return order.toResponse("Orden creada");
    }

    public OrderResponse confirm(String orderId) {
        var order = find(orderId);
        order.confirm();
        return order.toResponse("Pago confirmado");
    }

    public OrderResponse startPreparing(String orderId) {
        var order = find(orderId);
        order.startPreparing();
        return order.toResponse("Preparación iniciada en bodega");
    }

    public OrderResponse ship(String orderId) {
        var order = find(orderId);
        order.ship();
        return order.toResponse("Orden despachada al operador logístico");
    }

    public OrderResponse deliver(String orderId) {
        var order = find(orderId);
        order.deliver();
        return order.toResponse("Entrega confirmada");
    }

    public OrderResponse cancel(String orderId) {
        var order = find(orderId);
        order.cancel();
        return order.toResponse("Orden cancelada");
    }

    public OrderResponse getStatus(String orderId) {
        return find(orderId).toResponse("OK");
    }

    private Order find(String orderId) {
        return Optional.ofNullable(orders.get(orderId))
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Orden no encontrada: " + orderId));
    }
}
```

### El Controller

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @RequestParam String customerEmail,
            @RequestParam double total) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(service.createOrder(customerEmail, total));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> status(@PathVariable String id) {
        return ResponseEntity.ok(service.getStatus(id));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<OrderResponse> confirm(@PathVariable String id) {
        return ResponseEntity.ok(service.confirm(id));
    }

    @PostMapping("/{id}/prepare")
    public ResponseEntity<OrderResponse> prepare(@PathVariable String id) {
        return ResponseEntity.ok(service.startPreparing(id));
    }

    @PostMapping("/{id}/ship")
    public ResponseEntity<OrderResponse> ship(@PathVariable String id) {
        return ResponseEntity.ok(service.ship(id));
    }

    @PostMapping("/{id}/deliver")
    public ResponseEntity<OrderResponse> deliver(@PathVariable String id) {
        return ResponseEntity.ok(service.deliver(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancel(@PathVariable String id) {
        return ResponseEntity.ok(service.cancel(id));
    }
}
```

## 3. Probando el flujo completo

**Flujo feliz — orden entregada:**

```http
POST /api/v1/orders?customerEmail=juan@mail.com&total=55500
→ 201 { "orderId": "ORD-A1B2C3D4", "status": "PENDING" }

POST /api/v1/orders/ORD-A1B2C3D4/confirm
→ 200 { "status": "CONFIRMED", "message": "Pago confirmado" }

POST /api/v1/orders/ORD-A1B2C3D4/prepare
→ 200 { "status": "PREPARING", "message": "Preparación iniciada en bodega" }

POST /api/v1/orders/ORD-A1B2C3D4/ship
→ 200 { "status": "SHIPPED", "message": "Orden despachada al operador logístico" }

POST /api/v1/orders/ORD-A1B2C3D4/deliver
→ 200 { "status": "DELIVERED", "message": "Entrega confirmada" }
```

**Intentar cancelar una orden entregada:**

```http
POST /api/v1/orders/ORD-A1B2C3D4/cancel
```
```json
HTTP/1.1 409 Conflict

{
  "status": 409,
  "message": "La orden ya fue entregada. Para devoluciones usa el portal de RMA."
}
```

**Saltar el estado de preparación:**

```http
POST /api/v1/orders/ORD-NUEVO/ship
```
```json
HTTP/1.1 409 Conflict

{
  "status": 409,
  "message": "Acción no permitida en estado PENDING. No puedes despachar una orden que aún no tiene pago confirmado."
}
```

## 4. El poder del `sealed interface` con pattern matching

Una de las ventajas de usar `sealed interface` es que el compilador conoce todos los estados posibles. Eso habilita switches exhaustivos:

```java
// El compilador verifica que cubras todos los casos.
// Si agregas InDisputeState a la lista de permits y olvidas este switch, error de compilación.
public String describeState(OrderState state) {
    return switch (state) {
        case PendingState   s -> "⏳ Esperando confirmación de pago";
        case ConfirmedState s -> "✅ Pago recibido — pendiente de preparación";
        case PreparingState s -> "📦 Bodega alistando el pedido";
        case ShippedState   s -> "🚚 En camino con el operador logístico";
        case DeliveredState s -> "🎉 Entregado al cliente";
        case CancelledState s -> "❌ Cancelado";
        // Sin 'default' — el compilador garantiza que no te falta ningún caso
    };
}
```

Sin el `default`, si mañana agregas `InDisputeState` a la lista de `permits` y olvidas este switch, el código no compila. No se cuela el error a producción.

## 5. Cuándo tiene sentido este patrón

Tiene sentido cuando el objeto tiene estados claramente diferenciados con reglas de transición explícitas, las acciones disponibles cambian radicalmente según el estado, y quieres que las transiciones inválidas fallen rápido con un error claro en vez de silenciosamente con datos inconsistentes.

No lo apliques cuando tienes dos o tres estados simples sin lógica compleja. Un `if` que valida si una entidad está activa antes de eliminarla no necesita un patrón State. El patrón cobra valor cuando el número de estados y la complejidad de las reglas de transición empiezan a crecer.

## Conclusión

El Patrón State convierte las reglas de negocio implícitas en comportamiento explícito. Cada estado sabe exactamente qué puede y qué no puede hacer, y el compilador — gracias al `sealed interface` de Java 21 — te avisa si agregas un estado nuevo y olvidas cubrir algún caso.

El controller es delgado, el service es un orquestador limpio, y cuando el negocio agrega un nuevo estado del ciclo de vida — `IN_DISPUTE`, `RETURNED`, lo que sea — creas una clase nueva con sus propias reglas. Las clases existentes no se tocan.

---

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Libro: *Design Patterns: Elements of Reusable Object-Oriented Software*
    - 🖋️ Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
    - Capítulo 5: Behavioral Patterns — State

- Libro: *Head First Design Patterns, 2nd Edition*
    - 🖋️ Eric Freeman, Elisabeth Robson — O'Reilly Media

- JEP 409: Sealed Classes
    - 📄 Especificación oficial de `sealed interface` en Java 17+
    - 🔗 [https://openjdk.org/jeps/409](https://openjdk.org/jeps/409)

- Artículo: *The State Pattern in Java*
    - 📄 Baeldung — ejemplo práctico de implementación
    - 🔗 [https://www.baeldung.com/java-state-design-pattern](https://www.baeldung.com/java-state-design-pattern)