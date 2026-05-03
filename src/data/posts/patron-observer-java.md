---
title: 'Patrón Observer en Java: reaccionar a cambios sin acoplarte a ellos'
date: '2026-05-06'
image: "/img/blog/23.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Patrones de Diseño
    - Observer Pattern
    - Spring Boot
    - Java 21
author: Geovanny Mendoza
short: El Patrón Observer invierte el control — en vez de que el service empuje lógica hacia afuera, los interesados se suscriben y reaccionan por su cuenta. Agregar una nueva reacción al cambio de stock es crear una clase nueva, no editar la existente.
---

## Introducción

Imagina esto: el equipo de operaciones llega con tres requerimientos el mismo día.

Cuando el stock de un producto llegue a cero, quieren que el motor de búsqueda lo oculte del catálogo. También quieren que los clientes que estaban esperando ese producto reciban un email cuando vuelva a estar disponible. Y logística necesita una alerta interna cuando el inventario baje del mínimo.

La pregunta es: ¿dónde pones esa lógica?

La respuesta incorrecta es ponerla toda en el servicio de inventario:

```java
public void updateStock(String productId, int newStock) {
    inventoryRepository.save(productId, newStock);
    if (newStock == 0) {
        searchService.hideProduct(productId);        // acoplamiento
        emailService.notifyWaitlist(productId);      // acoplamiento
        alertService.sendCriticalAlert(productId);   // acoplamiento
    }
}
```

Ese service ahora conoce a `searchService`, `emailService` y `alertService`. La próxima vez que llegue un cuarto requerimiento, tienes que volver aquí, modificar este método y esperar que nada se rompa. El servicio de inventario, que debería saber solo de inventario, termina siendo responsable de todo lo que pasa alrededor de él.

El **Patrón Observer** invierte esa relación. En vez de que el servicio de inventario llame a todos los demás, los demás se suscriben al servicio de inventario. Cuando el stock cambia, el servicio notifica a sus suscriptores y ellos deciden qué hacer. El servicio de inventario no sabe quiénes son esos suscriptores ni cuántos hay.

## 1. Cómo funciona el patrón

Hay tres piezas que trabajan juntas.

El **Subject** (o Observable) es el que tiene el estado que importa — en este caso, el servicio de inventario. Mantiene una lista de observers y los notifica cuando algo cambia.

El **Observer** es una interfaz simple que define un método que se llama cuando ocurre el evento. Cada observer concreto implementa ese método con su propia lógica.

Los **ConcreteObservers** son los que reaccionan: el motor de búsqueda, el servicio de emails, el sistema de alertas. Cada uno sabe hacer una sola cosa y no conoce a los demás.

## 2. Caso real: API de inventario con reacciones automáticas

Construyamos `PATCH /api/v1/inventory/{productId}/stock`. Cuando el stock cambia, los observers se disparan automáticamente. El endpoint no sabe cuántos observers existen.

### Estructura del proyecto

```mermaid
com.geovannycode.inventory
├── controller/
│   └── InventoryController.java
├── service/
│   └── InventoryService.java          ← el Subject
├── observer/
│   ├── StockObserver.java             ← la interfaz
│   ├── WaitlistObserver.java
│   ├── SearchIndexObserver.java
│   └── LogisticsAlertObserver.java
└── model/
    ├── StockUpdateRequest.java
    ├── StockUpdateResponse.java
    └── StockEvent.java
```

### Los modelos

```java
public record StockUpdateRequest(
    @NotBlank String productName,
    @Min(0)   int    newStock
) {}

public record StockUpdateResponse(
    String productId,
    String productName,
    int    previousStock,
    int    currentStock,
    String eventType
) {}
```

