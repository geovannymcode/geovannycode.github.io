---
title: 'Serie: Programación Funcional en Java – Parte 5: Vavr - Try, Either y Option'
date: '2026-04-15'
image: "/img/blog/15.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Programación Funcional
    - Vavr
    - Monads
    - Error Handling
author: Geovanny Mendoza
short: Descubre Vavr, la librería que llena los huecos funcionales de Java. Aprende a usar Try, Either y Option para manejar errores sin try-catch y valores ausentes sin NullPointerException.
---

## Introducción

Hasta ahora en esta serie hemos explorado las capacidades funcionales nativas de Java: expresiones lambda, Stream API, Optional, referencias a métodos y procesamiento paralelo. Estas herramientas, introducidas desde Java 8, cambiaron bastante cómo escribimos código Java.

Dicho esto, Java sigue siendo fundamentalmente un lenguaje orientado a objetos con características funcionales añadidas. Comparado con lenguajes como Haskell, Scala o F#, le faltan construcciones que en esos entornos son básicas: tipos inmutables por defecto, pattern matching robusto, monadas para manejo de efectos, y colecciones persistentes.

Ahí entra **Vavr** (antes Javaslang), una librería open source que llena esos huecos: tipos inmutables, manejo funcional de errores, colecciones persistentes y pattern matching, todo integrado en el ecosistema Java sin necesidad de cambiar de lenguaje.

## 1. ¿Qué es Vavr y Por Qué Usarlo?

### El Problema con Java Estándar

Aunque Java 8+ nos dio herramientas funcionales, tiene limitaciones importantes:

**Optional tiene restricciones de diseño:**
```java
// Optional de Java puede contener null (sorprendentemente)
Optional<String> opt = Optional.of("valor").map(s -> null);
// opt contiene null, no es empty - comportamiento confuso

// No tiene pattern matching
Optional<Integer> valor = Optional.of(42);
// ¿Cómo distinguir entre Some(42) y None de forma elegante?
```

**El manejo de excepciones rompe el flujo funcional:**
```java
// Esto NO compila - las lambdas no pueden lanzar checked exceptions directamente
list.stream()
    .map(item -> parseJson(item))  // ❌ parseJson lanza IOException
    .toList();

// Solución fea: try-catch dentro de la lambda
list.stream()
    .map(item -> {
        try {
            return parseJson(item);
        } catch (IOException e) {
            throw new RuntimeException(e);  // ❌ Pierde información del error
        }
    })
    .toList();
```

**Las colecciones son mutables por defecto:**
```java
List<String> lista = new ArrayList<>();
lista.add("elemento");  // Mutación - no es thread-safe por naturaleza
```

### Qué ofrece Vavr

Vavr resuelve estos problemas con:

1. **Option** - Un Optional mejorado con semántica funcional pura
2. **Try** - Manejo funcional de excepciones sin try-catch
3. **Either** - Representación de operaciones que pueden tener dos resultados posibles
4. **Validation** - Acumulación de errores de validación
5. **Colecciones inmutables** - List, Set, Map persistentes y eficientes
6. **Pattern Matching** - Matching de patrones estilo Scala
7. **Tuplas** - Tipos para agrupar valores sin crear clases
8. **Future** - Computaciones asíncronas mejoradas

### Configuración del Proyecto

Para usar Vavr en tu proyecto, añade la dependencia:

**Maven:**
```xml
<dependency>
    <groupId>io.vavr</groupId>
    <artifactId>vavr</artifactId>
    <version>1.0.1</version>
</dependency>
```

**Gradle:**
```groovy
implementation 'io.vavr:vavr:1.0.1'
```

## 2. Option: Optional Reimaginado

### El Problema con Optional de Java

El `Optional` de Java tiene un problema de diseño: cuando usas `map()` con una función que retorna `null`, el resultado es un `Optional` que **contiene** `null`, no un `Optional.empty()`. Esto puede llevar a `NullPointerException` inesperados.

```java
// Java Optional - comportamiento problemático
Optional<String> opt = Optional.of("texto")
    .map(s -> null);  // Retorna Optional con null adentro

opt.get();  // ¡NullPointerException!
```

### Option de Vavr: Semántica Correcta

`Option` de Vavr corrige este comportamiento. Cuando una función retorna `null`, el resultado es automáticamente `None`:

```java
import io.vavr.control.Option;
import static io.vavr.API.*;

// Vavr Option - comportamiento correcto
Option<String> opt = Option.of("texto")
    .map(s -> null);  // Retorna None automáticamente

System.out.println(opt);  // None
System.out.println(opt.isEmpty());  // true
```

### Creación de Options

```java
// Some: valor presente
Option<String> some = Option.some("valor");
Option<String> some2 = Option.of("valor");  // equivalente

// None: ausencia de valor
Option<String> none = Option.none();
Option<String> none2 = Option.of(null);  // null se convierte en None

// Desde Optional de Java
Optional<String> javaOpt = Optional.of("valor");
Option<String> vavrOpt = Option.ofOptional(javaOpt);

// Creación condicional
Option<String> conditional = Option.when(edad >= 18, "adulto");
// Si la condición es true: Some("adulto")
// Si la condición es false: None
```

### Operaciones Funcionales con Option

```java
Option<String> nombre = Option.of("Geovanny");

// map: transforma el valor si existe
Option<Integer> longitud = nombre.map(String::length);  // Some(8)

// flatMap: para funciones que retornan Option
Option<String> mayusculas = nombre.flatMap(n ->
    n.length() > 5 ? Option.some(n.toUpperCase()) : Option.none()
);  // Some("GEOVANNY")

// filter: mantiene el valor solo si cumple la condición
Option<String> filtrado = nombre.filter(n -> n.startsWith("G"));  // Some("Geovanny")
Option<String> filtrado2 = nombre.filter(n -> n.startsWith("X"));  // None

// getOrElse: obtener valor con default
String valor = nombre.getOrElse("Anónimo");  // "Geovanny"
String valor2 = Option.<String>none().getOrElse("Anónimo");  // "Anónimo"

// fold: transformar ambos casos (None y Some)
String resultado = nombre.fold(
    () -> "No hay nombre",           // Si es None
    n -> "El nombre es: " + n        // Si es Some
);  // "El nombre es: Geovanny"
```

### Pattern Matching con Option

Una de las características más poderosas de Vavr es el pattern matching:

```java
import static io.vavr.API.*;
import static io.vavr.Patterns.*;

Option<Integer> edad = Option.of(25);

String mensaje = Match(edad).of(
    Case($Some($()), value -> "Edad encontrada: " + value),
    Case($None(), "Edad no disponible")
);
// "Edad encontrada: 25"

// Pattern matching con condiciones
Option<Integer> numero = Option.of(42);

String resultado = Match(numero).of(
    Case($Some($(n -> n > 100)), "Mayor que 100"),
    Case($Some($(n -> n > 50)), "Mayor que 50"),
    Case($Some($()), n -> "Valor: " + n),
    Case($None(), "Sin valor")
);
// "Valor: 42"
```

### Peek: Efectos Laterales Controlados

El método `peek` permite ejecutar efectos secundarios sin modificar el Option:

```java
Option<String> usuario = Option.of("admin");

usuario
    .peek(u -> System.out.println("Usuario encontrado: " + u))
    .peek(u -> auditLog.registrar("Acceso de: " + u))
    .map(String::toUpperCase);
// Imprime: "Usuario encontrado: admin"
// Registra en audit log
// Retorna: Some("ADMIN")
```

## 3. Try: Excepciones Sin Try-Catch

### El Problema de las Excepciones en Código Funcional

Las excepciones en Java rompen el flujo funcional y obligan a escribir código imperativo:

```java
// Código imperativo con excepciones
public String leerArchivo(String ruta) {
    try {
        return Files.readString(Path.of(ruta));
    } catch (IOException e) {
        logger.error("Error leyendo archivo", e);
        return ""; // ¿Qué retornamos en caso de error?
    }
}
```

Este enfoque tiene problemas:
- El manejo de error está mezclado con la lógica de negocio
- El valor de retorno en caso de error es arbitrario
- Difícil de componer con otras operaciones

### Try: Encapsulando Éxito y Fracaso

`Try<T>` es un contenedor que puede tener dos estados:
- **Success(valor)**: La operación fue exitosa
- **Failure(exception)**: La operación lanzó una excepción

