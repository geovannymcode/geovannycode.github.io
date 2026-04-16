---
title: 'Serie: Programación Funcional en Java – Parte 6: Vavr Avanzado - Validation, Pattern Matching y Colecciones'
date: '2026-04-16'
image: "/img/blog/16.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Programación Funcional
    - Vavr
    - Pattern Matching
    - Colecciones Inmutables
    - Validation
author: Geovanny Mendoza
short: Domina las características avanzadas de Vavr. Validation para acumular errores, Pattern Matching estilo Scala, Colecciones inmutables y Tuplas para código funcional profesional.
---

## Introducción

En la parte anterior de esta serie, exploramos los fundamentos de Vavr con `Option`, `Try` y `Either`. Esos tipos cubren buena parte del manejo de errores y ausencia de valores, pero Vavr tiene más.

En esta entrega vemos las piezas que completan el cuadro:

- **Validation**: acumular todos los errores de validación en lugar de fallar en el primero
- **Pattern Matching**: evaluar expresiones contra predicados de forma exhaustiva
- **Tuplas**: agrupar valores temporalmente sin crear una clase para eso
- **Colecciones Inmutables**: List, Map, Set que no mutan nunca

## 1. Validation: Acumulando Errores

### El Problema de Validar con Either

En la parte anterior, usamos `Either` para validaciones. Sin embargo, `Either` tiene una limitación importante: **falla en el primer error** y no continúa evaluando las demás validaciones.

```java
// Con Either: si el nombre falla, nunca validamos email ni edad
Either<ErrorValidacion, Usuario> resultado = validarNombre(nombre)
    .flatMap(n -> validarEmail(email)
        .flatMap(e -> validarEdad(edad)
            .map(a -> new Usuario(n, e, a))));

// Si nombre es inválido, retorna Left inmediatamente
// El usuario no sabe que también email y edad son inválidos
```

En formularios web, queremos mostrar **todos** los errores de una vez, no uno por uno.

### Validation: Acumulación Funcional de Errores

`Validation<E, T>` es como `Either`, pero con la capacidad de **acumular** múltiples errores cuando se combinan validaciones:

```java
import io.vavr.control.Validation;
import io.vavr.collection.Seq;

// Cada validación individual
Validation<String, String> nombre = validarNombre(""); // Invalid("Nombre requerido")
Validation<String, String> email = validarEmail("no-email"); // Invalid("Email inválido")
Validation<String, Integer> edad = validarEdad(15); // Invalid("Debe ser mayor de 18")

// Combinando validaciones - ACUMULA todos los errores
Validation<Seq<String>, Usuario> resultado = Validation.combine(nombre, email, edad)
    .ap(Usuario::new);

// resultado contiene TODOS los errores:
// Invalid(List("Nombre requerido", "Email inválido", "Debe ser mayor de 18"))
```

### Creación de Validations

```java
// Validación exitosa
Validation<String, Integer> valido = Validation.valid(42);

// Validación fallida
Validation<String, Integer> invalido = Validation.invalid("Valor fuera de rango");

// Desde predicado
Validation<String, String> fromPredicate = edad >= 18
    ? Validation.valid("adulto")
    : Validation.invalid("Debe ser mayor de edad");
```

### Implementación de Validadores

```java
public class ValidadorUsuario {

    public Validation<String, String> validarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return Validation.invalid("El nombre es requerido");
        }
        if (nombre.length() < 2) {
            return Validation.invalid("El nombre debe tener al menos 2 caracteres");
        }
        if (nombre.length() > 100) {
            return Validation.invalid("El nombre no puede exceder 100 caracteres");
        }
        return Validation.valid(nombre.trim());
    }

    public Validation<String, String> validarEmail(String email) {
        String EMAIL_REGEX = "^[A-Za-z0-9+_.-]+@(.+)\\.(.+)$";
        if (email == null || email.isBlank()) {
            return Validation.invalid("El email es requerido");
        }
        if (!email.matches(EMAIL_REGEX)) {
            return Validation.invalid("El formato del email es inválido");
        }
        return Validation.valid(email.toLowerCase().trim());
    }

    public Validation<String, Integer> validarEdad(Integer edad) {
        if (edad == null) {
            return Validation.invalid("La edad es requerida");
        }
        if (edad < 18) {
            return Validation.invalid("Debe ser mayor de 18 años");
        }
        if (edad > 120) {
            return Validation.invalid("La edad no parece válida");
        }
        return Validation.valid(edad);
    }

    public Validation<String, String> validarTelefono(String telefono) {
        if (telefono == null || telefono.isBlank()) {
            return Validation.valid("");  // Teléfono es opcional
        }
        if (!telefono.matches("^\\d{10}$")) {
            return Validation.invalid("El teléfono debe tener 10 dígitos");
        }
        return Validation.valid(telefono);
    }
}
```

