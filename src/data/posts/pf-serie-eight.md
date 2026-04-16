---
title: 'Serie: Programación Funcional en Java – Parte 8: Railway Oriented Programming con Vavr'
date: '2026-04-18'
image: "/img/blog/18.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Programación Funcional
    - Vavr
    - Railway Oriented Programming
    - Either
    - Diseño Funcional
author: Geovanny Mendoza
short: Aprende Railway Oriented Programming con Vavr en Java. Un patrón que simplifica el manejo de errores construyendo pipelines donde el flujo feliz y el flujo de error corren en paralelo, sin excepciones ni if-else anidados.
---

## Introducción

Uno de los conceptos que más cambia la forma de escribir código cuando empiezas a usar programación funcional es el **Railway Oriented Programming** (ROP). Lo describió Scott Wlaschin para F#, pero aplica perfectamente con Vavr en Java.

La idea es simple: imagina que tienes dos rieles paralelos, uno para el camino feliz (todo sale bien) y otro para el camino de error. Cada operación que aplicas puede devolver el control al riel de error, y una vez que estás en ese riel, las operaciones siguientes se saltan automáticamente.

Con `Either` o `Try` de Vavr, ya tienes todo lo que necesitas para implementar este patrón.

## 1. El problema que resuelve ROP

Mira este código típico de validación y procesamiento:

```java
// Enfoque imperativo clásico
public ResponseEntity<?> registrarUsuario(UsuarioRequest request) {
    // Validación del nombre
    if (request.getNombre() == null || request.getNombre().isBlank()) {
        return ResponseEntity.badRequest().body("Nombre requerido");
    }

    // Validación del email
    if (request.getEmail() == null || !request.getEmail().contains("@")) {
        return ResponseEntity.badRequest().body("Email inválido");
    }

    // Verificar si existe
    if (usuarioRepository.existePorEmail(request.getEmail())) {
        return ResponseEntity.badRequest().body("El email ya está registrado");
    }

    // Hashear contraseña
    String passwordHash;
    try {
        passwordHash = hashearPassword(request.getPassword());
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("Error procesando contraseña");
    }

    // Guardar
    try {
        Usuario usuario = usuarioRepository.guardar(
            new Usuario(request.getNombre(), request.getEmail(), passwordHash)
        );
        return ResponseEntity.ok(usuario);
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("Error guardando usuario");
    }
}
```

El código funciona pero tiene un problema estructural: la lógica de negocio está mezclada con el manejo de errores en cada paso. Cada validación interrumpe el flujo. Si quieres agregar un paso nuevo o cambiar el orden, tienes que reorganizar los if-else.

Con ROP, el mismo flujo se estructura como un pipeline donde cada paso devuelve un `Either` y los errores fluyen solos sin interrumpir el código principal.

## 2. Los dos rieles: Right es éxito, Left es error

`Either<L, R>` es el tipo que implementa los dos rieles:
- `Right<R>`: el riel del éxito, el valor viaja por aquí
- `Left<L>`: el riel del error, cuando algo falla el valor va aquí

Cuando encadenas operaciones con `flatMap`, si alguna devuelve un `Left`, todas las operaciones siguientes se saltan. No tienes que escribir `if (error) return error` en cada paso.

```java
Either<String, Integer> rielExito = Either.right(42);
Either<String, Integer> rielError = Either.left("Algo salió mal");

// flatMap: si es Right, aplica la función. Si es Left, lo pasa directo
Either<String, Integer> resultado = rielExito
    .flatMap(n -> n > 0 ? Either.right(n * 2) : Either.left("Número negativo"))
    .flatMap(n -> Either.right(n + 10));

System.out.println(resultado);  // Right(94)

// Si el primer Either es Left, los flatMap se saltan
Either<String, Integer> resultadoError = rielError
    .flatMap(n -> Either.right(n * 2))   // No se ejecuta
    .flatMap(n -> Either.right(n + 10)); // No se ejecuta

System.out.println(resultadoError);  // Left("Algo salió mal")
```

Esto es el riel: en cuanto hay un error, el valor viaja por el Left hasta el final del pipeline y todos los pasos intermedios se ignoran.

## 3. Construyendo un pipeline funcional