```java
import io.vavr.control.Try;

// Crear Try desde una operación que puede fallar
Try<Integer> resultado = Try.of(() -> 10 / 2);
System.out.println(resultado);  // Success(5)

Try<Integer> fallo = Try.of(() -> 10 / 0);
System.out.println(fallo);  // Failure(java.lang.ArithmeticException: / by zero)

// El código dentro de Try.of() puede lanzar cualquier excepción
Try<String> contenido = Try.of(() -> Files.readString(Path.of("/archivo.txt")));
// Success(contenido) o Failure(IOException)
```

### Transformaciones Funcionales con Try

```java
Try<String> contenido = Try.of(() -> leerArchivo("/datos.json"));

// map: transformar el valor si es Success
Try<Integer> longitud = contenido.map(String::length);

// flatMap: para operaciones que también retornan Try
Try<JsonObject> json = contenido.flatMap(c -> Try.of(() -> parseJson(c)));

// filter: convertir Success a Failure si no cumple condición
Try<String> valido = contenido.filter(c -> c.length() > 100);
// Si c.length() <= 100, se convierte en Failure(NoSuchElementException)

// Encadenamiento elegante
Try<Usuario> usuario = Try.of(() -> leerArchivo("/usuario.json"))
    .map(String::trim)
    .flatMap(json -> Try.of(() -> parseJson(json)))
    .map(jsonObj -> new Usuario(jsonObj));
```

### Recuperación de Errores

Try proporciona múltiples formas de recuperarse de errores:

```java
Try<Integer> operacion = Try.of(() -> Integer.parseInt("no-es-numero"));

// recover: proporcionar valor alternativo en caso de fallo
Try<Integer> recuperado = operacion.recover(NumberFormatException.class, ex -> -1);
// Success(-1)

// recoverWith: proporcionar Try alternativo
Try<Integer> recuperado2 = operacion.recoverWith(
    NumberFormatException.class,
    ex -> Try.of(() -> 0)
);
// Success(0)

// getOrElse: obtener valor o default
Integer valor = operacion.getOrElse(-1);  // -1

// getOrElseGet: obtener valor o calcular default (lazy)
Integer valor2 = operacion.getOrElseGet(ex -> calcularValorDefault());

// getOrElseThrow: obtener valor o lanzar excepción personalizada
Integer valor3 = operacion.getOrElseThrow(
    ex -> new MiExcepcion("Error de parsing", ex)
);
```

### Pattern Matching con Try

```java
import static io.vavr.API.*;
import static io.vavr.Patterns.*;

Try<Integer> resultado = Try.of(() -> dividir(10, 2));

String mensaje = Match(resultado).of(
    Case($Success($()), valor -> "Resultado: " + valor),
    Case($Failure($()), error -> "Error: " + error.getMessage())
);
```

### AndThen y AndThenTry: Encadenamiento de Operaciones

```java
// andThen: ejecutar acción adicional si Success (para efectos laterales)
Try<Integer> resultado = Try.of(() -> calcular())
    .andThen(valor -> System.out.println("Calculado: " + valor))
    .andThen(valor -> guardarEnLog(valor));

// andThenTry: encadenar con operación que puede fallar
Try<Integer> resultado2 = Try.of(() -> obtenerDatos())
    .andThenTry(datos -> validar(datos))
    .andThenTry(datos -> persistir(datos));
```

### Ejemplo Práctico: Procesamiento de Archivo JSON

```java
public class ProcesadorJson {

    public Try<Usuario> cargarUsuario(String rutaArchivo) {
        return Try.of(() -> Files.readString(Path.of(rutaArchivo)))
            .map(String::trim)
            .filter(contenido -> !contenido.isEmpty())
            .flatMap(this::parsearJson)
            .map(this::convertirAUsuario)
            .onFailure(ex -> logger.error("Error cargando usuario", ex))
            .onSuccess(usuario -> logger.info("Usuario cargado: {}", usuario.nombre()));
    }

    private Try<JsonObject> parsearJson(String json) {
        return Try.of(() -> JsonParser.parseString(json).getAsJsonObject());
    }

    private Usuario convertirAUsuario(JsonObject json) {
        return new Usuario(
            json.get("nombre").getAsString(),
            json.get("email").getAsString(),
            json.get("edad").getAsInt()
        );
    }
}

// Uso
ProcesadorJson procesador = new ProcesadorJson();

Try<Usuario> resultado = procesador.cargarUsuario("/usuarios/admin.json");

resultado.fold(
    error -> {
        notificarError("No se pudo cargar usuario: " + error.getMessage());
        return null;
    },
    usuario -> {
        mostrarBienvenida(usuario);
        return usuario;
    }
);
```

