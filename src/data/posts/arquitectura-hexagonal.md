---
#preview
title: 'Arquitectura Hexagonal en Java: del concepto al código'
date: '2026-04-10'
image: "/img/blog/13.png"
categories:
  - Backend
  - Arquitectura
tags:
  - Java
  - Spring Boot
  - Arquitectura Hexagonal
  - Ports and Adapters
  - DDD
author: Geovanny Mendoza
short: La arquitectura hexagonal separa la lógica de negocio de los frameworks, bases de datos e interfaces externas. Este artículo lo explica con un sistema completo de pedidos en Java, incluyendo puertos, adaptadores y pruebas que funcionan sin Spring ni base de datos.
---

# Arquitectura Hexagonal en Java: del concepto al código

## ¿Qué problema resuelve?

En la mayoría de proyectos Spring Boot la lógica de negocio termina mezclada con anotaciones de JPA, dependencias de Jackson, o queries de base de datos. Cuando quieres cambiar Hibernate por jOOQ, o agregar un consumer de Kafka además del endpoint REST existente, te das cuenta de que el dominio está acoplado a la infraestructura.

En arquitectura por capas tradicional el flujo de dependencias va siempre hacia abajo: la presentación depende de la lógica de negocio, y esta depende de la base de datos. Si el esquema de base de datos cambia, el impacto sube hasta la capa superior.

![Arquitectura por capas: Presentación → Lógica de Negocio → Base de Datos](/img/blog/arq-hexa/arq-hexa-2.png)

La arquitectura hexagonal, propuesta por Alistair Cockburn en 2005, invierte esa relación. El dominio no depende de nada externo. Todo lo que interactúa con él, ya sea una API REST, un listener de eventos o una base de datos, se conecta a través de interfaces definidas por el dominio mismo.

El nombre viene de la representación visual: un hexágono central (dominio) rodeado de adaptadores que se conectan por sus lados. También se conoce como "Ports and Adapters".

## Los tres elementos

La arquitectura tiene tres capas bien diferenciadas.

**Dominio** contiene las entidades, objetos de valor y la lógica de negocio. No importa ninguna clase de Spring, JPA ni ningún framework. Es Java puro. Si esta capa no puede compilar sin Spring Boot en el classpath, algo está mal.

**Puertos** son interfaces definidas dentro del dominio que describen cómo el dominio se comunica con el mundo exterior. Los puertos de entrada exponen los casos de uso que el dominio ofrece. Los puertos de salida describen lo que el dominio necesita de la infraestructura, como persistir datos o enviar notificaciones.

**Adaptadores** son implementaciones concretas de esos puertos. Un controlador REST es un adaptador de entrada. Un repositorio JPA es un adaptador de salida. Los adaptadores viven en la capa de infraestructura y pueden cambiarse sin tocar el dominio.

El diagrama siguiente muestra cómo el dominio (hexágono central) puede tener múltiples adaptadores de entrada simultáneos, como un REST Controller, un GUI Controller o un Mobile Adapter, y múltiples adaptadores de salida para distintas bases de datos o canales de notificación, todo conectado a través de los puertos definidos por el dominio:

![Diagrama completo de Arquitectura Hexagonal con adaptadores primarios y secundarios](/img/blog/arq-hexa/arq-hexa-3.png)

## Sistema de pedidos: estructura del proyecto

Para ver esto en código, construimos un sistema de pedidos para una cafetería. La estructura de paquetes refleja la arquitectura:

```mermaid
src/main/java/com/example/cafe/
├── domain/
│   ├── model/
│   │   └── Pedido.java
│   ├── port/
│   │   ├── input/
│   │   │   └── ProcesarPedidoUseCase.java
│   │   └── output/
│   │       ├── PedidoRepository.java
│   │       └── NotificacionService.java
│   └── service/
│       └── PedidoService.java
└── infrastructure/
    ├── adapter/
    │   ├── in/
    │   │   └── PedidoController.java
    │   └── out/
    │       ├── PedidoRepositoryAdapter.java
    │       └── EmailNotificacionAdapter.java
    └── persistence/
        └── PedidoJpaEntity.java
```

La separación no es caprichosa. Cualquier clase en `domain/` puede compilar sin Spring en el classpath. Todo lo que necesita infraestructura vive en `infrastructure/`.

## El dominio

La entidad `Pedido` no tiene anotaciones de JPA ni de ningún framework:

```java
package com.example.cafe.domain.model;

import java.util.UUID;

public class Pedido {

    private final String id;
    private final String producto;
    private final int cantidad;
    private EstadoPedido estado;

    public enum EstadoPedido {
        PENDIENTE, CONFIRMADO, CANCELADO
    }

    public Pedido(String producto, int cantidad) {
        this.id = UUID.randomUUID().toString();
        this.producto = producto;
        this.cantidad = cantidad;
        this.estado = EstadoPedido.PENDIENTE;
    }

    public void confirmar() {
        if (this.estado != EstadoPedido.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden confirmar pedidos pendientes");
        }
        this.estado = EstadoPedido.CONFIRMADO;
    }

    public String getId()       { return id; }
    public String getProducto() { return producto; }
    public int getCantidad()    { return cantidad; }
    public EstadoPedido getEstado() { return estado; }
}
```

Esta clase no sabe si será persistida en PostgreSQL, en memoria, o en Redis. No le importa si la llamada llegó por REST o por un mensaje de Kafka.

## Los puertos

El puerto de entrada describe el caso de uso desde la perspectiva de quien lo invoca:

```java
package com.example.cafe.domain.port.input;

import com.example.cafe.domain.model.Pedido;

public interface ProcesarPedidoUseCase {
    Pedido crearPedido(String producto, int cantidad);
    Pedido confirmarPedido(String pedidoId);
}
```

Los puertos de salida describen lo que el dominio necesita sin especificar cómo se resuelve:

```java
package com.example.cafe.domain.port.output;

import com.example.cafe.domain.model.Pedido;
import java.util.Optional;

public interface PedidoRepository {
    Pedido guardar(Pedido pedido);
    Optional<Pedido> buscarPorId(String id);
}
```

```java
package com.example.cafe.domain.port.output;

import com.example.cafe.domain.model.Pedido;

public interface NotificacionService {
    void notificarConfirmacion(Pedido pedido);
}
```

Estas interfaces las define el dominio, no la infraestructura. Ese es el punto más importante de la arquitectura: la inversión de dependencias fluye desde adentro hacia afuera.

## El servicio de aplicación

`PedidoService` implementa el puerto de entrada y usa los puertos de salida como dependencias inyectadas:

```java
package com.example.cafe.domain.service;

import com.example.cafe.domain.model.Pedido;
import com.example.cafe.domain.port.input.ProcesarPedidoUseCase;
import com.example.cafe.domain.port.output.NotificacionService;
import com.example.cafe.domain.port.output.PedidoRepository;

public class PedidoService implements ProcesarPedidoUseCase {

    private final PedidoRepository pedidoRepository;
    private final NotificacionService notificacionService;

    public PedidoService(PedidoRepository pedidoRepository,
                         NotificacionService notificacionService) {
        this.pedidoRepository = pedidoRepository;
        this.notificacionService = notificacionService;
    }

    @Override
    public Pedido crearPedido(String producto, int cantidad) {
        Pedido pedido = new Pedido(producto, cantidad);
        return pedidoRepository.guardar(pedido);
    }

    @Override
    public Pedido confirmarPedido(String pedidoId) {
        Pedido pedido = pedidoRepository.buscarPorId(pedidoId)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado: " + pedidoId));
        pedido.confirmar();
        Pedido guardado = pedidoRepository.guardar(pedido);
        notificacionService.notificarConfirmacion(guardado);
        return guardado;
    }
}
```

No hay `@Service`, no hay `@Autowired`. El servicio puede vivir fuera de Spring sin problema. Eso tiene consecuencias directas en las pruebas.

## Flujo completo de una petición

Antes de ver el código de los adaptadores, conviene tener clara la secuencia completa que recorre una petición de punta a punta:

![Flujo: Web App → REST Adapter → Puerto → Use Case + Domain Entities → Puerto → DataBase Adapter → Base de Datos](/img/blog/arq-hexa/arq-hexa-4.png)

1. La Web App hace `POST /pedido`
2. El REST Adapter recibe la llamada HTTP y la traduce a una invocación del caso de uso a través del puerto de entrada
3. El Use Case ejecuta la lógica de negocio sobre las entidades de dominio
4. A través del puerto de salida, delega la persistencia al Database Adapter
5. El Database Adapter ejecuta el `INSERT` en la base de datos

Cada flecha cruza una frontera definida por una interfaz. Eso es exactamente lo que garantiza que ninguna capa conozca los detalles internos de la siguiente.