Volvamos al ejemplo de registro de usuario y reescribámoslo con Railway Oriented Programming:

### Definir los tipos de error

Primero definimos un tipo de error que represente todas las formas en que puede fallar el proceso:

```java
public sealed interface ErrorRegistro {
    record NombreInvalido(String detalle) implements ErrorRegistro {}
    record EmailInvalido(String detalle) implements ErrorRegistro {}
    record EmailDuplicado(String email) implements ErrorRegistro {}
    record ErrorHashPassword(Throwable causa) implements ErrorRegistro {}
    record ErrorPersistencia(Throwable causa) implements ErrorRegistro {}
}
```

Los `sealed interface` de Java 17+ funcionan muy bien aquí: el compilador sabe cuáles son todos los casos posibles, lo que facilita el pattern matching.

### Cada paso del pipeline como función

Cada paso es una función que recibe datos válidos y devuelve un `Either`:

```java
import io.vavr.control.Either;
import io.vavr.control.Try;

public class ServicioRegistro {

    private final UsuarioRepository repo;
    private final PasswordService passwordService;

    // Paso 1: validar nombre
    private Either<ErrorRegistro, String> validarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return Either.left(new ErrorRegistro.NombreInvalido("El nombre no puede estar vacío"));
        }
        if (nombre.length() < 2) {
            return Either.left(new ErrorRegistro.NombreInvalido("El nombre debe tener al menos 2 caracteres"));
        }
        return Either.right(nombre.trim());
    }

    // Paso 2: validar email
    private Either<ErrorRegistro, String> validarEmail(String email) {
        if (email == null || !email.matches("^[^@]+@[^@]+\\.[^@]+$")) {
            return Either.left(new ErrorRegistro.EmailInvalido("Formato de email inválido"));
        }
        return Either.right(email.toLowerCase().trim());
    }

    // Paso 3: verificar que el email no exista
    private Either<ErrorRegistro, String> verificarEmailUnico(String email) {
        return repo.existePorEmail(email)
            ? Either.left(new ErrorRegistro.EmailDuplicado(email))
            : Either.right(email);
    }

    // Paso 4: hashear contraseña
    private Either<ErrorRegistro, String> hashearPassword(String password) {
        return Try.of(() -> passwordService.hash(password))
            .toEither()
            .mapLeft(ErrorRegistro.ErrorHashPassword::new);
    }

    // Paso 5: guardar el usuario
    private Either<ErrorRegistro, Usuario> guardarUsuario(String nombre, String email, String passwordHash) {
        return Try.of(() -> repo.guardar(new Usuario(nombre, email, passwordHash)))
            .toEither()
            .mapLeft(ErrorRegistro.ErrorPersistencia::new);
    }
}
```

### El pipeline completo

Ahora encadenamos los pasos. El flujo se lee de arriba a abajo, sin if-else intermedios:

```java
public Either<ErrorRegistro, Usuario> registrar(UsuarioRequest request) {
    return validarNombre(request.getNombre())
        .flatMap(nombre ->
            validarEmail(request.getEmail())
                .flatMap(email ->
                    verificarEmailUnico(email)
                        .flatMap(emailValido ->
                            hashearPassword(request.getPassword())
                                .flatMap(hash ->
                                    guardarUsuario(nombre, emailValido, hash)))));
}
```

Si cualquier paso falla, devuelve un `Left` con el error específico y los pasos siguientes no se ejecutan. Si todos pasan, el resultado final es `Right<Usuario>`.

El código del controlador queda limpio:

```java
@PostMapping("/registro")
public ResponseEntity<?> registrar(@RequestBody UsuarioRequest request) {
    return servicioRegistro.registrar(request).fold(
        error -> switch (error) {
            case ErrorRegistro.NombreInvalido e   -> ResponseEntity.badRequest().body(e.detalle());
            case ErrorRegistro.EmailInvalido e    -> ResponseEntity.badRequest().body(e.detalle());
            case ErrorRegistro.EmailDuplicado e   -> ResponseEntity.status(409).body("Email ya registrado: " + e.email());
            case ErrorRegistro.ErrorHashPassword e -> ResponseEntity.internalServerError().body("Error procesando contraseña");
            case ErrorRegistro.ErrorPersistencia e -> ResponseEntity.internalServerError().body("Error guardando usuario");
        },
        usuario -> ResponseEntity.status(201).body(usuario)
    );
}
```