### Combinando Validaciones con combine().ap()

El método `combine()` acepta hasta 8 validaciones, y `ap()` aplica una función si todas son válidas:

```java
public record Usuario(String nombre, String email, int edad) {}

ValidadorUsuario validador = new ValidadorUsuario();

// Datos del formulario
String nombre = "Juan";
String email = "juan@email.com";
Integer edad = 25;

// Combinar validaciones
Validation<Seq<String>, Usuario> resultado = Validation.combine(
    validador.validarNombre(nombre),
    validador.validarEmail(email),
    validador.validarEdad(edad)
).ap(Usuario::new);

// Procesar resultado
if (resultado.isValid()) {
    Usuario usuario = resultado.get();
    System.out.println("Usuario válido: " + usuario);
} else {
    Seq<String> errores = resultado.getError();
    errores.forEach(error -> System.out.println("❌ " + error));
}
```

### Usando fold() para Manejar Ambos Casos

```java
String mensaje = resultado.fold(
    errores -> {
        StringBuilder sb = new StringBuilder("Errores de validación:\n");
        errores.forEach(e -> sb.append("  • ").append(e).append("\n"));
        return sb.toString();
    },
    usuario -> "Usuario creado: " + usuario.nombre() + " (" + usuario.email() + ")"
);

System.out.println(mensaje);
```

### Ejemplo Completo: Formulario de Registro

```java
public class ServicioRegistro {

    private final ValidadorUsuario validador = new ValidadorUsuario();
    private final UsuarioRepository repository;

    public ServicioRegistro(UsuarioRepository repository) {
        this.repository = repository;
    }

    public record FormularioRegistro(
        String nombre,
        String email,
        Integer edad,
        String password,
        String confirmPassword
    ) {}

    public record ErrorRegistro(String campo, String mensaje) {}

    public Validation<Seq<ErrorRegistro>, Usuario> registrar(FormularioRegistro form) {
        return Validation.combine(
            validarNombreConCampo(form.nombre()),
            validarEmailUnico(form.email()),
            validarEdadConCampo(form.edad()),
            validarPasswords(form.password(), form.confirmPassword())
        ).ap((nombre, email, edad, password) -> {
            Usuario usuario = new Usuario(nombre, email, edad);
            // Aquí se podría hashear el password y persistir
            return usuario;
        });
    }

    private Validation<ErrorRegistro, String> validarNombreConCampo(String nombre) {
        return validador.validarNombre(nombre)
            .mapError(msg -> new ErrorRegistro("nombre", msg));
    }

    private Validation<ErrorRegistro, String> validarEmailUnico(String email) {
        return validador.validarEmail(email)
            .mapError(msg -> new ErrorRegistro("email", msg))
            .flatMap(e -> repository.existeEmail(e)
                ? Validation.invalid(new ErrorRegistro("email", "Este email ya está registrado"))
                : Validation.valid(e));
    }

    private Validation<ErrorRegistro, Integer> validarEdadConCampo(Integer edad) {
        return validador.validarEdad(edad)
            .mapError(msg -> new ErrorRegistro("edad", msg));
    }

    private Validation<ErrorRegistro, String> validarPasswords(String password, String confirm) {
        if (password == null || password.length() < 8) {
            return Validation.invalid(new ErrorRegistro("password",
                "La contraseña debe tener al menos 8 caracteres"));
        }
        if (!password.equals(confirm)) {
            return Validation.invalid(new ErrorRegistro("confirmPassword",
                "Las contraseñas no coinciden"));
        }
        return Validation.valid(password);
    }
}

// Uso en controlador
@PostMapping("/registro")
public ResponseEntity<?> registrar(@RequestBody FormularioRegistro form) {
    return servicioRegistro.registrar(form).fold(
        errores -> ResponseEntity.badRequest().body(
            Map.of("errores", errores.toJavaList())
        ),
        usuario -> ResponseEntity.ok(
            Map.of("mensaje", "Usuario registrado", "usuario", usuario)
        )
    );
}
```

## 2. Pattern Matching: El Poder de Match

### ¿Qué es Pattern Matching?

Pattern Matching es una característica de lenguajes funcionales que permite descomponer estructuras de datos y ejecutar código basado en su forma. Es como un `switch` con superpoderes.