## 4. Either: Dos Caminos, Un Resultado

### Más Allá del Éxito y Fracaso

Mientras que `Try` está diseñado específicamente para manejar excepciones, `Either<L, R>` es más general: representa un valor que puede ser de uno de dos tipos posibles.

Por convención:
- **Left(L)**: Típicamente representa el caso de error o alternativo
- **Right(R)**: Típicamente representa el caso exitoso ("right" = "correcto")

```java
import io.vavr.control.Either;
import static io.vavr.API.*;

Either<String, Integer> exito = Either.right(42);
Either<String, Integer> error = Either.left("Valor inválido");

System.out.println(exito.isRight());  // true
System.out.println(error.isLeft());   // true
```

### ¿Por Qué Usar Either en Lugar de Try?

Either ofrece ventajas sobre Try:

1. **Errores tipados**: El tipo del error está en la firma (`Either<MiError, Resultado>`)
2. **Errores ricos**: Puedes usar cualquier tipo para representar errores, no solo excepciones
3. **Sin overhead de excepciones**: No hay stack trace que construir

```java
// Con Try: el error siempre es Throwable
Try<Usuario> resultado1 = Try.of(() -> buscarUsuario(id));

// Con Either: el error puede ser cualquier tipo
Either<ErrorNegocio, Usuario> resultado2 = buscarUsuarioEither(id);

// ErrorNegocio puede tener información estructurada
record ErrorNegocio(String codigo, String mensaje, Map<String, Object> detalles) {}
```

### Operaciones con Either

```java
Either<String, Integer> numero = Either.right(42);

// map: opera sobre Right
Either<String, Integer> doble = numero.map(n -> n * 2);  // Right(84)

// mapLeft: opera sobre Left
Either<String, Integer> errorFormateado = Either.<String, Integer>left("error")
    .mapLeft(String::toUpperCase);  // Left("ERROR")

// bimap: opera sobre ambos lados
Either<String, Integer> transformado = numero.bimap(
    error -> "Error: " + error,    // Si es Left
    valor -> valor * 10            // Si es Right
);  // Right(420)

// flatMap: para operaciones que retornan Either
Either<String, Integer> resultado = numero.flatMap(n ->
    n > 0 ? Either.right(n * 2) : Either.left("Debe ser positivo")
);

// fold: transformar ambos casos al mismo tipo
String mensaje = numero.fold(
    error -> "Fallo: " + error,
    valor -> "Éxito: " + valor
);  // "Éxito: 42"
```

### Swap: Intercambiar Lados

```java
Either<String, Integer> original = Either.right(42);
Either<Integer, String> intercambiado = original.swap();
// Left(42)
```

### Conversiones con Either

```java
// Either a Option
Either<String, Integer> either = Either.right(42);
Option<Integer> option = either.toOption();  // Some(42)

Either<String, Integer> eitherLeft = Either.left("error");
Option<Integer> optionNone = eitherLeft.toOption();  // None

// Either a Try
Try<Integer> tryFromEither = either.toTry();  // Success(42)

// Option a Either
Option<String> opt = Option.of("valor");
Either<String, String> eitherFromOption = opt.toEither(() -> "valor por defecto");
// Right("valor")
```

### Ejemplo Práctico: Validación de Datos