El `fold` maneja los dos rieles en un solo lugar. Nada de `instanceof` distribuidos por el código.

## 4. Aplanar el pipeline con una función auxiliar

El anidamiento de `flatMap` puede volverse difícil de leer cuando hay muchos pasos. Hay dos formas de manejarlo.

**Opción A: extraer pasos a métodos con estado intermedio**

```java
public Either<ErrorRegistro, Usuario> registrar(UsuarioRequest request) {
    return validarNombre(request.getNombre())
        .flatMap(nombre -> completarRegistro(nombre, request));
}

private Either<ErrorRegistro, Usuario> completarRegistro(String nombre, UsuarioRequest request) {
    return validarEmail(request.getEmail())
        .flatMap(this::verificarEmailUnico)
        .flatMap(email -> finalizarConHash(nombre, email, request.getPassword()));
}

private Either<ErrorRegistro, Usuario> finalizarConHash(String nombre, String email, String password) {
    return hashearPassword(password)
        .flatMap(hash -> guardarUsuario(nombre, email, hash));
}
```

**Opción B: usar una función auxiliar que encadena una lista de validaciones**

```java
// Utility: ejecuta pasos en secuencia, retorna el primer Left que encuentre
@SafeVarargs
private <E, T> Either<E, T> secuencia(Either<E, T>... pasos) {
    return List.of(pasos)
        .find(Either::isLeft)
        .getOrElse(pasos[pasos.length - 1]);
}
```

## 5. Caso práctico: procesamiento de pagos

Un escenario donde ROP brilla especialmente es el procesamiento de pagos, donde cada paso puede fallar por razones distintas y es importante saber exactamente en qué punto falló:

```java
// Tipos de error
public sealed interface ErrorPago {
    record TarjetaExpirada(String ultimos4) implements ErrorPago {}
    record FondosInsuficientes(double disponible, double requerido) implements ErrorPago {}
    record LimiteDiarioExcedido(double limite) implements ErrorPago {}
    record ErrorGateway(String codigo, String mensaje) implements ErrorPago {}
    record FraudeDetectado(String razon) implements ErrorPago {}
}

public class ServicioPago {

    // El pipeline de pago: cada paso puede desviar al riel de error
    public Either<ErrorPago, Transaccion> procesarPago(SolicitudPago solicitud) {
        return validarTarjeta(solicitud.tarjeta())
            .flatMap(tarjeta -> verificarFondos(tarjeta, solicitud.monto()))
            .flatMap(tarjeta -> verificarLimiteDiario(tarjeta, solicitud.monto()))
            .flatMap(tarjeta -> verificarFraude(tarjeta, solicitud))
            .flatMap(tarjeta -> ejecutarCobro(tarjeta, solicitud.monto()));
    }

    private Either<ErrorPago, Tarjeta> validarTarjeta(Tarjeta tarjeta) {
        if (tarjeta.estaExpirada()) {
            return Either.left(new ErrorPago.TarjetaExpirada(tarjeta.ultimos4()));
        }
        return Either.right(tarjeta);
    }

    private Either<ErrorPago, Tarjeta> verificarFondos(Tarjeta tarjeta, double monto) {
        if (tarjeta.saldoDisponible() < monto) {
            return Either.left(new ErrorPago.FondosInsuficientes(tarjeta.saldoDisponible(), monto));
        }
        return Either.right(tarjeta);
    }

    private Either<ErrorPago, Tarjeta> verificarLimiteDiario(Tarjeta tarjeta, double monto) {
        double gastoHoy = tarjeta.gastoHoy();
        double limite = tarjeta.limiteDiario();
        if (gastoHoy + monto > limite) {
            return Either.left(new ErrorPago.LimiteDiarioExcedido(limite));
        }
        return Either.right(tarjeta);
    }

    private Either<ErrorPago, Tarjeta> verificarFraude(Tarjeta tarjeta, SolicitudPago solicitud) {
        return Try.of(() -> sistemaFraude.analizar(tarjeta, solicitud))
            .toEither()
            .mapLeft(e -> new ErrorPago.FraudeDetectado(e.getMessage()))
            .flatMap(analisis ->
                analisis.esRiesgoso()
                    ? Either.left(new ErrorPago.FraudeDetectado(analisis.razon()))
                    : Either.right(tarjeta)
            );
    }

    private Either<ErrorPago, Transaccion> ejecutarCobro(Tarjeta tarjeta, double monto) {
        return Try.of(() -> gateway.cobrar(tarjeta, monto))
            .toEither()
            .mapLeft(e -> new ErrorPago.ErrorGateway("GATEWAY_ERROR", e.getMessage()));
    }
}

// Uso en el controlador
@PostMapping("/pago")
public ResponseEntity<?> pagar(@RequestBody SolicitudPago solicitud) {
    return servicioPago.procesarPago(solicitud).fold(
        error -> switch (error) {
            case ErrorPago.TarjetaExpirada e ->
                ResponseEntity.badRequest().body("Tarjeta expirada terminada en " + e.ultimos4());
            case ErrorPago.FondosInsuficientes e ->
                ResponseEntity.badRequest().body(
                    String.format("Fondos insuficientes. Disponible: $%.2f, Requerido: $%.2f",
                        e.disponible(), e.requerido()));
            case ErrorPago.LimiteDiarioExcedido e ->
                ResponseEntity.badRequest().body(
                    String.format("Límite diario de $%.2f excedido", e.limite()));
            case ErrorPago.FraudeDetectado e ->
                ResponseEntity.status(403).body("Pago rechazado por seguridad");
            case ErrorPago.ErrorGateway e ->
                ResponseEntity.status(502).body("Error de gateway: " + e.codigo());
        },
        transaccion -> ResponseEntity.ok(transaccion)
    );
}
```