```java
import static io.vavr.API.*;
import static io.vavr.Predicates.*;
import static io.vavr.Patterns.*;

// Match básico - como switch mejorado
int numero = 2;

String resultado = Match(numero).of(
    Case($(1), "uno"),
    Case($(2), "dos"),
    Case($(3), "tres"),
    Case($(), "otro")  // Default case
);
// "dos"
```

### Sintaxis de Case

```java
Case(PATRON, RESULTADO)
Case(PATRON, valor -> TRANSFORMACION)
```

Donde `$()` define el patrón a matchear.

### Patrones con Predicados

```java
int edad = 25;

String categoria = Match(edad).of(
    Case($(n -> n < 0), "Edad inválida"),
    Case($(n -> n < 13), "Niño"),
    Case($(n -> n < 20), "Adolescente"),
    Case($(n -> n < 65), "Adulto"),
    Case($(), "Senior")
);
// "Adulto"

// Usando predicados predefinidos de Vavr
String resultado = Match(edad).of(
    Case($(isIn(18, 21, 65)), "Edad significativa"),
    Case($(n -> n % 2 == 0), "Edad par"),
    Case($(), "Edad impar")
);
```

### Pattern Matching con Option

```java
Option<String> usuario = Option.of("admin");

String mensaje = Match(usuario).of(
    Case($Some($()), nombre -> "Bienvenido, " + nombre),
    Case($None(), "Usuario anónimo")
);
// "Bienvenido, admin"

// Con condiciones adicionales
Option<Integer> edad = Option.of(25);

String acceso = Match(edad).of(
    Case($Some($(n -> n >= 18)), "Acceso permitido"),
    Case($Some($()), "Acceso denegado - menor de edad"),
    Case($None(), "Edad no especificada")
);
```

### Pattern Matching con Either

```java
Either<String, Integer> resultado = calcular(10, 2);

String mensaje = Match(resultado).of(
    Case($Right($(n -> n > 100)), n -> "Resultado grande: " + n),
    Case($Right($()), n -> "Resultado: " + n),
    Case($Left($()), error -> "Error: " + error)
);
```

### Pattern Matching con Try

```java
Try<Integer> operacion = Try.of(() -> Integer.parseInt("42"));

String estado = Match(operacion).of(
    Case($Success($(n -> n > 0)), "Número positivo"),
    Case($Success($()), "Número no positivo"),
    Case($Failure($(instanceOf(NumberFormatException.class))), "Formato inválido"),
    Case($Failure($()), ex -> "Error: " + ex.getMessage())
);
```

### Deconstruction Patterns

Pattern matching permite "deconstruir" objetos para acceder a sus componentes:

```java
// Con Tuplas
Tuple2<String, Integer> persona = Tuple.of("Juan", 30);

String info = Match(persona).of(
    Case($Tuple2($("Admin"), $()), edad -> "Administrador de " + edad + " años"),
    Case($Tuple2($(startsWith("J")), $(n -> n > 25)), (nombre, edad) ->
        nombre + " es mayor de 25"),
    Case($(), "Persona normal")
);

// Con tipos propios usando @Patterns (requiere anotación en la clase)
// O manualmente con guardas
record Punto(int x, int y) {}

Punto punto = new Punto(3, 4);

String cuadrante = Match(punto).of(
    Case($(p -> p.x() > 0 && p.y() > 0), "Primer cuadrante"),
    Case($(p -> p.x() < 0 && p.y() > 0), "Segundo cuadrante"),
    Case($(p -> p.x() < 0 && p.y() < 0), "Tercer cuadrante"),
    Case($(p -> p.x() > 0 && p.y() < 0), "Cuarto cuadrante"),
    Case($(), "En un eje")
);
```

### Pattern Matching con Listas

```java
import io.vavr.collection.List;

List<Integer> numeros = List.of(1, 2, 3, 4, 5);

// Matchear por contenido de lista
String descripcion = Match(numeros).of(
    Case($(List::isEmpty), "Lista vacía"),
    Case($(l -> l.size() == 1), "Un solo elemento"),
    Case($(l -> l.head() == 1), "Empieza con 1"),
    Case($(), "Lista genérica")
);
// "Empieza con 1"
```

### Ejemplo Avanzado: Calculadora con Pattern Matching

