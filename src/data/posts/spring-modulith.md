---
#preview
title: 'Construcción de Monolitos Modulares con Spring Modulith'
date: '2026-03-30'
image: "/img/blog/12.png"
categories:
    - Backend
    - Arquitectura
tags:
    - Java
    - Spring Boot
    - Spring Modulith
    - Arquitectura
    - Microservicios
author: Geovanny Mendoza
short: Spring Modulith organiza una aplicación Spring Boot en módulos con fronteras claras, pruebas aisladas y documentación automática. Todo en un solo despliegue, sin la complejidad operativa de los microservicios.
---

# Construcción de Monolitos Modulares con Spring Modulith

## Introducción

Los monolitos tradicionales crecen hasta volverse difíciles de mantener. Los microservicios resuelven ese problema pero introducen complejidad operativa que no siempre está justificada. Los monolitos modulares son una alternativa intermedia: un único despliegue, pero con módulos internos que tienen fronteras claras y reglas de acceso explícitas.

Spring Modulith es una extensión de Spring Boot que facilita exactamente eso. En este artículo construimos una solución de gestión de pedidos con tres módulos (catálogo, pedidos e inventario) para mostrar cómo funciona en la práctica.

## ¿Qué es un monolito modular?

Un monolito modular se despliega como una única unidad pero se organiza internamente en módulos independientes. No es un monolito tradicional donde todo está mezclado, ni es una arquitectura distribuida con su carga operativa.

| Característica | Monolito Tradicional | Microservicios | Monolito Modular |
|---|---|---|---|
| Estructura | Todo en un solo bloque | Servicios independientes | Segmentado en módulos |
| Mantenibilidad | Difícil a gran escala | Alta, pero compleja | Alta y organizada |
| Escalabilidad | Limitada | Flexible pero costosa | Moderada |
| Complejidad operativa | Baja | Alta | Moderada |
| Desacoplamiento | Bajo | Alto | Medio |
| Facilidad de prueba | Baja | Alta | Alta |

## Spring Modulith

Spring Modulith convierte cada subpaquete del paquete raíz en un módulo. Sobre esa convención construye tres capacidades:

Controla qué clases de un módulo son accesibles desde otros, usando la visibilidad de paquete de Java como mecanismo de encapsulación. Detecta y rechaza dependencias cíclicas al arrancar la aplicación. Y genera documentación automática en AsciiDoc y diagramas en PlantUML que reflejan la estructura real del código.

También incluye soporte para pruebas aisladas por módulo: en lugar de levantar todo el contexto de Spring, puedes cargar solo el módulo que te interesa probar.

## Dependencias

Para Spring Modulith 2.0.5, usa el BOM para gestionar versiones:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.modulith</groupId>
            <artifactId>spring-modulith-bom</artifactId>
            <version>2.0.5</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-starter-core</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-docs</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

`spring-modulith-starter-core` habilita la detección de módulos y el control de dependencias. `spring-modulith-docs` genera la documentación automática. `spring-modulith-starter-test` expone `@ApplicationModuleTest` para pruebas aisladas.

## Sistema de gestión de pedidos

El proyecto tiene cuatro módulos: `catalog` para productos, `orders` para pedidos, `inventory` para stock, y `common` para clases compartidas.

```mermaid
src/main/java/com/example/ordersystem/
├── catalog
│   ├── domain       // Lógica de negocio del catálogo
│   └── web          // Controladores de API del catálogo
├── orders
│   ├── domain       // Lógica de negocio de pedidos
│   ├── web          // Controladores de API de pedidos
│   └── events       // Eventos relacionados con pedidos
├── inventory
│   ├── domain       // Lógica de negocio del inventario
│   └── listeners    // Listeners de eventos de pedidos
├── common
│   ├── models       // Modelos compartidos
│   └── utils        // Utilidades compartidas
└── Application.java
```

Con Spring Modulith, las clases en subpaquetes internos (ej. `catalog.domain`) no son accesibles desde otros módulos. Solo las clases en el paquete raíz del módulo (`catalog`) forman su API pública.

## Módulo Common