```java
public class ValidadorUsuario {

    public Either<ErrorValidacion, Usuario> validarYCrear(UsuarioDTO dto) {
        return validarNombre(dto.nombre())
            .flatMap(nombre -> validarEmail(dto.email())
                .flatMap(email -> validarEdad(dto.edad())
                    .map(edad -> new Usuario(nombre, email, edad))));
    }

    private Either<ErrorValidacion, String> validarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return Either.left(new ErrorValidacion("NOMBRE_VACIO", "El nombre es requerido"));
        }
        if (nombre.length() < 2) {
            return Either.left(new ErrorValidacion("NOMBRE_CORTO", "El nombre debe tener al menos 2 caracteres"));
        }
        return Either.right(nombre.trim());
    }

    private Either<ErrorValidacion, String> validarEmail(String email) {
        if (email == null || !email.contains("@")) {
            return Either.left(new ErrorValidacion("EMAIL_INVALIDO", "El email no es válido"));
        }
        return Either.right(email.toLowerCase().trim());
    }

    private Either<ErrorValidacion, Integer> validarEdad(Integer edad) {
        if (edad == null || edad < 18) {
            return Either.left(new ErrorValidacion("EDAD_INVALIDA", "Debe ser mayor de 18 años"));
        }
        return Either.right(edad);
    }
}

record ErrorValidacion(String codigo, String mensaje) {}
record Usuario(String nombre, String email, int edad) {}
record UsuarioDTO(String nombre, String email, Integer edad) {}

// Uso
ValidadorUsuario validador = new ValidadorUsuario();
UsuarioDTO dto = new UsuarioDTO("Juan", "juan@email.com", 25);

Either<ErrorValidacion, Usuario> resultado = validador.validarYCrear(dto);

resultado.peek(usuario -> System.out.println("Usuario creado: " + usuario))
         .peekLeft(error -> System.out.println("Error: " + error.codigo() + " - " + error.mensaje()));
```

## 5. Caso Práctico: Sistema de Procesamiento de Pedidos

Veamos un ejemplo completo que integra Option, Try y Either en un escenario real de e-commerce.

### Modelo de Dominio

```java
// Entidades del dominio
public record Cliente(Long id, String nombre, String email, Option<String> telefono) {}

public record Producto(String sku, String nombre, double precio, int stockDisponible) {}

public record ItemPedido(Producto producto, int cantidad) {
    public double subtotal() {
        return producto.precio() * cantidad;
    }
}

public record Pedido(
    Long id,
    Cliente cliente,
    List<ItemPedido> items,
    EstadoPedido estado
) {
    public double total() {
        return items.map(ItemPedido::subtotal).sum().doubleValue();
    }
}

public enum EstadoPedido { PENDIENTE, CONFIRMADO, ENVIADO, ENTREGADO, CANCELADO }

// Errores del dominio
public sealed interface ErrorPedido {
    record ClienteNoEncontrado(Long clienteId) implements ErrorPedido {}
    record ProductoNoEncontrado(String sku) implements ErrorPedido {}
    record StockInsuficiente(String sku, int solicitado, int disponible) implements ErrorPedido {}
    record PedidoInvalido(String mensaje) implements ErrorPedido {}
    record ErrorPersistencia(String mensaje, Throwable causa) implements ErrorPedido {}
}
```

### Repositorios con Option

```java
public interface ClienteRepository {
    Option<Cliente> buscarPorId(Long id);
    Option<Cliente> buscarPorEmail(String email);
}

public interface ProductoRepository {
    Option<Producto> buscarPorSku(String sku);
    List<Producto> buscarPorCategoria(String categoria);
}

// Implementación en memoria
public class ClienteRepositoryImpl implements ClienteRepository {
    private final Map<Long, Cliente> clientes = HashMap.of(
        1L, new Cliente(1L, "Juan Pérez", "juan@email.com", Option.some("555-1234")),
        2L, new Cliente(2L, "María García", "maria@email.com", Option.none()),
        3L, new Cliente(3L, "Carlos López", "carlos@email.com", Option.some("555-5678"))
    );

    @Override
    public Option<Cliente> buscarPorId(Long id) {
        return clientes.get(id);
    }

    @Override
    public Option<Cliente> buscarPorEmail(String email) {
        return clientes.values()
            .find(c -> c.email().equalsIgnoreCase(email));
    }
}
```

### Servicio de Pedidos con Either