```java
public sealed interface Expresion {
    record Numero(double valor) implements Expresion {}
    record Suma(Expresion izq, Expresion der) implements Expresion {}
    record Resta(Expresion izq, Expresion der) implements Expresion {}
    record Multiplicacion(Expresion izq, Expresion der) implements Expresion {}
    record Division(Expresion izq, Expresion der) implements Expresion {}
}

public class Calculadora {

    public Try<Double> evaluar(Expresion expr) {
        return Match(expr).of(
            Case($(instanceOf(Expresion.Numero.class)),
                n -> Try.success(n.valor())),

            Case($(instanceOf(Expresion.Suma.class)),
                s -> evaluar(s.izq()).flatMap(i ->
                    evaluar(s.der()).map(d -> i + d))),

            Case($(instanceOf(Expresion.Resta.class)),
                r -> evaluar(r.izq()).flatMap(i ->
                    evaluar(r.der()).map(d -> i - d))),

            Case($(instanceOf(Expresion.Multiplicacion.class)),
                m -> evaluar(m.izq()).flatMap(i ->
                    evaluar(m.der()).map(d -> i * d))),

            Case($(instanceOf(Expresion.Division.class)),
                d -> evaluar(d.izq()).flatMap(i ->
                    evaluar(d.der()).flatMap(divisor ->
                        divisor == 0
                            ? Try.failure(new ArithmeticException("División por cero"))
                            : Try.success(i / divisor))))
        );
    }
}

// Uso
Calculadora calc = new Calculadora();

// (10 + 5) * 2
Expresion expr = new Expresion.Multiplicacion(
    new Expresion.Suma(
        new Expresion.Numero(10),
        new Expresion.Numero(5)
    ),
    new Expresion.Numero(2)
);

Try<Double> resultado = calc.evaluar(expr);
resultado.forEach(r -> System.out.println("Resultado: " + r));  // 30.0
```

## 3. Tuplas: Agrupando Valores

### ¿Qué son las Tuplas?

Las tuplas son contenedores inmutables que agrupan un número fijo de elementos de diferentes tipos. Vavr proporciona `Tuple1` hasta `Tuple8`.

```java
import io.vavr.Tuple;
import io.vavr.Tuple2;
import io.vavr.Tuple3;

// Crear tuplas
Tuple2<String, Integer> persona = Tuple.of("Juan", 30);
Tuple3<String, String, Integer> empleado = Tuple.of("María", "Desarrollo", 5);

// Acceder a elementos
String nombre = persona._1;  // "Juan"
Integer edad = persona._2;   // 30

// Acceso con métodos
String nombreMetodo = persona._1();  // "Juan" (equivalente)
```

### Operaciones con Tuplas

```java
Tuple2<String, Integer> original = Tuple.of("Juan", 30);

// map: transformar elementos individualmente
Tuple2<String, Integer> modificado = original.map(
    nombre -> nombre.toUpperCase(),
    edad -> edad + 1
);  // ("JUAN", 31)

// map1, map2: transformar un solo elemento
Tuple2<String, Integer> soloNombre = original.map1(String::toUpperCase);
// ("JUAN", 30)

// apply: usar los valores de la tupla
String resultado = original.apply((nombre, edad) ->
    nombre + " tiene " + edad + " años"
);  // "Juan tiene 30 años"

// transform: convertir a otro tipo
record Persona(String nombre, int edad) {}
Persona persona = original.transform(Persona::new);
```

### Tuplas y Streams

```java
import io.vavr.collection.List;

// Crear lista de tuplas
List<Tuple2<String, Integer>> personas = List.of(
    Tuple.of("Ana", 25),
    Tuple.of("Carlos", 35),
    Tuple.of("Elena", 28)
);

// Filtrar por segundo elemento
List<Tuple2<String, Integer>> mayores30 = personas
    .filter(t -> t._2 > 30);

// Transformar
List<String> descripciones = personas
    .map(t -> t.apply((n, e) -> n + " (" + e + " años)"));

// Ordenar por edad
List<Tuple2<String, Integer>> ordenados = personas
    .sortBy(Tuple2::_2);
```

### Caso de Uso: Funciones que Retornan Múltiples Valores

```java
public class Estadisticas {

    // En lugar de crear una clase para el resultado
    public Tuple3<Double, Double, Double> calcularEstadisticas(List<Double> valores) {
        double min = valores.min().getOrElse(0.0);
        double max = valores.max().getOrElse(0.0);
        double promedio = valores.average().getOrElse(0.0);

        return Tuple.of(min, max, promedio);
    }

    // Uso
    public void ejemplo() {
        List<Double> datos = List.of(1.5, 2.3, 4.7, 3.2, 5.1);

        Tuple3<Double, Double, Double> stats = calcularEstadisticas(datos);

        System.out.printf("Min: %.2f, Max: %.2f, Promedio: %.2f%n",
            stats._1(), stats._2(), stats._3());
        // Min: 1.50, Max: 5.10, Promedio: 3.36

        // O usando apply
        String reporte = stats.apply((min, max, prom) ->
            String.format("Rango: [%.2f - %.2f], Media: %.2f", min, max, prom)
        );
    }
}
```