<!-- Figura 1: Vista diagrama de módulos -->
![Figura #1: Vista diagrama de módulos](/img/blog/spring-modulith/spring_modulith_1.png)


`PagedResult` (`common/models/PagedResult.java`) es una clase genérica compartida para respuestas paginadas:

```java
package com.example.ordersystem.common.models;

@NamedInterface("common.models")
public class PagedResult<T> {
    private List<T> data;
    private int page;
    private int total;

    // Constructor, getters, and setters
}
```

`CustomException` define la base para excepciones del dominio:

```java
package com.example.ordersystem.common.models;

public abstract class CustomException extends RuntimeException {
    public CustomException(String message) {
        super(message);
    }
}
```

## Módulo Catalog

La entidad `Product` en `catalog/domain/Product.java`:

```java
package com.example.ordersystem.catalog.domain;

@Entity
public class Product {
    @Id
    private String code;
    private String name;
    private double price;

    // Constructor, getters, and setters
}
```

`ProductService` en `catalog/domain/ProductService.java` busca un producto por código y lanza una excepción si no existe:

```java
package com.example.ordersystem.catalog.domain;

@Service
public class ProductService {
    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product findProductByCode(String code) {
        return productRepository.findById(code)
                .orElseThrow(() -> new ProductNotFoundException("Product not found"));
    }
}
```

`ProductController` en `catalog/web/ProductController.java` expone el catálogo como endpoint REST:

```java
package com.example.ordersystem.catalog.web;

@RestController
@RequestMapping("/api/catalog")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/{code}")
    public ResponseEntity<Product> getProduct(@PathVariable String code) {
        return ResponseEntity.ok(productService.findProductByCode(code));
    }
}
```

## Módulo Orders

La entidad `Order` en `orders/domain/Order.java`:

```java
package com.example.ordersystem.orders.domain;

@Entity
public class Order {
    @Id
    @GeneratedValue
    private Long id;
    private String productCode;
    private int quantity;

    // Constructor, getters, and setters
}
```

`OrderService` en `orders/domain/OrderService.java` crea el pedido y publica un evento para que otros módulos reaccionen sin acoplarse directamente:

```java
package com.example.ordersystem.orders.domain;

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final ApplicationEventPublisher publisher;

    public OrderService(OrderRepository orderRepository, ProductService productService, ApplicationEventPublisher publisher) {
        this.orderRepository = orderRepository;
        this.productService = productService;
        this.publisher = publisher;
    }

    public Order createOrder(String productCode, int quantity) {
        Product product = productService.findProductByCode(productCode);
        Order order = new Order(null, product.getCode(), quantity);
        orderRepository.save(order);
        publisher.publishEvent(new OrderCreatedEvent(order.getId(), productCode, quantity));
        return order;
    }
}
```

`OrderCreatedEvent` en `orders/events/OrderCreatedEvent.java` es un record inmutable que transporta los datos del pedido creado:

```java
package com.example.ordersystem.orders.events;

public record OrderCreatedEvent(Long orderId, String productCode, int quantity) {}
```

## Módulo Inventory

`InventoryListener` en `inventory/listeners/InventoryListener.java` escucha el evento y actualiza el stock. No importa ninguna clase del módulo `orders` directamente; solo reacciona al evento:

```java
package com.example.ordersystem.inventory.listeners;

@Component
public class InventoryListener {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        System.out.println("Inventory updated for product: " + event.getProductCode());
    }
}
```

## Flujo del sistema

El flujo desde la solicitud del cliente hasta la actualización del inventario:

1. El cliente consulta un producto a través de `ProductController`
2. `OrderService` valida el producto y persiste el pedido
3. `OrderService` publica `OrderCreatedEvent`
4. `InventoryListener` recibe el evento y actualiza el stock

<!-- Figura 2: Diagrama de secuencia del flujo de pedidos -->
![Figura #2: Vista Diagrama de secuencia del flujo de pedidos](/img/blog/spring-modulith/spring_modulith_2.png)


La comunicación entre `orders` e `inventory` pasa por el evento, no por una dependencia directa. `InventoryListener` no importa ninguna clase del módulo `orders`.

## Pruebas aisladas por módulo

`@ApplicationModuleTest` carga solo el módulo en prueba y sus dependencias configuradas, sin levantar el contexto completo:

```java
@ApplicationModuleTest(mode = ApplicationModuleTest.BootstrapMode.DIRECT_DEPENDENCIES)
class OrderServiceTest {
    @MockBean private ProductService productService;
    @Autowired private OrderService orderService;

    @Test
    void testCreateOrder() {
        when(productService.findProductByCode("P123"))
          .thenReturn(new Product("P123", "Test Product", 100));

        Order order = orderService.createOrder("P123", 2);

        assertNotNull(order);
        assertEquals("P123", order.getProductCode());
        assertEquals(2, order.getQuantity());
    }
}
```

Spring Modulith ofrece tres modos de carga:

- `STANDALONE`: carga solo el módulo en prueba, sin dependencias externas
- `DIRECT_DEPENDENCIES`: carga el módulo junto con sus dependencias inmediatas
- `ALL_DEPENDENCIES`: carga el módulo con todos los módulos de los que depende

La elección del modo depende de cuánto contexto necesita la prueba. Para `OrderService`, que depende de `ProductService`, `DIRECT_DEPENDENCIES` es suficiente.

## Generación automática de documentación

Spring Modulith genera documentación de la estructura modular en `target/docs`:

```java
@Test
void generateDocumentation() {
    new Documenter(ApplicationModules.of(Application.class))
        .writeDocumentation(new File("target/docs"));
}
```

El output incluye diagramas de arquitectura modular, un listado de eventos publicados y sus suscriptores, y un resumen de dependencias entre módulos.

Para ver las relaciones en tiempo de ejecución, habilita el endpoint de Actuator:

```bash
management.endpoints.web.exposure.include=*
```

## Spring Modulith vs. microservicios

Spring Modulith no reemplaza a los microservicios. Es una opción distinta para aplicaciones que no necesitan escala horizontal inmediata o no justifican el costo de operar servicios distribuidos.

Si en el futuro la aplicación necesita migrar, la estructura modular facilita el proceso: cada módulo ya tiene su lógica encapsulada, su API pública definida y su comunicación basada en eventos. Pasar un módulo a un microservicio independiente requiere menos refactorización que partir un monolito tradicional.

La pregunta no es si usar Spring Modulith o microservicios, sino si tu aplicación realmente necesita distribución hoy.

## Conclusión

Spring Modulith da estructura a una aplicación Spring Boot sin aumentar la complejidad operativa. Los módulos con fronteras claras previenen el desorden que suele aparecer cuando los monolitos crecen. Las pruebas aisladas por módulo son más rápidas y concretas. Y la documentación automática refleja la arquitectura real, no una versión idealizada en un diagrama desactualizado.

Si trabajas en una aplicación Spring Boot que está creciendo, vale la pena considerarlo antes de dar el salto a microservicios.

---

## Repositorio del proyecto

Código fuente completo disponible en GitHub: [spring-modulith-example](https://github.com/geovannymcode/spring-modulith-example)

---

## Referencias

1. [Documentación oficial de Spring Modulith](https://docs.spring.io/spring-modulith/reference/index.html)
2. [Guía de Arquitectura Modular en Spring](https://spring.io/projects/spring-modulith)