## El adaptador de entrada (REST)

El controlador es un adaptador primario. Su trabajo es traducir HTTP al lenguaje del dominio:

```java
package com.example.cafe.infrastructure.adapter.in;

import com.example.cafe.domain.model.Pedido;
import com.example.cafe.domain.port.input.ProcesarPedidoUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final ProcesarPedidoUseCase procesarPedido;

    public PedidoController(ProcesarPedidoUseCase procesarPedido) {
        this.procesarPedido = procesarPedido;
    }

    @PostMapping
    public ResponseEntity<Pedido> crear(@RequestBody CrearPedidoRequest request) {
        Pedido pedido = procesarPedido.crearPedido(request.producto(), request.cantidad());
        return ResponseEntity.ok(pedido);
    }

    @PutMapping("/{id}/confirmar")
    public ResponseEntity<Pedido> confirmar(@PathVariable String id) {
        Pedido pedido = procesarPedido.confirmarPedido(id);
        return ResponseEntity.ok(pedido);
    }

    public record CrearPedidoRequest(String producto, int cantidad) {}
}
```

El controlador solo sabe del puerto de entrada. No importa nada de `PedidoService` directamente.

## El adaptador de salida (JPA)

El adaptador secundario implementa el puerto de salida del dominio usando JPA:

```java
package com.example.cafe.infrastructure.adapter.out;

import com.example.cafe.domain.model.Pedido;
import com.example.cafe.domain.port.output.PedidoRepository;
import com.example.cafe.infrastructure.persistence.PedidoJpaEntity;
import com.example.cafe.infrastructure.persistence.PedidoJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PedidoRepositoryAdapter implements PedidoRepository {

    private final PedidoJpaRepository jpaRepository;

    public PedidoRepositoryAdapter(PedidoJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Pedido guardar(Pedido pedido) {
        PedidoJpaEntity entity = toEntity(pedido);
        PedidoJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Pedido> buscarPorId(String id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    private PedidoJpaEntity toEntity(Pedido pedido) {
        return new PedidoJpaEntity(
                pedido.getId(),
                pedido.getProducto(),
                pedido.getCantidad(),
                pedido.getEstado().name()
        );
    }

    private Pedido toDomain(PedidoJpaEntity entity) {
        Pedido pedido = new Pedido(entity.getProducto(), entity.getCantidad());
        // Nota: reconstrucción simplificada para el ejemplo
        return pedido;
    }
}
```

El adaptador sabe de JPA pero el dominio no. Si mañana cambias a jOOQ o a un store en Redis, cambias este archivo y nada más.

## Pruebas sin Spring y sin base de datos

Aquí está la recompensa real de este diseño. `PedidoService` no tiene anotaciones de Spring, así que puedes probarlo con mocks sin levantar ningún contexto:

```java
package com.example.cafe.domain.service;

import com.example.cafe.domain.model.Pedido;
import com.example.cafe.domain.port.output.NotificacionService;
import com.example.cafe.domain.port.output.PedidoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private PedidoService pedidoService;

    @Test
    void crearPedido_guardaYRetornaPedido() {
        Pedido pedidoEsperado = new Pedido("Espresso", 2);
        when(pedidoRepository.guardar(any(Pedido.class))).thenReturn(pedidoEsperado);

        Pedido resultado = pedidoService.crearPedido("Espresso", 2);

        assertNotNull(resultado);
        assertEquals("Espresso", resultado.getProducto());
        assertEquals(2, resultado.getCantidad());
        verify(pedidoRepository, times(1)).guardar(any(Pedido.class));
    }

    @Test
    void confirmarPedido_notificaAlConfirmar() {
        Pedido pedido = new Pedido("Latte", 1);
        when(pedidoRepository.buscarPorId(pedido.getId()))
                .thenReturn(Optional.of(pedido));
        when(pedidoRepository.guardar(any())).thenReturn(pedido);

        pedidoService.confirmarPedido(pedido.getId());

        verify(notificacionService).notificarConfirmacion(any(Pedido.class));
    }

    @Test
    void confirmarPedido_lanzaExcepcionSiNoExiste() {
        when(pedidoRepository.buscarPorId("inexistente"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> pedidoService.confirmarPedido("inexistente"));
    }
}
```

Sin `@SpringBootTest`, sin H2, sin base de datos en memoria. La prueba arranca en milisegundos y prueba exactamente la lógica de negocio.