## 4. Colecciones Inmutables

### La Filosofía de Colecciones en Vavr

Las colecciones de Vavr son **persistentes** e **inmutables**:
- **Inmutables**: Una vez creadas, no cambian
- **Persistentes**: Las "modificaciones" crean nuevas versiones compartiendo estructura

```java
import io.vavr.collection.List;

List<Integer> lista1 = List.of(1, 2, 3);
List<Integer> lista2 = lista1.append(4);  // Nueva lista: [1, 2, 3, 4]

System.out.println(lista1);  // List(1, 2, 3) - sin cambios
System.out.println(lista2);  // List(1, 2, 3, 4)

// Internamente, lista2 comparte estructura con lista1 (eficiente)
```

### List: Lista Enlazada Inmutable

```java
import io.vavr.collection.List;

// Creación
List<String> vacia = List.empty();
List<Integer> numeros = List.of(1, 2, 3, 4, 5);
List<Integer> rango = List.range(1, 10);  // [1, 2, ..., 9]

// Acceso
Integer primero = numeros.head();      // 1
List<Integer> resto = numeros.tail();  // [2, 3, 4, 5]
Integer ultimo = numeros.last();       // 5
Integer enPosicion = numeros.get(2);   // 3

// "Modificaciones" (retornan nueva lista)
List<Integer> conCero = numeros.prepend(0);     // [0, 1, 2, 3, 4, 5]
List<Integer> conSeis = numeros.append(6);      // [1, 2, 3, 4, 5, 6]
List<Integer> sinPrimero = numeros.drop(1);     // [2, 3, 4, 5]
List<Integer> primerosTres = numeros.take(3);   // [1, 2, 3]
List<Integer> sinTres = numeros.remove(3);      // [1, 2, 4, 5]

// Transformaciones
List<Integer> dobles = numeros.map(n -> n * 2);
List<Integer> pares = numeros.filter(n -> n % 2 == 0);
Integer suma = numeros.fold(0, Integer::sum);
```

### Map: Diccionario Inmutable

```java
import io.vavr.collection.HashMap;
import io.vavr.collection.Map;

// Creación
Map<String, Integer> edades = HashMap.of(
    "Juan", 30,
    "María", 25,
    "Carlos", 35
);

// Acceso - retorna Option
Option<Integer> edadJuan = edades.get("Juan");  // Some(30)
Option<Integer> edadPedro = edades.get("Pedro");  // None

// Acceso con default
Integer edadODefault = edades.getOrElse("Pedro", 0);  // 0

// "Modificaciones"
Map<String, Integer> conAna = edades.put("Ana", 28);
Map<String, Integer> sinJuan = edades.remove("Juan");
Map<String, Integer> actualizado = edades.put("María", 26);

// Transformaciones
Map<String, Integer> incrementadas = edades.mapValues(e -> e + 1);

// Iteración
edades.forEach((nombre, edad) ->
    System.out.println(nombre + ": " + edad));

// Conversión a lista de tuplas
List<Tuple2<String, Integer>> lista = edades.toList();
```

### Set: Conjunto Inmutable

```java
import io.vavr.collection.HashSet;
import io.vavr.collection.Set;

// Creación
Set<String> frutas = HashSet.of("manzana", "naranja", "pera");

// Operaciones
Set<String> conUva = frutas.add("uva");
Set<String> sinPera = frutas.remove("pera");
boolean tieneManzana = frutas.contains("manzana");  // true

// Operaciones de conjuntos
Set<String> otros = HashSet.of("pera", "kiwi", "mango");
Set<String> union = frutas.union(otros);
Set<String> interseccion = frutas.intersect(otros);
Set<String> diferencia = frutas.diff(otros);
```

### Conversión entre Colecciones de Java y Vavr

```java
// Java a Vavr
java.util.List<String> javaList = Arrays.asList("a", "b", "c");
List<String> vavrList = List.ofAll(javaList);

java.util.Map<String, Integer> javaMap = new java.util.HashMap<>();
javaMap.put("uno", 1);
Map<String, Integer> vavrMap = HashMap.ofAll(javaMap);

// Vavr a Java
java.util.List<String> backToJava = vavrList.toJavaList();
java.util.Map<String, Integer> backToJavaMap = vavrMap.toJavaMap();

// Collectors para streams de Java
java.util.stream.Stream<Integer> javaStream = java.util.stream.Stream.of(1, 2, 3);
List<Integer> fromStream = javaStream.collect(List.collector());
```