```java
/*
 * StockEvent es el objeto que viaja entre el Subject y los observers.
 * Es inmutable: una vez creado, nadie puede modificarlo.
 *
 * Contiene todo lo que los observers podrían necesitar saber:
 * el estado anterior, el nuevo estado, y el tipo de evento calculado.
 * Así cada observer no tiene que calcular nada por su cuenta.
 */
public record StockEvent(
    String    productId,
    String    productName,
    int       previousStock,
    int       currentStock,
    EventType type
) {
    public enum EventType {
        OUT_OF_STOCK,   // llegó a 0
        LOW_STOCK,      // bajó del umbral mínimo
        RESTOCKED,      // volvió de 0 a tener unidades
        UPDATED         // cualquier otro cambio
    }
}
```

El enum `EventType` es importante. En vez de que cada observer calcule si el producto se agotó o si volvió, esa lógica vive en el Subject al momento de crear el evento. Los observers reciben un evento ya categorizado y solo tienen que decidir si les importa ese tipo.

### La interfaz Observer

```java
/*
 * @FunctionalInterface significa que esta interfaz tiene exactamente un método abstracto.
 * Eso la hace compatible con lambdas, lo que resulta útil para observers simples
 * que no necesitan una clase completa.
 *
 * Por ejemplo:
 * StockObserver auditObserver = event -> auditLog.record(event);
 */
@FunctionalInterface
public interface StockObserver {
    void onStockChanged(StockEvent event);
}
```

### Los observers concretos

```java
/*
 * Este observer notifica a los clientes que pusieron un producto en lista de espera.
 * Solo le importa el evento RESTOCKED: cuando un producto vuelve al catálogo.
 */
@Component
public class WaitlistObserver implements StockObserver {

    /*
     * En producción esto vendría de la base de datos.
     * Aquí lo simulamos con un mapa estático.
     */
    private final Map<String, List<String>> waitlistByProduct = Map.of(
        "PROD-001", List.of("ana@mail.com", "carlos@mail.com"),
        "PROD-002", List.of("juan@mail.com")
    );

    @Override
    public void onStockChanged(StockEvent event) {
        /*
         * Lo primero que hace cada observer es verificar si el evento le importa.
         * Si no es RESTOCKED, este observer no tiene nada que hacer.
         * Este patrón de "salida temprana" mantiene el código limpio.
         */
        if (event.type() != StockEvent.EventType.RESTOCKED) return;

        var waitingCustomers = waitlistByProduct.getOrDefault(event.productId(), List.of());
        if (waitingCustomers.isEmpty()) return;

        waitingCustomers.forEach(email ->
            System.out.printf("[Waitlist] Notificando a %s: '%s' está disponible nuevamente%n",
                email, event.productName())
        );
    }
}
```

```java
/*
 * Este observer actualiza el índice de búsqueda.
 * Le importan dos eventos: cuando el producto se agota (hay que ocultarlo)
 * y cuando vuelve a tener stock (hay que reindexarlo).
 */
@Component
public class SearchIndexObserver implements StockObserver {

    @Override
    public void onStockChanged(StockEvent event) {
        /*
         * El switch expression de Java 21 es perfecto aquí.
         * Cada tipo de evento tiene su acción correspondiente,
         * y el compilador avisa si agregas un nuevo EventType y olvidas manejarlo.
         */
        switch (event.type()) {
            case OUT_OF_STOCK -> System.out.printf(
                "[Search] Ocultando '%s' del índice (sin stock)%n",
                event.productName());
            case RESTOCKED    -> System.out.printf(
                "[Search] Reindexando '%s' — stock disponible: %d unidades%n",
                event.productName(), event.currentStock());
            default           -> {
                // LOW_STOCK y UPDATED no requieren cambios en el índice
            }
        }
    }
}
```

```java
/*
 * Este observer genera alertas internas para el equipo de logística.
 * No envía emails a clientes ni toca el índice de búsqueda.
 * Solo sabe de alertas internas.
 */
@Component
public class LogisticsAlertObserver implements StockObserver {

    @Override
    public void onStockChanged(StockEvent event) {
        switch (event.type()) {
            case OUT_OF_STOCK -> System.out.printf(
                "[Logistics] 🚨 CRÍTICO: '%s' agotado — requiere reabastecimiento urgente%n",
                event.productName());
            case LOW_STOCK    -> System.out.printf(
                "[Logistics] ⚠️  Stock bajo en '%s': %d unidades restantes%n",
                event.productName(), event.currentStock());
            default           -> {}
        }
    }
}
```

