---
title: 'Serie: Programación Funcional en Java – Parte 7: Vavr - Funciones, Currying y Evaluación Perezosa'
date: '2026-04-17'
image: "/img/blog/17.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Programación Funcional
    - Vavr
    - Currying
    - Funciones de Orden Superior
author: Geovanny Mendoza
short: Explora las interfaces funcionales de Vavr, desde Function0 hasta Function8. Aprende qué es el currying, cómo se usa la aplicación parcial y cómo la evaluación perezosa con memoización puede mejorar el rendimiento de tu código.
---

## Introducción

Hasta ahora en esta serie hemos trabajado con los tipos de control de Vavr (`Option`, `Try`, `Either`, `Validation`) y sus colecciones inmutables. En esta entrega cambiamos de ángulo y miramos las funciones de Vavr: cómo las define la librería, en qué se diferencian de las interfaces funcionales de Java, y qué conceptos como el currying o la evaluación perezosa añaden a tu caja de herramientas.

Si vienes del mundo Java puro, probablemente conoces `Function<T, R>`, `BiFunction<T, U, R>` y `Supplier<T>`. Vavr lleva esa idea más lejos con un sistema que va de `Function0` a `Function8`, soporta currying, aplicación parcial y composición de forma nativa.

## 1. Function0 a Function8: más allá de Function y BiFunction

### El problema de las interfaces funcionales de Java

Java estándar proporciona `Function` (un parámetro de entrada), `BiFunction` (dos parámetros) y nada más. Si necesitas una función que reciba tres o cuatro parámetros, tienes que crear tu propia interfaz funcional o reescribir el código de otra manera.

```java
// Java: Function recibe uno, BiFunction recibe dos
Function<Integer, Integer> incrementar = x -> x + 1;
BiFunction<Integer, Integer, Integer> sumar = (a, b) -> a + b;

// ¿Y si necesito tres parámetros? No hay TriFunction en Java estándar
// Toca definirla a mano o reestructurar el código
@FunctionalInterface
interface TriFunction<A, B, C, R> {
    R apply(A a, B b, C c);
}
```

### Las funciones de Vavr

Vavr define `Function0` hasta `Function8`. El número indica cuántos parámetros de entrada recibe la función:

```java
import io.vavr.Function0;
import io.vavr.Function1;
import io.vavr.Function2;
import io.vavr.Function3;

// Function0: sin parámetros, solo retorna un valor (equivalente a Supplier)
Function0<String> saludo = () -> "Hola desde Vavr";
String resultado = saludo.apply();
System.out.println(resultado);  // "Hola desde Vavr"

// Function1: un parámetro de entrada (equivalente a Function<T, R>)
Function1<Integer, Integer> doble = x -> x * 2;
System.out.println(doble.apply(5));  // 10

// Function2: dos parámetros (equivalente a BiFunction<T, U, R>)
Function2<Integer, Integer, Integer> sumar = (a, b) -> a + b;
System.out.println(sumar.apply(3, 4));  // 7

// Function3: tres parámetros (sin equivalente en Java estándar)
Function3<String, String, Integer, String> formatearUsuario =
    (nombre, email, edad) -> nombre + " | " + email + " | " + edad;

String info = formatearUsuario.apply("Ana", "ana@ejemplo.com", 30);
System.out.println(info);  // "Ana | ana@ejemplo.com | 30"
```

La convención es simple: `FunctionN<T1, T2, ..., TN, R>` donde los primeros N tipos son los parámetros y el último es el retorno.

### Composición de funciones

Al igual que las interfaces de Java, las funciones de Vavr soportan composición con `andThen` y `compose`:

```java
Function1<Integer, Integer> multiplicarPorDos = x -> x * 2;
Function1<Integer, Integer> sumarDiez = x -> x + 10;

// andThen: primero aplica multiplicarPorDos, luego sumarDiez
Function1<Integer, Integer> multiplicarYSumar = multiplicarPorDos.andThen(sumarDiez);
System.out.println(multiplicarYSumar.apply(5));  // (5 * 2) + 10 = 20

// compose: primero aplica sumarDiez, luego multiplicarPorDos
Function1<Integer, Integer> sumarYMultiplicar = multiplicarPorDos.compose(sumarDiez);
System.out.println(sumarYMultiplicar.apply(5));  // (5 + 10) * 2 = 30
```

Esto encaja con el estilo funcional: defines funciones pequeñas y las combinas para construir lógica más compleja.

## 2. Currying: funciones que esperan sus argumentos uno a uno

### Qué es el currying

El currying transforma una función que recibe varios argumentos en una cadena de funciones que reciben un argumento cada una. En lugar de llamar a `sumar(3, 4)`, llamas a `sumar(3)(4)`.