### Operaciones Avanzadas con Colecciones

```java
import io.vavr.collection.List;
import io.vavr.collection.Map;

record Producto(String nombre, String categoria, double precio) {}

List<Producto> productos = List.of(
    new Producto("Laptop", "Electrónica", 999.99),
    new Producto("Mouse", "Electrónica", 29.99),
    new Producto("Camisa", "Ropa", 49.99),
    new Producto("Pantalón", "Ropa", 79.99),
    new Producto("Audífonos", "Electrónica", 149.99)
);

// Agrupar por categoría
Map<String, List<Producto>> porCategoria = productos.groupBy(Producto::categoria);

// Precio total por categoría
Map<String, Double> totalPorCategoria = productos
    .groupBy(Producto::categoria)
    .mapValues(prods -> prods.map(Producto::precio).sum().doubleValue());

// Top 3 más caros
List<Producto> topCaros = productos
    .sortBy(Producto::precio)
    .reverse()
    .take(3);

// Producto más barato de electrónica
Option<Producto> masBaratoElectronica = productos
    .filter(p -> p.categoria().equals("Electrónica"))
    .minBy(Producto::precio);

// Nombres de productos que cuestan más de $50
List<String> caros = productos
    .filter(p -> p.precio() > 50)
    .map(Producto::nombre);

// Reducción: precio total
double total = productos
    .map(Producto::precio)
    .fold(0.0, Double::sum);

// Partición: baratos vs caros
Tuple2<List<Producto>, List<Producto>> particion = productos
    .partition(p -> p.precio() < 100);
List<Producto> baratos = particion._1;
List<Producto> caros2 = particion._2;
```

## 5. Caso Práctico Final: Sistema de Gestión de Biblioteca

Veamos un ejemplo completo que integra todas las características avanzadas de Vavr.

### Modelo de Dominio

```java
import io.vavr.collection.List;
import io.vavr.collection.Map;
import io.vavr.control.*;
import io.vavr.*;

public class SistemaBiblioteca {

    // Entidades
    public record Libro(
        String isbn,
        String titulo,
        String autor,
        int añoPublicacion,
        List<String> categorias
    ) {}

    public record Usuario(
        String id,
        String nombre,
        String email,
        List<Prestamo> prestamosActivos
    ) {
        public boolean puedePedir() {
            return prestamosActivos.size() < 3;
        }
    }

    public record Prestamo(
        String id,
        Libro libro,
        Usuario usuario,
        LocalDate fechaPrestamo,
        LocalDate fechaDevolucion,
        Option<LocalDate> fechaDevuelto
    ) {
        public boolean estaVencido() {
            return fechaDevuelto.isEmpty() &&
                   LocalDate.now().isAfter(fechaDevolucion);
        }
    }

    // Errores tipados
    public sealed interface ErrorBiblioteca {
        record LibroNoEncontrado(String isbn) implements ErrorBiblioteca {}
        record UsuarioNoEncontrado(String userId) implements ErrorBiblioteca {}
        record LibroNoDisponible(String isbn, String razon) implements ErrorBiblioteca {}
        record LimitePrestamosExcedido(String userId, int limite) implements ErrorBiblioteca {}
        record PrestamoNoEncontrado(String prestamoId) implements ErrorBiblioteca {}
        record ErrorValidacion(List<String> errores) implements ErrorBiblioteca {}
    }
}
```

### Servicio con Validation