Cada observer tiene una responsabilidad clara: `WaitlistObserver` sabe de listas de espera, `SearchIndexObserver` sabe de índices de búsqueda, `LogisticsAlertObserver` sabe de alertas internas. Ninguno sabe de los otros.

### El Service — el Subject que notifica

```java
@Service
public class InventoryService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    /*
     * Spring inyecta aquí todos los @Component que implementen StockObserver.
     * Eso incluye WaitlistObserver, SearchIndexObserver y LogisticsAlertObserver.
     *
     * El service no los conoce por nombre. Solo sabe que tiene una lista
     * de cosas que quieren ser notificadas cuando el stock cambia.
     */
    private final List<StockObserver> observers;
    private final Map<String, Integer> stockDb = new ConcurrentHashMap<>();

    public InventoryService(List<StockObserver> observers) {
        this.observers = observers;
    }

    public StockUpdateResponse updateStock(String productId, StockUpdateRequest request) {
        int previous = stockDb.getOrDefault(productId, 0);
        stockDb.put(productId, request.newStock());

        // Calculamos el tipo de evento antes de notificar
        var eventType = resolveEventType(previous, request.newStock());
        var event     = new StockEvent(
            productId, request.productName(),
            previous, request.newStock(), eventType
        );

        /*
         * Notificamos a todos los observers.
         * El service no sabe qué va a hacer cada uno con el evento.
         * Eso es exactamente el punto del patrón.
         */
        observers.forEach(observer -> observer.onStockChanged(event));

        return new StockUpdateResponse(
            productId, request.productName(),
            previous, request.newStock(), eventType.name()
        );
    }

    /*
     * Esta lógica de clasificación del evento vive en el service
     * porque es parte del dominio de inventario, no de los observers.
     * Los observers no deberían calcular si el producto se agotó:
     * eso lo sabe el servicio que maneja el stock.
     */
    private StockEvent.EventType resolveEventType(int previous, int current) {
        if (current == 0)                                                    return StockEvent.EventType.OUT_OF_STOCK;
        if (previous == 0 && current > 0)                                    return StockEvent.EventType.RESTOCKED;
        if (current <= LOW_STOCK_THRESHOLD && previous > LOW_STOCK_THRESHOLD) return StockEvent.EventType.LOW_STOCK;
        return StockEvent.EventType.UPDATED;
    }
}
```

### El Controller

```java
@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    /**
     * PATCH /api/v1/inventory/{productId}/stock
     *
     * Actualiza el stock de un producto.
     * Los observers se disparan automáticamente según el tipo de cambio.
     */
    @PatchMapping("/{productId}/stock")
    public ResponseEntity<StockUpdateResponse> updateStock(
            @PathVariable String productId,
            @RequestBody @Valid StockUpdateRequest request) {

        return ResponseEntity.ok(service.updateStock(productId, request));
    }
}
```

## 3. Probando el endpoint

**Producto que se agota:**

```http
PATCH /api/v1/inventory/PROD-002/stock
Content-Type: application/json

{
  "productName": "Tempeh de Soya 250g",
  "newStock": 0
}
```

```json
HTTP/1.1 200 OK

{
  "productId": "PROD-002",
  "productName": "Tempeh de Soya 250g",
  "previousStock": 8,
  "currentStock": 0,
  "eventType": "OUT_OF_STOCK"
}
```

Automáticamente, sin que el controller sepa nada:
```bash
[Search]    Ocultando 'Tempeh de Soya 250g' del índice (sin stock)
[Logistics] 🚨 CRÍTICO: 'Tempeh de Soya 250g' agotado — requiere reabastecimiento urgente
```

**Reposición de inventario:**

```http
PATCH /api/v1/inventory/PROD-002/stock
Content-Type: application/json

{
  "productName": "Tempeh de Soya 250g",
  "newStock": 30
}
```