Puede sonar complicado, pero la idea práctica es más simple: te permite "preconfigurar" una función con algunos de sus argumentos y obtener una nueva función que espera los restantes.

```java
Function2<Integer, Integer, Integer> sumar = (a, b) -> a + b;

// Aplicar currying: convierte la función en Function1<Integer, Function1<Integer, Integer>>
Function1<Integer, Function1<Integer, Integer>> sumarCurried = sumar.curried();

// Primer llamado: le pasas el primer argumento y obtienes una función que espera el segundo
Function1<Integer, Integer> sumarCinco = sumarCurried.apply(5);

// Segundo llamado: completas la función
System.out.println(sumarCinco.apply(3));   // 8
System.out.println(sumarCinco.apply(10));  // 15
System.out.println(sumarCinco.apply(100)); // 105
```

`sumarCinco` es una función que ya tiene fijo el primer operando (5) y espera el segundo. Puedes reutilizarla cuantas veces quieras.

### Cuándo tiene sentido

El currying sirve cuando tienes un argumento que se repite en muchas llamadas. En lugar de pasarlo siempre, lo fijas una vez y usas la función resultante.

**Ejemplo: conversión de monedas**

Imagina que tu sistema siempre trabaja con pesos mexicanos como moneda origen y necesitas convertir montos a otras divisas:

```java
// Función que convierte un monto de una moneda a otra
Function3<String, String, Double, String> convertirMoneda =
    (origen, destino, monto) -> {
        double tasaDeCambio = obtenerTasa(origen, destino);
        double resultado = monto * tasaDeCambio;
        return String.format("%.2f %s", resultado, destino);
    };

// Curry: fijar "MXN" como moneda origen
Function1<String, Function1<Double, String>> desdePesosMexicanos =
    convertirMoneda.curried().apply("MXN");

// Ahora puedes crear conversores específicos sin repetir "MXN"
Function1<Double, String> pesosADolares = desdePesosMexicanos.apply("USD");
Function1<Double, String> pesosAEuros   = desdePesosMexicanos.apply("EUR");

System.out.println(pesosADolares.apply(1000.0));  // "50.00 USD" (aprox.)
System.out.println(pesosAEuros.apply(1000.0));    // "46.00 EUR" (aprox.)
System.out.println(pesosADolares.apply(5000.0));  // "250.00 USD"
```

**Ejemplo: usuario fijo durante una petición HTTP**

Si tu sistema tiene un usuario autenticado que persiste durante toda una petición, puedes pre-fijar ese usuario en las funciones que lo necesitan:

```java
Function2<Usuario, Pedido, Confirmacion> procesarPedido =
    (usuario, pedido) -> {
        validarPermisos(usuario);
        return crearConfirmacion(usuario, pedido);
    };

// Al inicio del request, fijamos el usuario autenticado
Function1<Pedido, Confirmacion> procesarPedidoDelUsuario =
    procesarPedido.curried().apply(usuarioActual);

// En el resto del código ya no repetimos el usuario
Confirmacion conf1 = procesarPedidoDelUsuario.apply(pedido1);
Confirmacion conf2 = procesarPedidoDelUsuario.apply(pedido2);
```

## 3. Aplicación parcial

La aplicación parcial es similar al currying pero más flexible: puedes fijar cualquier subconjunto de argumentos, no necesariamente en orden.

```java
Function3<Integer, Integer, Integer, Integer> calcularDescuento =
    (precio, porcentaje, limiteMaximo) -> {
        int descuento = precio * porcentaje / 100;
        return Math.min(descuento, limiteMaximo);
    };

// Aplicación parcial: fijar el precio y el porcentaje, dejar libre el límite
Function1<Integer, Integer> descuentoPrecio100Con20Porciento =
    calcularDescuento.apply(100, 20);

System.out.println(descuentoPrecio100Con20Porciento.apply(50));  // 20 (min entre 20 y 50)
System.out.println(descuentoPrecio100Con20Porciento.apply(10));  // 10 (min entre 20 y 10)
```

En la práctica, currying y aplicación parcial resuelven el mismo problema: evitar repetir argumentos que no cambian entre llamadas. Cuál usar depende de qué resulte más claro en cada contexto.

## 4. Lazy: evaluación perezosa con memoización

### El problema de la evaluación anticipada

En Java, cuando llamas a un método o asignas un valor, la evaluación ocurre de inmediato. A veces eso tiene un costo innecesario, especialmente si el valor resultante puede no usarse o si calcularlo es costoso (consulta a base de datos, llamada HTTP, cálculo pesado).

```java
// Esto evalúa calcularReporteComplejo() inmediatamente, aunque luego no se use
ConfiguracionReporte config = calcularReporteComplejo();

// Si más adelante decides que el reporte no es necesario, ya gastaste el tiempo
if (condicional) {
    mostrar(config);
}
```