```java
public class ServicioBiblioteca {

    private Map<String, Libro> libros = HashMap.empty();
    private Map<String, Usuario> usuarios = HashMap.empty();
    private Map<String, Prestamo> prestamos = HashMap.empty();
    private Map<String, String> librosPrestados = HashMap.empty(); // isbn -> prestamoId

    // Validación de nuevo libro
    public Validation<List<String>, Libro> validarLibro(
            String isbn, String titulo, String autor, int año, List<String> categorias) {

        return Validation.combine(
            validarIsbn(isbn),
            validarTitulo(titulo),
            validarAutor(autor),
            validarAño(año),
            validarCategorias(categorias)
        ).ap(Libro::new);
    }

    private Validation<String, String> validarIsbn(String isbn) {
        if (isbn == null || !isbn.matches("^\\d{13}$")) {
            return Validation.invalid("ISBN debe tener 13 dígitos");
        }
        if (libros.containsKey(isbn)) {
            return Validation.invalid("ISBN ya registrado");
        }
        return Validation.valid(isbn);
    }

    private Validation<String, String> validarTitulo(String titulo) {
        if (titulo == null || titulo.isBlank()) {
            return Validation.invalid("Título es requerido");
        }
        return Validation.valid(titulo.trim());
    }

    private Validation<String, String> validarAutor(String autor) {
        if (autor == null || autor.isBlank()) {
            return Validation.invalid("Autor es requerido");
        }
        return Validation.valid(autor.trim());
    }

    private Validation<String, Integer> validarAño(int año) {
        int añoActual = LocalDate.now().getYear();
        if (año < 1000 || año > añoActual) {
            return Validation.invalid("Año debe estar entre 1000 y " + añoActual);
        }
        return Validation.valid(año);
    }

    private Validation<String, List<String>> validarCategorias(List<String> categorias) {
        if (categorias == null || categorias.isEmpty()) {
            return Validation.invalid("Debe tener al menos una categoría");
        }
        return Validation.valid(categorias);
    }

    // Agregar libro con validación
    public Either<ErrorBiblioteca, Libro> agregarLibro(
            String isbn, String titulo, String autor, int año, List<String> categorias) {

        return validarLibro(isbn, titulo, autor, año, categorias)
            .toEither()
            .mapLeft(ErrorBiblioteca.ErrorValidacion::new)
            .peek(libro -> libros = libros.put(isbn, libro));
    }

    // Realizar préstamo con Either
    public Either<ErrorBiblioteca, Prestamo> realizarPrestamo(String isbn, String userId) {
        return buscarLibro(isbn)
            .flatMap(libro -> verificarDisponibilidad(libro)
                .flatMap(l -> buscarUsuario(userId)
                    .flatMap(usuario -> verificarLimitePrestamos(usuario)
                        .map(u -> crearPrestamo(l, u)))));
    }

    private Either<ErrorBiblioteca, Libro> buscarLibro(String isbn) {
        return libros.get(isbn)
            .toEither(() -> new ErrorBiblioteca.LibroNoEncontrado(isbn));
    }

    private Either<ErrorBiblioteca, Libro> verificarDisponibilidad(Libro libro) {
        return librosPrestados.containsKey(libro.isbn())
            ? Either.left(new ErrorBiblioteca.LibroNoDisponible(libro.isbn(), "Ya está prestado"))
            : Either.right(libro);
    }

    private Either<ErrorBiblioteca, Usuario> buscarUsuario(String userId) {
        return usuarios.get(userId)
            .toEither(() -> new ErrorBiblioteca.UsuarioNoEncontrado(userId));
    }

    private Either<ErrorBiblioteca, Usuario> verificarLimitePrestamos(Usuario usuario) {
        return usuario.puedePedir()
            ? Either.right(usuario)
            : Either.left(new ErrorBiblioteca.LimitePrestamosExcedido(usuario.id(), 3));
    }

    private Prestamo crearPrestamo(Libro libro, Usuario usuario) {
        String prestamoId = UUID.randomUUID().toString();
        LocalDate hoy = LocalDate.now();

        Prestamo prestamo = new Prestamo(
            prestamoId,
            libro,
            usuario,
            hoy,
            hoy.plusDays(14),
            Option.none()
        );

        prestamos = prestamos.put(prestamoId, prestamo);
        librosPrestados = librosPrestados.put(libro.isbn(), prestamoId);

        return prestamo;
    }

    // Consultas con Pattern Matching
    public String reporteLibro(String isbn) {
        return Match(libros.get(isbn)).of(
            Case($Some($()), libro -> String.format(
                "📖 %s\n   Autor: %s\n   Año: %d\n   Categorías: %s\n   Estado: %s",
                libro.titulo(),
                libro.autor(),
                libro.añoPublicacion(),
                libro.categorias().mkString(", "),
                librosPrestados.containsKey(isbn) ? "Prestado" : "Disponible"
            )),
            Case($None(), "❌ Libro no encontrado: " + isbn)
        );
    }

    // Estadísticas con colecciones
    public Map<String, Long> librosPorCategoria() {
        return libros.values()
            .flatMap(Libro::categorias)
            .groupBy(c -> c)
            .mapValues(cats -> (long) cats.size());
    }

    public List<Libro> buscarPorAutor(String autor) {
        return libros.values()
            .filter(l -> l.autor().toLowerCase().contains(autor.toLowerCase()))
            .toList();
    }

    public List<Prestamo> prestamosVencidos() {
        return prestamos.values()
            .filter(Prestamo::estaVencido)
            .toList();
    }
}
```

### Uso del Sistema