```json
HTTP/1.1 200 OK

{
  "productId": "PROD-002",
  "productName": "Tempeh de Soya 250g",
  "previousStock": 0,
  "currentStock": 30,
  "eventType": "RESTOCKED"
}
```

```bash
[Waitlist] Notificando a juan@mail.com: 'Tempeh de Soya 250g' está disponible nuevamente
[Search]   Reindexando 'Tempeh de Soya 250g' — stock disponible: 30 unidades
```

**Stock bajo:**

```http
PATCH /api/v1/inventory/PROD-001/stock
Content-Type: application/json

{
  "productName": "Kombucha Jengibre 500ml",
  "newStock": 3
}
```

```json
HTTP/1.1 200 OK

{
  "eventType": "LOW_STOCK"
}
```

```bash
[Logistics] ⚠️  Stock bajo en 'Kombucha Jengibre 500ml': 3 unidades restantes
```

## 4. Agregar un observer sin tocar nada existente

El equipo de analítica quiere registrar todos los eventos de inventario en su plataforma de métricas. Esto es todo lo que escribes:

```java
@Component
public class AnalyticsObserver implements StockObserver {

    @Override
    public void onStockChanged(StockEvent event) {
        /*
         * Envía el evento a DataDog, Prometheus, o donde sea.
         * Este observer no sabe de waitlists ni de índices de búsqueda.
         */
        System.out.printf("[Analytics] Evento '%s' registrado para '%s' | Stock: %d → %d%n",
            event.type(), event.productName(),
            event.previousStock(), event.currentStock());
    }
}
```

Spring lo descubre, lo agrega a la lista del service, y empieza a recibir notificaciones. Cero cambios en `InventoryService`, `InventoryController` ni en los otros observers.

## 5. La variante nativa de Spring: `@EventListener`

Spring Boot tiene soporte built-in para este patrón que vale conocer:

```java
// En el service, en vez de iterar la lista de observers manualmente:
@Service
public class InventoryService {

    private final ApplicationEventPublisher publisher;

    public InventoryService(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void updateStock(String productId, StockUpdateRequest request) {
        // ... lógica de negocio ...
        publisher.publishEvent(new StockEvent(productId, request.productName(),
            previous, request.newStock(), eventType));
    }
}

// En cualquier otro bean, para escuchar el evento:
@Component
public class AnalyticsObserver {

    @EventListener
    public void handleStockEvent(StockEvent event) {
        System.out.println("[Analytics] " + event.type() + " — " + event.productName());
    }
}
```

Con `@EventListener` el observer ni siquiera implementa una interfaz. Spring conecta todo por tipo de evento. La desventaja es que pierdes control explícito sobre el orden de notificación; la ventaja es que el código es aún más desacoplado. Para sistemas que ya usan Spring de forma intensiva, esta variante suele ser la más limpia.

## Conclusión

El Patrón Observer invierte el control: en vez de que el service empuje lógica hacia afuera, los interesados se suscriben y reaccionan por su cuenta.

Con Spring Boot y la inyección de `List<StockObserver>`, el service ni siquiera necesita saber cuántos observers existen — el framework los registra automáticamente. Si mañana llega un quinto requerimiento, creas una clase con `@Component`, implementas `onStockChanged`, y ya está en el sistema. El servicio de inventario sigue siendo responsable solo de inventario.

---

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Libro: *Design Patterns: Elements of Reusable Object-Oriented Software*
    - 🖋️ Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (Gang of Four)
    - Capítulo 5: Behavioral Patterns — Observer

- Libro: *Head First Design Patterns, 2nd Edition*
    - 🖋️ Eric Freeman, Elisabeth Robson — O'Reilly Media

- Documentación de Spring Framework: Application Events
    - 📄 `ApplicationEventPublisher` y `@EventListener` — variante nativa de Spring
    - 🔗 [https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events)

- Artículo: *The Observer Pattern in Java*
    - 📄 Baeldung — ejemplo práctico de implementación
    - 🔗 [https://www.baeldung.com/java-observer-pattern](https://www.baeldung.com/java-observer-pattern)