### Lazy: calcula solo cuando hace falta

`Lazy<T>` de Vavr envuelve un cálculo que se ejecuta **la primera vez que se pide el valor** y luego lo recuerda. Las llamadas posteriores devuelven el resultado ya calculado sin volver a ejecutar el código.

```java
import io.vavr.Lazy;

// El cálculo NO ocurre aquí, solo se define qué calcular
Lazy<Integer> valorComplejo = Lazy.of(() -> {
    System.out.println("Calculando...");
    return realizarCalculo();  // Operación costosa
});

System.out.println("Antes de pedir el valor");
Integer resultado = valorComplejo.get();  // "Calculando..." aparece aquí
System.out.println("Resultado: " + resultado);

Integer mismoResultado = valorComplejo.get();  // No imprime "Calculando..." de nuevo
System.out.println("Mismo resultado: " + mismoResultado);
```

Salida:
```
Antes de pedir el valor
Calculando...
Resultado: 42
Mismo resultado: 42
```

El cálculo ocurre una sola vez, sin importar cuántas veces llames a `get()`. Eso lo hace útil cuando tienes un valor que puede usarse varias veces pero cuya obtención es costosa.

### Lazy es thread-safe

Internamente, `Lazy` usa un mecanismo de bloqueo para asegurarse de que en entornos multi-hilo solo un thread calcule el valor:

```java
// Varios threads pueden llamar a get() sin problema
// El cálculo ocurre exactamente una vez
Lazy<ConexionBaseDatos> conexion = Lazy.of(() ->
    ConexionBaseDatos.conectar(config)
);

// Thread 1
executor.submit(() -> System.out.println(conexion.get()));
// Thread 2
executor.submit(() -> System.out.println(conexion.get()));
// Solo un thread ejecuta el método conectar(), el otro espera y usa el mismo resultado
```

### Casos de uso reales para Lazy

**Configuración que se carga una sola vez:**

```java
public class ConfiguracionApp {

    // No se carga hasta que alguien la pide por primera vez
    private static final Lazy<Properties> propiedades = Lazy.of(() -> {
        Properties props = new Properties();
        try (var stream = ConfiguracionApp.class.getResourceAsStream("/app.properties")) {
            props.load(stream);
        } catch (IOException e) {
            throw new RuntimeException("No se pudo cargar la configuración", e);
        }
        return props;
    });

    public static String obtener(String clave) {
        return propiedades.get().getProperty(clave);
    }
}

// Uso: el archivo se lee solo en el primer acceso
String host = ConfiguracionApp.obtener("db.host");
String puerto = ConfiguracionApp.obtener("db.port");  // No vuelve a leer el archivo
```

**Cache de resultados costosos por request:**

```java
public class ProcesadorPedido {

    private final Lazy<DatosCliente> datosClienteLazy;

    public ProcesadorPedido(String clienteId) {
        // Definimos cómo obtener los datos, pero no los pedimos todavía
        this.datosClienteLazy = Lazy.of(() -> repositorioCliente.buscar(clienteId));
    }

    public void procesarPedido(Pedido pedido) {
        // Los datos del cliente se buscan aquí por primera vez (o se reutilizan si ya se buscaron)
        DatosCliente cliente = datosClienteLazy.get();
        validar(pedido, cliente);
        confirmar(pedido, cliente);
    }

    public void enviarNotificacion(Pedido pedido) {
        // Reutiliza los datos sin ir de nuevo a la base de datos
        DatosCliente cliente = datosClienteLazy.get();
        notificar(cliente.email(), "Tu pedido fue confirmado");
    }
}
```

### Lazy vs Optional: diferencia de intención

Aunque ambos pueden estar "vacíos", representan cosas distintas:

- `Optional<T>`: el valor puede o no existir
- `Lazy<T>`: el valor existe pero se calcula cuando se necesita

No los intercambies. `Lazy` no es para manejar ausencia de valores, sino para diferir un cálculo.

## 5. Caso práctico: sistema de reportes con funciones y lazy

Veamos cómo encajan estas piezas en un escenario real: un generador de reportes donde los datos pueden ser costosos de obtener y la misma función de formato se aplica a distintas categorías.