```java
public class MainBiblioteca {
    public static void main(String[] args) {
        ServicioBiblioteca servicio = new ServicioBiblioteca();

        // Agregar libros con validación
        System.out.println("=== AGREGANDO LIBROS ===");

        servicio.agregarLibro(
            "9780134685991",
            "Effective Java",
            "Joshua Bloch",
            2018,
            List.of("Programación", "Java")
        ).peek(libro -> System.out.println("✅ Agregado: " + libro.titulo()))
         .peekLeft(error -> System.out.println("❌ Error: " + error));

        // Libro con datos inválidos
        servicio.agregarLibro(
            "123",  // ISBN inválido
            "",     // Título vacío
            "Autor",
            2025,   // Año futuro
            List.empty()
        ).peekLeft(error -> {
            if (error instanceof ErrorBiblioteca.ErrorValidacion ev) {
                System.out.println("❌ Errores de validación:");
                ev.errores().forEach(e -> System.out.println("   • " + e));
            }
        });

        // Realizar préstamo
        System.out.println("\n=== PRÉSTAMOS ===");

        servicio.realizarPrestamo("9780134685991", "user001")
            .fold(
                error -> Match(error).of(
                    Case($(instanceOf(ErrorBiblioteca.LibroNoEncontrado.class)),
                        e -> "Libro no encontrado: " + e.isbn()),
                    Case($(instanceOf(ErrorBiblioteca.UsuarioNoEncontrado.class)),
                        e -> "Usuario no encontrado: " + e.userId()),
                    Case($(instanceOf(ErrorBiblioteca.LibroNoDisponible.class)),
                        e -> "Libro no disponible: " + e.razon()),
                    Case($(), e -> "Error: " + e)
                ),
                prestamo -> "✅ Préstamo creado: " + prestamo.id() +
                           "\n   Devolver antes de: " + prestamo.fechaDevolucion()
            );

        // Reportes
        System.out.println("\n=== REPORTES ===");
        System.out.println(servicio.reporteLibro("9780134685991"));

        System.out.println("\nLibros por categoría:");
        servicio.librosPorCategoria()
            .forEach((cat, count) -> System.out.println("  " + cat + ": " + count));
    }
}
```

## 6. Resumen de Buenas Prácticas

### Validation

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Usar para formularios con múltiples campos | Para un solo campo (usar Either) |
| `combine().ap()` para crear objetos | Encadenar con flatMap (pierde acumulación) |
| Errores tipados y estructurados | Strings genéricos |
| `fold()` para procesar resultado | `.get()` sin verificar |

### Pattern Matching

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Siempre incluir caso default `$()` | Dejar casos sin cubrir |
| Casos específicos antes que genéricos | Orden incorrecto (nunca se alcanzan) |
| Extraer lógica compleja a métodos | Lambdas enormes en Case |
| Usar con Option, Either, Try | Para lógica que un if/else maneja bien |

### Colecciones

| Hacer ✅ | Evitar ❌ |
|----------|-----------|
| Preferir colecciones de Vavr en APIs nuevas | Mezclar innecesariamente con Java |
| Usar operaciones encadenadas | Múltiples variables intermedias |
| `toJavaList()` solo en fronteras | Convertir constantemente |
| `Option` para accesos que pueden fallar | `get()` con índices sin verificar |

## Conclusión

Con esta sexta parte cerramos el bloque sobre las estructuras principales de Vavr. `Validation` resuelve el problema clásico de los formularios (mostrar todos los errores de una vez en lugar de uno por uno). El pattern matching hace que el código de condiciones sea más legible y difícil de dejar incompleto. Las colecciones inmutables eliminan una categoría entera de bugs relacionados con mutaciones inesperadas.

¿Vale la pena agregar Vavr a un proyecto? Depende. Si ya tienes mucho try-catch anidado o validaciones que necesitan acumular errores, el salto se amortiza rápido. Si el proyecto es pequeño o el equipo no está familiarizado con el paradigma, empezar con los opcionales y streams de Java puede ser suficiente.

La serie continúa con más conceptos de Vavr: funciones de orden superior, currying y evaluación perezosa.

---

Este artículo es parte de la serie **Programación Funcional en Java**.

📌 Gracias por acompañarme en esta serie.

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

- Artículo: *Vavr Pattern Matching*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/vavr-pattern-matching](https://www.baeldung.com/vavr-pattern-matching)

- Artículo: *Vavr Validation API*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/vavr-validation-api](https://www.baeldung.com/vavr-validation-api)

- Libro: *Functional Programming in Java, Second Edition*
    - 🖋️ Venkat Subramaniam – Pragmatic Bookshelf