```java
import io.vavr.collection.List;
import io.vavr.control.Either;
import io.vavr.control.Option;
import io.vavr.control.Try;

public class ServicioPedidos {

    private final ClienteRepository clienteRepo;
    private final ProductoRepository productoRepo;
    private final PedidoRepository pedidoRepo;

    public ServicioPedidos(ClienteRepository clienteRepo,
                          ProductoRepository productoRepo,
                          PedidoRepository pedidoRepo) {
        this.clienteRepo = clienteRepo;
        this.productoRepo = productoRepo;
        this.pedidoRepo = pedidoRepo;
    }

    /**
     * Crea un pedido validando cliente, productos y stock.
     * Retorna Either con el error específico o el pedido creado.
     */
    public Either<ErrorPedido, Pedido> crearPedido(Long clienteId,
                                                    List<Tuple2<String, Integer>> itemsSolicitados) {
        // Validar cliente
        return buscarCliente(clienteId)
            // Validar y construir items
            .flatMap(cliente -> construirItems(itemsSolicitados)
                // Crear y persistir pedido
                .flatMap(items -> persistirPedido(cliente, items)));
    }

    private Either<ErrorPedido, Cliente> buscarCliente(Long clienteId) {
        return clienteRepo.buscarPorId(clienteId)
            .toEither(() -> new ErrorPedido.ClienteNoEncontrado(clienteId));
    }

    private Either<ErrorPedido, List<ItemPedido>> construirItems(
            List<Tuple2<String, Integer>> itemsSolicitados) {

        // Validar cada item y acumular resultados
        return itemsSolicitados
            .map(item -> validarYCrearItem(item._1, item._2))
            .transform(this::secuenciarEithers);
    }

    private Either<ErrorPedido, ItemPedido> validarYCrearItem(String sku, int cantidad) {
        return productoRepo.buscarPorSku(sku)
            .toEither(() -> (ErrorPedido) new ErrorPedido.ProductoNoEncontrado(sku))
            .flatMap(producto -> validarStock(producto, cantidad));
    }

    private Either<ErrorPedido, ItemPedido> validarStock(Producto producto, int cantidad) {
        if (producto.stockDisponible() < cantidad) {
            return Either.left(new ErrorPedido.StockInsuficiente(
                producto.sku(), cantidad, producto.stockDisponible()));
        }
        return Either.right(new ItemPedido(producto, cantidad));
    }

    private Either<ErrorPedido, List<ItemPedido>> secuenciarEithers(
            List<Either<ErrorPedido, ItemPedido>> eithers) {

        // Si alguno es Left, retornar el primer error
        // Si todos son Right, retornar lista de valores
        return eithers.find(Either::isLeft)
            .map(e -> Either.<ErrorPedido, List<ItemPedido>>left(e.getLeft()))
            .getOrElse(() -> Either.right(eithers.map(Either::get)));
    }

    private Either<ErrorPedido, Pedido> persistirPedido(Cliente cliente, List<ItemPedido> items) {
        if (items.isEmpty()) {
            return Either.left(new ErrorPedido.PedidoInvalido("El pedido debe tener al menos un item"));
        }

        Pedido pedido = new Pedido(
            generarId(),
            cliente,
            items,
            EstadoPedido.PENDIENTE
        );

        return Try.of(() -> pedidoRepo.guardar(pedido))
            .toEither()
            .mapLeft(ex -> new ErrorPedido.ErrorPersistencia("Error guardando pedido", ex));
    }

    private Long generarId() {
        return System.currentTimeMillis();
    }

    /**
     * Notifica al cliente sobre su pedido usando Option para manejar
     * el teléfono opcional.
     */
    public void notificarCliente(Pedido pedido) {
        Cliente cliente = pedido.cliente();

        // Email siempre se envía
        enviarEmail(cliente.email(), construirMensajePedido(pedido));

        // SMS solo si tiene teléfono registrado
        cliente.telefono()
            .peek(tel -> enviarSms(tel, "Pedido #" + pedido.id() + " confirmado!"))
            .onEmpty(() -> System.out.println("Cliente sin teléfono, solo notificación por email"));
    }

    private void enviarEmail(String email, String mensaje) {
        System.out.println("📧 Email enviado a " + email + ": " + mensaje);
    }

    private void enviarSms(String telefono, String mensaje) {
        System.out.println("📱 SMS enviado a " + telefono + ": " + mensaje);
    }

    private String construirMensajePedido(Pedido pedido) {
        return "Su pedido #" + pedido.id() + " por $" +
               String.format("%.2f", pedido.total()) + " ha sido confirmado.";
    }
}
```

### Uso del Sistema