```java
import io.vavr.*;
import io.vavr.collection.List;
import io.vavr.control.Try;

public class GeneradorReportes {

    // Función de formato: recibe categoría y datos, retorna el reporte formateado
    private final Function2<String, List<Venta>, String> formatearReporte =
        (categoria, ventas) -> {
            double total = ventas.map(Venta::monto).fold(0.0, Double::sum);
            return String.format(
                "Categoría: %s | Ventas: %d | Total: $%.2f",
                categoria, ventas.size(), total
            );
        };

    // Currying: fija la categoría para crear un formateador especializado
    public Function1<List<Venta>, String> crearFormateador(String categoria) {
        return formatearReporte.curried().apply(categoria);
    }

    // Lazy: las ventas se cargan una sola vez por instancia de GeneradorReportes
    private final Lazy<List<Venta>> todasLasVentas;

    public GeneradorReportes(VentaRepository repo) {
        this.todasLasVentas = Lazy.of(() -> {
            System.out.println("Cargando ventas desde la base de datos...");
            return List.ofAll(repo.findAll());
        });
    }

    public String generarReportePorCategoria(String categoria) {
        // Obtiene las ventas (con lazy, solo carga una vez aunque llamemos varias veces)
        List<Venta> ventas = todasLasVentas.get()
            .filter(v -> v.categoria().equals(categoria));

        // Usa el formateador con currying
        Function1<List<Venta>, String> formateador = crearFormateador(categoria);
        return formateador.apply(ventas);
    }

    public void generarReportesMultiples(List<String> categorias) {
        // "Cargando ventas..." aparece solo la primera vez
        categorias.forEach(cat ->
            System.out.println(generarReportePorCategoria(cat))
        );
    }
}

record Venta(String categoria, double monto) {}

// Uso
GeneradorReportes generador = new GeneradorReportes(repo);

// Primera llamada: carga las ventas
generador.generarReportesMultiples(List.of("Electrónica", "Ropa", "Alimentos"));
// Salida:
// Cargando ventas desde la base de datos...
// Categoría: Electrónica | Ventas: 45 | Total: $67,890.50
// Categoría: Ropa | Ventas: 23 | Total: $4,560.00
// Categoría: Alimentos | Ventas: 78 | Total: $2,345.20

// Segunda llamada: reutiliza los datos cargados
String reporte = generador.generarReportePorCategoria("Electrónica");
// (No imprime "Cargando ventas..." de nuevo)
```

## 6. Composición de funciones en pipelines funcionales

Las funciones de Vavr se pueden combinar para armar pipelines donde cada paso transforma el resultado del anterior:

```java
// Funciones individuales pequeñas
Function1<String, String> limpiar = String::trim;
Function1<String, String> normalizar = String::toLowerCase;
Function1<String, Boolean> esEmailValido = s -> s.matches("^[^@]+@[^@]+\\.[^@]+$");
Function1<Boolean, String> formatearResultado = valido ->
    valido ? "Email válido" : "Email inválido";

// Componer: limpiar → normalizar → validar → formatear
Function1<String, String> procesarEmail = limpiar
    .andThen(normalizar)
    .andThen(esEmailValido)
    .andThen(formatearResultado);

System.out.println(procesarEmail.apply("  Usuario@EJEMPLO.COM  "));  // "Email válido"
System.out.println(procesarEmail.apply("  no-es-email  "));          // "Email inválido"
```

Cada función hace una sola cosa. El pipeline es legible: se lee de izquierda a derecha y cada paso tiene un nombre que explica qué hace. Añadir un nuevo paso es cuestión de agregar otro `andThen`.

## Resumen

| Concepto | Qué resuelve | Cuándo usarlo |
|---|---|---|
| `Function0`-`Function8` | Falta de interfaces funcionales para más de 2 parámetros en Java | Cuando necesitas funciones con 3 o más argumentos |
| Currying | Repetir el mismo argumento en múltiples llamadas | Argumentos que se fijan al inicio (usuario, moneda, contexto) |
| Aplicación parcial | Similar al currying pero sin necesidad de hacerlo en orden | Cuando quieres fijar argumentos no consecutivos |
| Composición | Encadenar funciones sin variables intermedias | Pipelines de transformación de datos |
| `Lazy<T>` | Calcular un valor solo cuando se necesita, una sola vez | Cálculos costosos, configuración, caché por request |

---

Este artículo es parte de la serie **Programación Funcional en Java**. En la siguiente entrega veremos Railway Oriented Programming con Vavr: cómo diseñar APIs funcionales donde los errores fluyen de forma controlada a través de un pipeline, sin excepciones ni lógica de bifurcación explícita.

📌 Nos vemos en la siguiente entrega.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Documentación oficial de Vavr
    - 📄 Vavr User Guide — Functions
    - 🔗 [https://docs.vavr.io/#_functions](https://docs.vavr.io/#_functions)

- Repositorio GitHub de Vavr
    - 📄 vavr-io/vavr
    - 🔗 [https://github.com/vavr-io/vavr](https://github.com/vavr-io/vavr)

- Artículo: *Vavr Currying and Partial Application*
    - 📄 Baeldung
    - 🔗 [https://www.baeldung.com/vavr](https://www.baeldung.com/vavr)

- Libro: *Functional Programming in Java, Second Edition*
    - 🖋️ Venkat Subramaniam – Pragmatic Bookshelf