Lo que resalta de este código es que el método `procesarPago` es una descripción del proceso, no una implementación llena de if-else. Si agregas un paso nuevo (por ejemplo, verificar que el comercio esté activo), solo añades un `flatMap` más.

## 6. ROP con Try en lugar de Either

Si los errores son excepciones (no errores de negocio), `Try` puede ser más natural que `Either`:

```java
public Try<Reporte> generarReporte(String reporteId) {
    return Try.of(() -> repositorio.cargar(reporteId))
        .filter(r -> r.estaActivo(), () -> new ReporteInactivoException(reporteId))
        .flatMap(r -> Try.of(() -> procesador.procesar(r)))
        .flatMap(r -> Try.of(() -> formateador.formatear(r)));
}
```

La diferencia es que `Try` siempre usa `Throwable` como tipo de error, lo que puede perder información si quieres distinguir entre tipos de fallo. Para eso, `Either` con tipos de error específicos es más preciso.

Una regla práctica: usa `Try` para envolver código que lanza excepciones checked, y convierte a `Either` cuando quieras un tipo de error más descriptivo:

```java
return Try.of(() -> operacionQueLanzaExcepcion())
    .toEither()
    .mapLeft(ex -> new MiErrorDeNegocio(ex.getMessage()));
```

## 7. Cuándo ROP tiene sentido y cuándo no

ROP es una buena opción cuando:
- Tienes varios pasos secuenciales donde cada uno puede fallar
- Quieres saber exactamente en qué paso falló
- Necesitas distintos tipos de error con información específica
- El código del controlador o la capa de presentación necesita reaccionar diferente a cada tipo de error

Puede ser excesivo cuando:
- La operación tiene solo uno o dos pasos
- No necesitas distinguir los tipos de error
- El equipo no está familiarizado con el paradigma y la legibilidad sufre

No hay regla absoluta. A veces un if bien colocado es más claro que un `flatMap`. La clave es que el código comunique la intención: si tienes un pipeline de validación donde cada paso puede fallar de forma distinta, ROP lo hace legible. Si tienes un solo if, el if es suficiente.

## 8. Integración completa: From request to response

Veamos cómo se vería un flujo completo desde el request HTTP hasta la respuesta, usando ROP y los tipos de Vavr que hemos visto en toda la serie:

```java
@Service
public class ServicioOnboarding {

    public Either<ErrorOnboarding, UsuarioOnboarding> completarOnboarding(OnboardingRequest request) {
        // Paso 1: Validation para acumular errores de formulario (parte 6)
        return validarFormulario(request)
            // Paso 2: Either para verificar estado del sistema
            .flatMap(dto -> verificarSistemaActivo())
            // Paso 3: Try para operaciones que pueden lanzar excepciones
            .flatMap(dto -> crearCuenta(dto))
            // Paso 4: Notificación (ignora errores de notificación, no bloquea el flujo)
            .peek(usuario -> Try.run(() -> enviarEmailBienvenida(usuario))
                .onFailure(e -> log.warn("No se pudo enviar email: {}", e.getMessage())));
    }

    private Either<ErrorOnboarding, OnboardingDTO> validarFormulario(OnboardingRequest request) {
        // Usando Validation para acumular TODOS los errores del formulario
        return Validation.combine(
            validarNombre(request.getNombre()),
            validarEmail(request.getEmail()),
            validarPassword(request.getPassword())
        ).ap(OnboardingDTO::new)
         .toEither()
         .mapLeft(errores -> new ErrorOnboarding.ErroresFormulario(errores.toJavaList()));
    }

    private Either<ErrorOnboarding, Void> verificarSistemaActivo() {
        return sistemaMonitor.estaActivo()
            ? Either.right(null)
            : Either.left(new ErrorOnboarding.SistemaEnMantenimiento());
    }

    private Either<ErrorOnboarding, UsuarioOnboarding> crearCuenta(OnboardingDTO dto) {
        return Try.of(() -> cuentaService.crear(dto))
            .toEither()
            .mapLeft(e -> new ErrorOnboarding.ErrorCreandoCuenta(e.getMessage()));
    }
}
```

El controlador simplemente hace `fold` al final:

```java
@PostMapping("/onboarding")
public ResponseEntity<?> onboarding(@RequestBody OnboardingRequest request) {
    return servicio.completarOnboarding(request).fold(
        error -> mapearError(error),
        usuario -> ResponseEntity.status(201).body(usuario)
    );
}

private ResponseEntity<?> mapearError(ErrorOnboarding error) {
    return switch (error) {
        case ErrorOnboarding.ErroresFormulario e ->
            ResponseEntity.badRequest().body(Map.of("errores", e.errores()));
        case ErrorOnboarding.SistemaEnMantenimiento e ->
            ResponseEntity.status(503).body("Sistema en mantenimiento");
        case ErrorOnboarding.ErrorCreandoCuenta e ->
            ResponseEntity.internalServerError().body("Error interno");
    };
}
```

## Resumen

Railway Oriented Programming no es un patrón complicado: es simplemente una forma de organizar operaciones secuenciales que pueden fallar, usando `Either` o `Try` para que los errores fluyan solos sin interrumpir el código principal.

Lo que cambia es la perspectiva: en lugar de pensar "¿qué hago si falla este paso?", piensas "¿qué resultado produce este paso?" y dejas que el tipo se encargue de propagar el error si ocurre.

Con Vavr, los ingredientes están todos ahí: `Either` para los dos rieles, `Try` para envolver código que lanza excepciones, `Validation` para acumular errores de formulario, y pattern matching para manejar cada tipo de error en la capa de presentación.

---

Este artículo es parte de la serie **Programación Funcional en Java**, donde hemos recorrido desde las lambdas básicas hasta patrones funcionales aplicados en escenarios reales.

📌 Gracias por acompañarme en esta serie.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- *Railway Oriented Programming* — Scott Wlaschin
    - 🔗 [https://fsharpforfunandprofit.com/rop/](https://fsharpforfunandprofit.com/rop/)

- Documentación oficial de Vavr
    - 📄 Vavr User Guide
    - 🔗 [https://docs.vavr.io/](https://docs.vavr.io/)

- Repositorio GitHub de Vavr
    - 📄 vavr-io/vavr
    - 🔗 [https://github.com/vavr-io/vavr](https://github.com/vavr-io/vavr)

- Artículo: *Vavr Either*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/vavr-either](https://www.baeldung.com/vavr-either)

- Libro: *Functional Programming in Java, Second Edition*
    - 🖋️ Venkat Subramaniam – Pragmatic Bookshelf