## Configuración en Spring Boot

El único lugar donde todo se conecta es la configuración de Spring:

```java
package com.example.cafe.infrastructure;

import com.example.cafe.domain.port.input.ProcesarPedidoUseCase;
import com.example.cafe.domain.port.output.NotificacionService;
import com.example.cafe.domain.port.output.PedidoRepository;
import com.example.cafe.domain.service.PedidoService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApplicationConfig {

    @Bean
    public ProcesarPedidoUseCase procesarPedidoUseCase(
            PedidoRepository pedidoRepository,
            NotificacionService notificacionService) {
        return new PedidoService(pedidoRepository, notificacionService);
    }
}
```

Spring inyecta los adaptadores que implementan `PedidoRepository` y `NotificacionService`, y el resultado es un `ProcesarPedidoUseCase` listo para usar en el controlador.

## Errores frecuentes al implementar esta arquitectura

**Poner `@Entity` en el dominio.** Si tu entidad de dominio tiene `@Entity` de JPA, ya no es independiente de la infraestructura. La solución es tener una entidad de dominio y una entidad JPA separadas, con un mapper entre ambas como muestra el `PedidoRepositoryAdapter` de arriba.

**Retornar entidades de dominio desde el REST.** El controlador convierte la entidad de dominio en un DTO o record de respuesta antes de serializar. Si Jackson tiene que serializar `Pedido` directamente, estás exponiendo la estructura interna del dominio al cliente.

**Crear puertos para todo.** Un puerto tiene sentido cuando hay más de una implementación posible o cuando el dominio genuinamente no debería conocer el detalle. Para utilidades simples que no varían, un puerto es burocracia innecesaria.

**Confundir hexagonal con capas (layered).** La arquitectura hexagonal no es simplemente controller → service → repository con interfaces. La diferencia está en quién define las interfaces: en hexagonal, el dominio define los puertos de salida. En arquitectura por capas, la capa de acceso a datos define sus propias interfaces.

## Cuándo no usarla

La arquitectura hexagonal agrega complejidad estructural. Para un CRUD simple con tres tablas y sin lógica de negocio relevante, es excesiva. Los mapeadores entre entidades de dominio y entidades JPA son código adicional que hay que mantener.

Tiene sentido cuando el dominio tiene reglas de negocio complejas que necesitan pruebas rápidas y aisladas, cuando el sistema puede necesitar múltiples adaptadores para el mismo puerto (por ejemplo, recibir pedidos por REST y por mensajería), o cuando el equipo quiere proteger el núcleo del sistema de cambios en la infraestructura.

Para prototipos, aplicaciones internas sencillas o equipos que recién aprenden Spring Boot, una arquitectura en capas más directa es perfectamente válida.

## Comparación con otras arquitecturas

| Característica | Capas | Hexagonal | Clean Architecture |
|---|---|---|---|
| Dependencias | Capa superior → inferior | Hacia el dominio | Hacia entidades/casos de uso |
| Testabilidad del dominio | Media | Alta | Alta |
| Complejidad de setup | Baja | Media | Alta |
| Flexibilidad de adaptadores | Baja | Alta | Alta |
| Curva de aprendizaje | Baja | Media | Alta |

Clean Architecture de Robert Martin extiende los mismos principios con capas adicionales (entidades, casos de uso, interfaces, frameworks). Para la mayoría de aplicaciones backend, hexagonal cubre el mismo objetivo con menos estructura.

## Conclusión

La ventaja concreta de la arquitectura hexagonal no está en los diagramas. Está en que puedes ejecutar cientos de pruebas de dominio sin levantar Spring, sin conectarte a una base de datos y sin configurar nada. Cuando el negocio cambia, sabes exactamente qué tocar. Cuando necesitas agregar un canal nuevo, creas un adaptador nuevo sin modificar el dominio.

El sistema de pedidos de este artículo tiene todas sus partes en su repositorio de ejemplo. La estructura de paquetes, los mapeadores y la configuración están listos para usarse como punto de partida.

---

## Repositorio del proyecto

Código fuente completo disponible en GitHub: [hexagonal-architecture-example](https://github.com/geovannymcode/hexagonal-architecture-example)

---

## Referencias

1. [Alistair Cockburn - Hexagonal Architecture (original)](https://alistair.cockburn.us/hexagonal-architecture/)
2. [Spring Boot Documentation](https://spring.io/projects/spring-boot)
3. [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)