```java
import static io.vavr.API.*;

public class MainPedidos {
    public static void main(String[] args) {
        // Configurar sistema
        ServicioPedidos servicio = new ServicioPedidos(
            new ClienteRepositoryImpl(),
            new ProductoRepositoryImpl(),
            new PedidoRepositoryImpl()
        );

        // Items a ordenar: (SKU, cantidad)
        List<Tuple2<String, Integer>> items = List.of(
            Tuple("LAPTOP-001", 1),
            Tuple("MOUSE-002", 2),
            Tuple("TECLADO-003", 1)
        );

        // Crear pedido
        Either<ErrorPedido, Pedido> resultado = servicio.crearPedido(1L, items);

        // Manejar resultado con pattern matching
        String mensaje = Match(resultado).of(
            Case($Right($()), pedido -> {
                servicio.notificarCliente(pedido);
                return "✅ Pedido #" + pedido.id() + " creado exitosamente. Total: $" +
                       String.format("%.2f", pedido.total());
            }),
            Case($Left($Left($(instanceOf(ErrorPedido.ClienteNoEncontrado.class)))),
                error -> "❌ Cliente no encontrado con ID: " + error.clienteId()),
            Case($Left($(instanceOf(ErrorPedido.ProductoNoEncontrado.class))),
                error -> "❌ Producto no encontrado: " + error.sku()),
            Case($Left($(instanceOf(ErrorPedido.StockInsuficiente.class))),
                error -> "❌ Stock insuficiente para " + error.sku() +
                        ". Solicitado: " + error.solicitado() +
                        ", Disponible: " + error.disponible()),
            Case($Left($()), error -> "❌ Error: " + error)
        );

        System.out.println(mensaje);

        // Ejemplo con cliente inexistente
        System.out.println("\n--- Intento con cliente inexistente ---");
        Either<ErrorPedido, Pedido> fallido = servicio.crearPedido(99L, items);

        fallido.peekLeft(error -> System.out.println("Error: " + error));
    }
}
```

### Salida Esperada

```bash
📧 Email enviado a juan@email.com: Su pedido #1706789012345 por $1,234.97 ha sido confirmado.
📱 SMS enviado a 555-1234: Pedido #1706789012345 confirmado!
✅ Pedido #1706789012345 creado exitosamente. Total: $1,234.97

--- Intento con cliente inexistente ---
Error: ClienteNoEncontrado[clienteId=99]
```

## 6. Buenas Prácticas con Option, Try y Either

### Option

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Usar para valores que pueden estar ausentes | Usar para errores (usar Try/Either) |
| `getOrElse()` para valores por defecto | `.get()` sin verificar |
| `fold()` para transformar ambos casos | Anidar múltiples `if(isDefined())` |
| `flatMap()` cuando la función retorna Option | `map()` seguido de `.flatten()` |

### Try

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Usar para operaciones que lanzan excepciones | Usar para validaciones de negocio |
| `recover()` para manejar errores específicos | Silenciar errores con `.getOrElse(null)` |
| `onFailure()` para logging | Ignorar el Failure |
| Encadenar con `flatMap()` | Try dentro de Try |

### Either

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Usar para resultados con dos posibilidades | Either<String, T> para errores (crear tipo de error) |
| Right para éxito, Left para error | Intercambiar la convención |
| Errores tipados y descriptivos | Strings genéricos como errores |
| `fold()` para colapsar ambos casos | `.get()` sin verificar |

## Conclusión

Con `Option`, `Try` y `Either`, el código se vuelve más honesto sobre lo que puede fallar. El tipo ya dice si una operación puede estar ausente o si puede lanzar error, y el compilador te obliga a manejarlo en lugar de descubrirlo en producción. Las operaciones se encadenan sin try-catch intermedios y, como no hay efectos ocultos, las pruebas unitarias son mucho más directas.

En la siguiente parte exploraremos características avanzadas de Vavr: `Validation` para acumular errores en formularios, pattern matching, colecciones inmutables y tuplas.

---

Este artículo es parte de la serie **Programación Funcional en Java**, donde continuaremos profundizando en conceptos, buenas prácticas y casos de uso aplicados al desarrollo profesional.

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Documentación oficial de Vavr
    - 📄 Vavr User Guide
    - 🔗 [https://docs.vavr.io/](https://docs.vavr.io/)

- Repositorio GitHub de Vavr
    - 📄 vavr-io/vavr
    - 🔗 [https://github.com/vavr-io/vavr](https://github.com/vavr-io/vavr)

- Artículo: *Introduction to Vavr*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/vavr](https://www.baeldung.com/vavr)

- Libro: *Functional Programming in Java, Second Edition*
    - 🖋️ Venkat Subramaniam – Pragmatic Bookshelf
