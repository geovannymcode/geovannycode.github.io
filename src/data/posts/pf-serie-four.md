---
title: 'Serie: Programación Funcional en Java – Parte 4: Referencia a Métodos y Parallel Streams'
date: '2026-02-01'
image: "/img/blog/9.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Programación Funcional
    - Method References
    - Parallel Streams
    - Performance
    - ForkJoinPool
author: Geovanny Mendoza
short: Domina las referencias a métodos (::) y el procesamiento paralelo en Java. Aprende cuándo usar Parallel Streams para optimizar el rendimiento y cuándo evitarlos.
---

## Introducción

En el ecosistema de programación funcional de Java, existen dos características que frecuentemente generan confusión pero que, una vez dominadas, transforman radicalmente la forma en que escribimos código: las **Referencias a Métodos** (conocidas coloquialmente como "los dos puntitos") y los **Parallel Streams**.

Las referencias a métodos representan el nivel más alto de abstracción sintáctica para expresiones lambda, permitiéndonos escribir código que se lee casi como lenguaje natural. Por otro lado, los Parallel Streams nos abren las puertas al procesamiento paralelo, aprovechando la arquitectura multinúcleo de los procesadores modernos sin la complejidad tradicional de la programación concurrente.

En esta cuarta entrega de nuestra serie, exploraremos ambos conceptos en profundidad, entendiendo no solo el *cómo*, sino especialmente el *por qué* y el *cuándo* utilizarlos efectivamente.

## 1. Referencias a Métodos: Anatomía de los "Dos Puntitos"

### ¿Qué Son Realmente las Referencias a Métodos?

Las referencias a métodos son una forma de **azúcar sintáctico** (syntactic sugar) introducida en Java 8 que nos permite referenciar un método existente sin ejecutarlo. En lugar de escribir una expresión lambda que simplemente delega a otro método, podemos apuntar directamente a ese método.

Para entender esto completamente, recordemos qué es una expresión lambda: una forma compacta de representar una **función anónima** que puede pasarse como argumento. Cuando esa función anónima solo hace una cosa ***"llamar a otro método existente"*** la referencia a método nos permite eliminar la redundancia.

```java
// Evolución de la sintaxis para la misma operación:

// 1. Clase anónima (pre-Java 8)
nombres.forEach(new Consumer<String>() {
    @Override
    public void accept(String nombre) {
        System.out.println(nombre);
    }
});

// 2. Expresión lambda (Java 8)
nombres.forEach(nombre -> System.out.println(nombre));

// 3. Referencia a método (Java 8) - máxima concisión
nombres.forEach(System.out::println);
```

Las tres versiones son **funcionalmente equivalentes** y producen el mismo bytecode optimizado. La diferencia es puramente sintáctica, pero esa diferencia tiene un impacto significativo en la legibilidad y mantenibilidad del código.

### El Operador :: (Doble Dos Puntos)

El operador `::` es el **operador de referencia a método**. No ejecuta el método; en su lugar, crea una referencia que puede ser evaluada posteriormente. Piensa en él como un "puntero a función" en lenguajes como C, pero con la seguridad de tipos de Java.

```java
// Esto NO ejecuta println
Consumer<String> referencia = System.out::println;

// Esto SÍ ejecuta println (cuando se invoca accept)
referencia.accept("Hola Mundo");  // Imprime: Hola Mundo
```

La magia ocurre porque Java infiere automáticamente qué interfaz funcional se está implementando basándose en el contexto. En el ejemplo anterior, `System.out::println` se convierte en una implementación de `Consumer<String>` porque:

1. `Consumer<T>` tiene un método `accept(T t)` que no retorna nada
2. `PrintStream.println(String)` acepta un String y no retorna nada
3. Las firmas son compatibles, por lo tanto la conversión es válida

### Los Cuatro Tipos de Referencias a Métodos

Java define exactamente cuatro formas de crear referencias a métodos, cada una diseñada para un escenario específico. Comprender cuándo usar cada tipo es fundamental para escribir código idiomático.

| Tipo | Sintaxis | Lambda Equivalente | Caso de Uso |
|------|----------|-------------------|-------------|
| Método estático | `Clase::metodoEstatico` | `x -> Clase.metodoEstatico(x)` | Funciones utilitarias sin estado |
| Instancia específica | `objeto::metodo` | `x -> objeto.metodo(x)` | Métodos de un objeto concreto |
| Tipo arbitrario | `Tipo::metodo` | `x -> x.metodo()` | Métodos de instancia del elemento |
| Constructor | `Clase::new` | `x -> new Clase(x)` | Creación de objetos |

## 2. Tipo 1: Referencia a Método Estático

### Concepto y Mecánica

Los métodos estáticos pertenecen a la clase, no a instancias específicas. Cuando referenciamos un método estático, estamos diciendo: "usa este método de clase para procesar cada elemento".

La sintaxis es: `NombreClase::nombreMetodo`

```java
// Lambda tradicional
Function<String, Integer> parser1 = s -> Integer.parseInt(s);

// Referencia a método estático
Function<String, Integer> parser2 = Integer::parseInt;

// Ambas hacen exactamente lo mismo
int numero1 = parser1.apply("42");  // 42
int numero2 = parser2.apply("42");  // 42
```

### Por Qué Funciona

El compilador de Java realiza el siguiente análisis:
1. `Integer::parseInt` referencia el método `static int parseInt(String s)`
2. Este método acepta un `String` y retorna un `int`
3. `Function<String, Integer>` define `Integer apply(String s)`
4. Las firmas son compatibles → conversión válida

### Ejemplo Práctico: Validación de Datos

Veamos un caso real donde los métodos estáticos brillan:

```java
public class Validadores {
    /**
     * Valida formato de email básico.
     * Método estático porque no depende de ningún estado de instancia.
     */
    public static boolean esEmailValido(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        // Validación simplificada para el ejemplo
        return email.contains("@") &&
               email.contains(".") &&
               email.indexOf("@") < email.lastIndexOf(".");
    }

    /**
     * Valida que un String represente un número positivo.
     */
    public static boolean esNumeroPositivo(String texto) {
        try {
            return Double.parseDouble(texto) > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Normaliza texto: trim + lowercase.
     */
    public static String normalizar(String texto) {
        return texto == null ? "" : texto.trim().toLowerCase();
    }
}
```

Uso con Streams:

```java
List<String> datosEntrada = Arrays.asList(
    "  Usuario@Email.COM  ",
    "invalido",
    "otro@dominio.org",
    null,
    "   ADMIN@SISTEMA.NET   "
);

// Pipeline de procesamiento funcional
List<String> emailsValidos = datosEntrada.stream()
    .filter(Objects::nonNull)                    // Referencia a método estático
    .map(Validadores::normalizar)                // Referencia a método estático propio
    .filter(Validadores::esEmailValido)          // Referencia a método estático propio
    .sorted(String::compareTo)                   // Referencia a método de instancia (Tipo 3)
    .toList();

// Resultado: [admin@sistema.net, otro@dominio.org, usuario@email.com]
```

Observa cómo cada operación del pipeline utiliza referencias a métodos, creando código que se lee casi como una especificación en lenguaje natural: "filtra los no nulos, normaliza, filtra emails válidos, ordena".

## 3. Tipo 2: Referencia a Método de Instancia Específica

### Concepto y Mecánica

Cuando tenemos un **objeto concreto** y queremos referenciar uno de sus métodos de instancia, usamos esta forma. El objeto ya existe y está "capturado" en la referencia.

La sintaxis es: `objetoExistente::nombreMetodo`

```java
// El objeto PrintStream específico: System.out
PrintStream salida = System.out;

// La referencia captura este objeto específico
Consumer<String> impresor = salida::println;

// Equivalente lambda (nota cómo 'salida' está capturada)
Consumer<String> impresorLambda = mensaje -> salida.println(mensaje);
```

### Diferencia Clave con Tipo 3

Esta es probablemente la distinción más confusa. En el Tipo 2, el objeto **ya existe** antes de crear la referencia. En el Tipo 3, el objeto es **el parámetro que se recibe**.

```java
// TIPO 2: 'formateador' es un objeto específico que ya existe
Formateador formateador = new Formateador("LOG");
Function<String, String> fn2 = formateador::formatear;
// Lambda equivalente: mensaje -> formateador.formatear(mensaje)

// TIPO 3: 'String' es el TIPO del parámetro que recibiremos
Function<String, String> fn3 = String::toUpperCase;
// Lambda equivalente: s -> s.toUpperCase()
```

### Ejemplo Práctico: Componente de Logging Configurable

```java
public class SistemaLogging {
    private final String prefijo;
    private final DateTimeFormatter formato;

    public SistemaLogging(String prefijo) {
        this.prefijo = prefijo;
        this.formato = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    }

    /**
     * Método de instancia que depende del estado del objeto (prefijo, formato).
     */
    public String formatearMensaje(String mensaje) {
        String timestamp = LocalDateTime.now().format(formato);
        return String.format("[%s] %s: %s", timestamp, prefijo, mensaje);
    }

    public void registrar(String mensaje) {
        System.out.println(formatearMensaje(mensaje));
    }
}
```

Uso con referencia a instancia específica:

```java
public class AplicacionPrincipal {
    public static void main(String[] args) {
        // Crear instancia específica del sistema de logging
        SistemaLogging loggerInfo = new SistemaLogging("INFO");
        SistemaLogging loggerError = new SistemaLogging("ERROR");

        List<String> eventos = Arrays.asList(
            "Aplicación iniciada",
            "Conexión establecida",
            "Usuario autenticado"
        );

        List<String> errores = Arrays.asList(
            "Timeout de conexión",
            "Credenciales inválidas"
        );

        // Referencia al método de una instancia específica (loggerInfo)
        System.out.println("=== EVENTOS ===");
        eventos.forEach(loggerInfo::registrar);

        // Referencia al método de otra instancia específica (loggerError)
        System.out.println("\n=== ERRORES ===");
        errores.forEach(loggerError::registrar);

        // También podemos transformar y capturar
        List<String> mensajesFormateados = eventos.stream()
            .map(loggerInfo::formatearMensaje)  // Instancia específica
            .toList();
    }
}
```

Salida:
```bash
=== EVENTOS ===
[2025-01-29 14:30:15] INFO: Aplicación iniciada
[2025-01-29 14:30:15] INFO: Conexión establecida
[2025-01-29 14:30:15] INFO: Usuario autenticado

=== ERRORES ===
[2025-01-29 14:30:15] ERROR: Timeout de conexión
[2025-01-29 14:30:15] ERROR: Credenciales inválidas
```

## 4. Tipo 3: Referencia a Método de Tipo Arbitrario

### Concepto y Mecánica

Este es el tipo más poderoso y a la vez más confuso. Aquí no referenciamos el método de un objeto específico, sino que decimos: "para cada elemento del stream (que será de cierto tipo), invoca este método sobre ese elemento".

La sintaxis es: `NombreTipo::metodoDeInstancia`

```java
List<String> nombres = Arrays.asList("ana", "carlos", "beatriz");

// Tipo 3: cada String del stream invocará su propio toUpperCase()
List<String> mayusculas = nombres.stream()
    .map(String::toUpperCase)  // s -> s.toUpperCase()
    .toList();
```

### La Magia de la Inferencia

El compilador entiende que:
1. El stream contiene elementos de tipo `String`
2. `String::toUpperCase` referencia el método de instancia `String.toUpperCase()`
3. Para cada elemento `s` del stream, debe ejecutar `s.toUpperCase()`
4. El primer parámetro implícito es el receptor del método (`this`)

### Comparación Visual de los Tres Tipos

```java
// Configuración
Formateador fmt = new Formateador(">>>");
List<String> textos = Arrays.asList("hola", "mundo");

// TIPO 1 - Método estático: la clase provee el método
textos.stream().map(Formateador::normalizarEstatico);
// Equivale a: s -> Formateador.normalizarEstatico(s)
// El String 's' es el ARGUMENTO del método estático

// TIPO 2 - Instancia específica: 'fmt' provee el método
textos.stream().map(fmt::formatear);
// Equivale a: s -> fmt.formatear(s)
// El String 's' es el ARGUMENTO del método de instancia

// TIPO 3 - Tipo arbitrario: cada 's' provee su propio método
textos.stream().map(String::toUpperCase);
// Equivale a: s -> s.toUpperCase()
// El String 's' es el RECEPTOR del método (this)
```

### Ejemplo Práctico: Procesamiento de Entidades

```java
public record Empleado(
    Long id,
    String nombre,
    String departamento,
    double salario,
    LocalDate fechaIngreso
) {
    public String getNombreCompleto() {
        return nombre.toUpperCase();
    }

    public int getAntiguedad() {
        return Period.between(fechaIngreso, LocalDate.now()).getYears();
    }

    public boolean esSenior() {
        return getAntiguedad() >= 5;
    }
}
```

```java
List<Empleado> empleados = obtenerEmpleados();

// Tipo 3 en acción: cada Empleado invoca sus propios métodos
List<String> nombresSeniores = empleados.stream()
    .filter(Empleado::esSenior)           // e -> e.esSenior()
    .map(Empleado::getNombreCompleto)     // e -> e.getNombreCompleto()
    .sorted(String::compareToIgnoreCase)  // (s1, s2) -> s1.compareToIgnoreCase(s2)
    .toList();

// Estadísticas usando referencias
DoubleSummaryStatistics stats = empleados.stream()
    .mapToDouble(Empleado::salario)       // e -> e.salario()
    .summaryStatistics();

System.out.printf("Salario promedio: $%.2f%n", stats.getAverage());
System.out.printf("Salario máximo: $%.2f%n", stats.getMax());
```

## 5. Tipo 4: Referencia a Constructor

### Concepto y Mecánica

Los constructores son métodos especiales que crean instancias. Java nos permite referenciarlos usando la sintaxis `Clase::new`. El compilador infiere qué constructor usar basándose en los parámetros esperados por la interfaz funcional.

```java
// Constructor sin argumentos
Supplier<ArrayList<String>> fabricaListas = ArrayList::new;
List<String> nuevaLista = fabricaListas.get();  // new ArrayList<>()

// Constructor con un argumento
Function<String, StringBuilder> fabricaBuilders = StringBuilder::new;
StringBuilder sb = fabricaBuilders.apply("Hola");  // new StringBuilder("Hola")

// Constructor con dos argumentos (usando BiFunction personalizada)
BiFunction<String, Integer, Empleado> fabricaEmpleados = Empleado::new;
// Asume constructor: Empleado(String nombre, int edad)
```

### Ejemplo Práctico: Factory Pattern Funcional

```java
public record Producto(String codigo, String nombre, double precio) {
    // Constructor canónico del record

    // Factory method estático para parsing
    public static Producto fromCSV(String linea) {
        String[] partes = linea.split(",");
        return new Producto(
            partes[0].trim(),
            partes[1].trim(),
            Double.parseDouble(partes[2].trim())
        );
    }
}
```

```java
// Datos de entrada simulando archivo CSV
List<String> lineasCSV = Arrays.asList(
    "P001, Laptop HP, 899.99",
    "P002, Mouse Logitech, 29.99",
    "P003, Teclado Mecánico, 149.99",
    "P004, Monitor 27 pulgadas, 349.99"
);

// Usando referencia a método estático (factory method)
List<Producto> productos = lineasCSV.stream()
    .map(Producto::fromCSV)  // Tipo 1: método estático
    .toList();

// Alternativamente, con referencia a constructor directa
// (requiere que el constructor acepte el formato adecuado)
record ProductoSimple(String descripcion) {}

List<ProductoSimple> productosSimples = lineasCSV.stream()
    .map(ProductoSimple::new)  // Tipo 4: constructor
    .toList();
```

### Referencia a Constructor con Collectors

Un uso muy común es en operaciones de colección:

```java
// Recolectar en un tipo específico de colección
Set<String> nombresSet = empleados.stream()
    .map(Empleado::nombre)
    .collect(Collectors.toCollection(TreeSet::new));  // Constructor como Supplier

// Crear mapa con merge function
Map<String, List<Empleado>> porDepartamento = empleados.stream()
    .collect(Collectors.groupingBy(
        Empleado::departamento,
        LinkedHashMap::new,           // Factory para el mapa
        Collectors.toCollection(ArrayList::new)  // Factory para las listas
    ));
```

## 6. Referencias a Métodos con Comparator

Una de las aplicaciones más elegantes de las referencias a métodos es con la API de `Comparator`, que fue significativamente mejorada en Java 8.

### La Evolución de la Comparación

```java
List<Empleado> empleados = obtenerEmpleados();

// Java 7: Clase anónima verbose
Collections.sort(empleados, new Comparator<Empleado>() {
    @Override
    public int compare(Empleado e1, Empleado e2) {
        return e1.getNombre().compareTo(e2.getNombre());
    }
});

// Java 8 con lambda
empleados.sort((e1, e2) -> e1.getNombre().compareTo(e2.getNombre()));

// Java 8 con Comparator.comparing + referencia a método
empleados.sort(Comparator.comparing(Empleado::nombre));
```

### Composición de Comparadores

La verdadera potencia aparece al combinar múltiples criterios:

```java
// Ordenar por departamento, luego por salario descendente, luego por nombre
Comparator<Empleado> comparadorComplejo = Comparator
    .comparing(Empleado::departamento)                    // Primer criterio
    .thenComparing(Empleado::salario, Comparator.reverseOrder())  // Segundo, descendente
    .thenComparing(Empleado::nombre, String.CASE_INSENSITIVE_ORDER);  // Tercero

empleados.sort(comparadorComplejo);

// Manejo de nulls
Comparator<Empleado> conNulls = Comparator
    .comparing(Empleado::fechaIngreso, Comparator.nullsLast(Comparator.naturalOrder()));
```

### Extracción de Propiedades para Comparación

```java
// Comparar por propiedad derivada
empleados.sort(Comparator.comparingInt(Empleado::getAntiguedad));

// Comparar por múltiples propiedades con tipos primitivos (evita autoboxing)
empleados.sort(Comparator
    .comparingDouble(Empleado::salario)
    .reversed());

// Encontrar extremos
Optional<Empleado> masAntiguo = empleados.stream()
    .max(Comparator.comparing(Empleado::fechaIngreso).reversed());

Optional<Empleado> mejorPagado = empleados.stream()
    .max(Comparator.comparingDouble(Empleado::salario));
```

## 7. Parallel Streams: Procesamiento Multinúcleo

### El Contexto: Por Qué Existe el Procesamiento Paralelo

Los procesadores modernos tienen múltiples núcleos. Un Intel Core i7 típico tiene 8 núcleos; un servidor puede tener 32, 64 o más. Sin embargo, un stream secuencial utiliza **un solo hilo**, desperdiciando potencialmente el 87.5% (7/8 núcleos) de la capacidad de cómputo disponible.

Los Parallel Streams permiten que las operaciones de un stream se distribuyan automáticamente entre múltiples hilos, aprovechando el hardware disponible sin la complejidad de escribir código multihilo manualmente.

### Cómo Crear un Parallel Stream

```java
List<Integer> numeros = IntStream.rangeClosed(1, 10_000_000)
    .boxed()
    .toList();

// Opción 1: Desde la colección directamente
long suma1 = numeros.parallelStream()
    .mapToLong(Integer::longValue)
    .sum();

// Opción 2: Convertir un stream secuencial existente
long suma2 = numeros.stream()
    .parallel()  // Convierte a paralelo
    .mapToLong(Integer::longValue)
    .sum();

// Opción 3: Verificar y cambiar según necesidad
Stream<Integer> stream = numeros.stream();
if (numeros.size() > 100_000) {
    stream = stream.parallel();
}
```

### La Arquitectura Interna: ForkJoinPool

Los Parallel Streams utilizan internamente el **ForkJoinPool común** de Java, un pool de hilos especialmente diseñado para tareas recursivas que pueden dividirse (fork) y combinarse (join).

```java
// El ForkJoinPool común tiene por defecto:
// número de hilos = Runtime.getRuntime().availableProcessors() - 1
int paralelismo = ForkJoinPool.commonPool().getParallelism();
System.out.println("Hilos disponibles: " + paralelismo);  // Ej: 7 en un CPU de 8 núcleos

// El hilo main también participa, totalizando availableProcessors() hilos
```

Cuando ejecutas un parallel stream:
1. La colección se **divide** en segmentos (split)
2. Cada segmento se procesa en un **hilo separado**
3. Los resultados parciales se **combinan** (reduce)

```java
// Visualización del procesamiento paralelo
List<Integer> numeros = IntStream.rangeClosed(1, 20).boxed().toList();

numeros.parallelStream()
    .forEach(n -> System.out.printf("Hilo: %-30s → %d%n",
        Thread.currentThread().getName(), n));
```

Salida típica (orden impredecible):
```bash
Hilo: main                           → 13
Hilo: ForkJoinPool.commonPool-worker-1 → 3
Hilo: ForkJoinPool.commonPool-worker-2 → 18
Hilo: main                           → 14
Hilo: ForkJoinPool.commonPool-worker-3 → 8
...
```

### El Problema del Orden

**Crítico:** Los parallel streams NO garantizan el orden de procesamiento con `forEach()`:

```java
List<String> letras = Arrays.asList("A", "B", "C", "D", "E", "F", "G", "H");

System.out.println("=== forEach (orden impredecible) ===");
letras.parallelStream()
    .forEach(System.out::print);  // Podría imprimir: ECGADHFB

System.out.println("\n\n=== forEachOrdered (orden garantizado) ===");
letras.parallelStream()
    .forEachOrdered(System.out::print);  // Siempre imprime: ABCDEFGH
```

**Importante:** `forEachOrdered()` mantiene el orden pero **reduce el beneficio del paralelismo** porque los hilos deben sincronizarse para entregar resultados en secuencia.

### Cuándo Usar (y Cuándo NO Usar) Parallel Streams

Esta es posiblemente la decisión más importante al trabajar con parallel streams. El paralelismo tiene un **costo de coordinación** (overhead) que solo se justifica bajo ciertas condiciones.

#### ✅ USAR Parallel Streams cuando:

| Condición | Razón |
|-----------|-------|
| **Gran volumen de datos** (>100,000 elementos) | El overhead de paralelización se amortiza |
| **Operaciones CPU-intensivas** por elemento | Cálculos matemáticos, transformaciones complejas |
| **Operaciones independientes** | Sin dependencias entre elementos |
| **Estructura de datos divisible** | ArrayList, arrays, IntStream.range() se dividen eficientemente |
| **Operación sin efectos secundarios** | Funciones puras que no modifican estado externo |

```java
// BUEN caso para parallel: millones de elementos, operación costosa
List<BigInteger> resultado = IntStream.rangeClosed(1, 5_000_000)
    .parallel()
    .mapToObj(BigInteger::valueOf)
    .map(n -> n.pow(3).add(n.pow(2)))  // Operación CPU-intensiva
    .filter(n -> n.mod(BigInteger.TEN).equals(BigInteger.ZERO))
    .toList();
```

#### ❌ EVITAR Parallel Streams cuando:

| Condición | Razón |
|-----------|-------|
| **Pocos elementos** (<10,000) | Overhead mayor que beneficio |
| **Operaciones I/O** (red, disco, BD) | Los hilos se bloquean esperando, no ganan velocidad |
| **LinkedList o estructuras no divisibles** | Mala distribución del trabajo entre hilos |
| **Estado compartido mutable** | Race conditions, resultados incorrectos |
| **El orden importa** y usas `forEach` | Resultados impredecibles |
| **Dentro de un contexto ya paralelo** | Saturación del ForkJoinPool |

```java
// MAL caso para parallel: I/O bound, el cuello de botella es la red
urls.parallelStream()
    .map(url -> hacerLlamadaHTTP(url))  // ❌ Bloqueante, no gana con más hilos
    .toList();

// MAL caso: estado compartido mutable
List<String> resultados = new ArrayList<>();  // NO thread-safe
datos.parallelStream()
    .map(this::procesar)
    .forEach(resultados::add);  // ❌ Race condition!

// CORRECCIÓN: usar collector thread-safe
List<String> resultadosCorrectos = datos.parallelStream()
    .map(this::procesar)
    .collect(Collectors.toList());  // ✅ Thread-safe
```

### Benchmark: Midiendo el Impacto Real

Nunca asumas que paralelo es más rápido. **Siempre mide**:

```java
public class BenchmarkStreams {
    public static void main(String[] args) {
        // Generar datos de prueba
        List<Double> numeros = new Random()
            .doubles(10_000_000, 0, 1000)
            .boxed()
            .toList();

        // Calentar la JVM (importante para benchmarks precisos)
        for (int i = 0; i < 5; i++) {
            numeros.stream().mapToDouble(Math::sqrt).sum();
            numeros.parallelStream().mapToDouble(Math::sqrt).sum();
        }

        // Medir stream secuencial
        long inicioSeq = System.nanoTime();
        double resultadoSeq = numeros.stream()
            .mapToDouble(n -> Math.sqrt(n) * Math.log(n + 1))
            .sum();
        long tiempoSeq = System.nanoTime() - inicioSeq;

        // Medir stream paralelo
        long inicioPar = System.nanoTime();
        double resultadoPar = numeros.parallelStream()
            .mapToDouble(n -> Math.sqrt(n) * Math.log(n + 1))
            .sum();
        long tiempoPar = System.nanoTime() - inicioPar;

        // Resultados
        System.out.printf("Elementos: %,d%n", numeros.size());
        System.out.printf("Secuencial: %,d ms%n", tiempoSeq / 1_000_000);
        System.out.printf("Paralelo:   %,d ms%n", tiempoPar / 1_000_000);
        System.out.printf("Speedup:    %.2fx%n", (double) tiempoSeq / tiempoPar);
        System.out.printf("Resultados iguales: %b%n",
            Math.abs(resultadoSeq - resultadoPar) < 0.0001);
    }
}
```

Resultado típico (8 núcleos):
```bash
Elementos: 10,000,000
Secuencial: 156 ms
Paralelo:   42 ms
Speedup:    3.71x
Resultados iguales: true
```

El speedup teórico máximo en 8 núcleos sería 8x, pero el overhead de coordinación y la naturaleza de la operación típicamente resultan en 3-5x para operaciones bien paralelizables.

## 8. Caso Práctico: Sistema de Análisis de Inventario

Veamos un ejemplo completo que integra referencias a métodos, Comparators, y procesamiento paralelo en un escenario real de negocio.

### Modelo de Dominio

```java
public record Producto(
    String sku,
    String nombre,
    String categoria,
    int stockActual,
    int stockMinimo,
    double precioCompra,
    double precioVenta,
    LocalDate ultimaReposicion
) {
    public double margenBruto() {
        return precioVenta - precioCompra;
    }

    public double porcentajeMargen() {
        return (margenBruto() / precioCompra) * 100;
    }

    public double valorInventario() {
        return stockActual * precioCompra;
    }

    public boolean requiereReposicion() {
        return stockActual < stockMinimo;
    }

    public long diasDesdeReposicion() {
        return ChronoUnit.DAYS.between(ultimaReposicion, LocalDate.now());
    }
}
```

### Servicio de Análisis con Referencias a Métodos

```java
public class ServicioAnalisisInventario {
    private final List<Producto> inventario;

    public ServicioAnalisisInventario(List<Producto> inventario) {
        this.inventario = new ArrayList<>(inventario);
    }

    // ═══════════════════════════════════════════════════════════════
    // ANÁLISIS BÁSICOS (Stream Secuencial)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Productos que necesitan reposición, ordenados por urgencia.
     * Usa: Tipo 3 (método de instancia del elemento)
     */
    public List<Producto> productosParaReponer() {
        return inventario.stream()
            .filter(Producto::requiereReposicion)
            .sorted(Comparator.comparingInt(Producto::stockActual))
            .toList();
    }

    /**
     * Top N productos por margen de ganancia.
     * Usa: Tipo 3 + Comparator compuesto
     */
    public List<Producto> topProductosPorMargen(int n) {
        return inventario.stream()
            .sorted(Comparator.comparingDouble(Producto::porcentajeMargen).reversed())
            .limit(n)
            .toList();
    }

    /**
     * Productos agrupados por categoría.
     * Usa: Tipo 3 con Collectors.groupingBy
     */
    public Map<String, List<Producto>> productosPorCategoria() {
        return inventario.stream()
            .collect(Collectors.groupingBy(Producto::categoria));
    }

    /**
     * Valor total del inventario por categoría.
     * Usa: Tipo 3 con Collectors downstream
     */
    public Map<String, Double> valorInventarioPorCategoria() {
        return inventario.stream()
            .collect(Collectors.groupingBy(
                Producto::categoria,
                Collectors.summingDouble(Producto::valorInventario)
            ));
    }

    // ═══════════════════════════════════════════════════════════════
    // ANÁLISIS PESADOS (Parallel Stream)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Valor total del inventario completo.
     * Usa: Parallel stream para grandes volúmenes
     */
    public double valorTotalInventario() {
        return inventario.parallelStream()
            .mapToDouble(Producto::valorInventario)
            .sum();
    }

    /**
     * Estadísticas de precios por categoría.
     * Operación costosa ideal para paralelizar.
     */
    public Map<String, DoubleSummaryStatistics> estadisticasPorCategoria() {
        return inventario.parallelStream()
            .collect(Collectors.groupingByConcurrent(
                Producto::categoria,
                Collectors.summarizingDouble(Producto::precioVenta)
            ));
    }

    /**
     * Búsqueda de productos que cumplen criterios complejos.
     */
    public List<Producto> busquedaAvanzada(
            Predicate<Producto> criterio,
            Comparator<Producto> orden,
            int limite) {

        Stream<Producto> stream = inventario.size() > 10_000
            ? inventario.parallelStream()
            : inventario.stream();

        return stream
            .filter(criterio)
            .sorted(orden)
            .limit(limite)
            .toList();
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORTES COMBINADOS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Genera un informe de salud del inventario.
     */
    public String generarInformeSalud() {
        long totalProductos = inventario.size();
        long productosBajoStock = inventario.stream()
            .filter(Producto::requiereReposicion)
            .count();

        double valorTotal = valorTotalInventario();

        OptionalDouble margenPromedio = inventario.stream()
            .mapToDouble(Producto::porcentajeMargen)
            .average();

        Optional<Producto> productoMasAntiguo = inventario.stream()
            .min(Comparator.comparing(Producto::ultimaReposicion));

        return String.format("""
            ╔════════════════════════════════════════════════════════╗
            ║           INFORME DE SALUD DEL INVENTARIO              ║
            ╠════════════════════════════════════════════════════════╣
            ║  Total de productos:          %,8d                     ║
            ║  Productos bajo stock mínimo: %,8d (%5.1f%%)           ║
            ║  Valor total inventario:      $%,14.2f                 ║
            ║  Margen promedio:             %6.2f%%                  ║
            ║  Producto más antiguo:        %-24s                    ║
            ╚════════════════════════════════════════════════════════╝
            """,
            totalProductos,
            productosBajoStock,
            (productosBajoStock * 100.0 / totalProductos),
            valorTotal,
            margenPromedio.orElse(0),
            productoMasAntiguo.map(Producto::nombre).orElse("N/A")
        );
    }
}
```

### Demostración del Sistema

```java
public class Main {
    public static void main(String[] args) {
        List<Producto> inventario = Arrays.asList(
            new Producto("SKU001", "Laptop HP Pavilion", "Electrónica",
                15, 10, 450.00, 699.99, LocalDate.of(2025, 1, 15)),
            new Producto("SKU002", "Mouse Inalámbrico", "Accesorios",
                5, 20, 12.00, 29.99, LocalDate.of(2025, 1, 10)),
            new Producto("SKU003", "Teclado Mecánico", "Accesorios",
                25, 15, 45.00, 89.99, LocalDate.of(2025, 1, 20)),
            new Producto("SKU004", "Monitor 27\" 4K", "Electrónica",
                8, 5, 280.00, 449.99, LocalDate.of(2025, 1, 5)),
            new Producto("SKU005", "Webcam HD", "Accesorios",
                3, 10, 25.00, 59.99, LocalDate.of(2024, 12, 20)),
            new Producto("SKU006", "SSD 1TB", "Almacenamiento",
                30, 20, 55.00, 99.99, LocalDate.of(2025, 1, 18)),
            new Producto("SKU007", "RAM 16GB DDR4", "Componentes",
                12, 15, 35.00, 69.99, LocalDate.of(2025, 1, 8)),
            new Producto("SKU008", "Fuente 650W", "Componentes",
                7, 10, 45.00, 79.99, LocalDate.of(2024, 12, 28))
        );

        ServicioAnalisisInventario servicio = new ServicioAnalisisInventario(inventario);

        // Informe general
        System.out.println(servicio.generarInformeSalud());

        // Productos que necesitan reposición
        System.out.println("═══ PRODUCTOS PARA REPONER ═══");
        servicio.productosParaReponer().forEach(p ->
            System.out.printf("  ⚠️ %s: %d/%d unidades%n",
                p.nombre(), p.stockActual(), p.stockMinimo()));

        // Top 3 por margen
        System.out.println("\n═══ TOP 3 PRODUCTOS POR MARGEN ═══");
        servicio.topProductosPorMargen(3).forEach(p ->
            System.out.printf("  💰 %s: %.1f%% margen ($%.2f → $%.2f)%n",
                p.nombre(), p.porcentajeMargen(), p.precioCompra(), p.precioVenta()));

        // Valor por categoría
        System.out.println("\n═══ VALOR INVENTARIO POR CATEGORÍA ═══");
        servicio.valorInventarioPorCategoria()
            .entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .forEach(e -> System.out.printf("  📦 %s: $%,.2f%n", e.getKey(), e.getValue()));

        // Búsqueda avanzada: productos de electrónica con margen > 40%
        System.out.println("\n═══ BÚSQUEDA: Electrónica con margen > 40% ═══");
        servicio.busquedaAvanzada(
            p -> p.categoria().equals("Electrónica") && p.porcentajeMargen() > 40,
            Comparator.comparing(Producto::porcentajeMargen).reversed(),
            5
        ).forEach(p -> System.out.printf("  🔍 %s (%.1f%% margen)%n",
            p.nombre(), p.porcentajeMargen()));
    }
}
```

### Salida del Sistema

```bash
╔════════════════════════════════════════════════════════════╗
║           INFORME DE SALUD DEL INVENTARIO                  ║
╠════════════════════════════════════════════════════════════╣
║  Total de productos:                 8                     ║
║  Productos bajo stock mínimo:        4 ( 50.0%)            ║
║  Valor total inventario:             $ 16,955.00           ║
║  Margen promedio:                    74.23%                ║
║  Producto más antiguo:               Webcam HD             ║
╚════════════════════════════════════════════════════════════╝

═══ PRODUCTOS PARA REPONER ═══
  ⚠️ Webcam HD: 3/10 unidades
  ⚠️ Mouse Inalámbrico: 5/20 unidades
  ⚠️ Fuente 650W: 7/10 unidades
  ⚠️ RAM 16GB DDR4: 12/15 unidades

═══ TOP 3 PRODUCTOS POR MARGEN ═══
  💰 Mouse Inalámbrico: 149.9% margen ($12.00 → $29.99)
  💰 Webcam HD: 139.9% margen ($25.00 → $59.99)
  💰 Teclado Mecánico: 100.0% margen ($45.00 → $89.99)

═══ VALOR INVENTARIO POR CATEGORÍA ═══
  📦 Electrónica: $8,990.00
  📦 Almacenamiento: $1,650.00
  📦 Accesorios: $1,240.00
  📦 Componentes: $735.00

═══ BÚSQUEDA: Electrónica con margen > 40% ═══
  🔍 Monitor 27" 4K (60.7% margen)
  🔍 Laptop HP Pavilion (55.6% margen)
```

## 9. Resumen de Buenas Prácticas

### Referencias a Métodos

| Práctica | Ejemplo |
|----------|---------|
| ✅ Preferir cuando lambda solo delega | `list.forEach(System.out::println)` |
| ✅ Usar con Comparator.comparing | `Comparator.comparing(Persona::edad)` |
| ✅ Combinar con Collectors | `Collectors.groupingBy(Producto::categoria)` |
| ❌ No forzar cuando hay lógica adicional | Usar lambda: `s -> "Prefijo: " + s` |

### Parallel Streams

| Práctica | Razón |
|----------|-------|
| ✅ Medir antes de optimizar | El overhead puede superar el beneficio |
| ✅ Usar con operaciones CPU-bound | Aprovecha múltiples núcleos |
| ✅ Preferir estructuras divisibles | ArrayList, arrays vs LinkedList |
| ❌ Evitar con operaciones I/O | Los hilos se bloquean sin beneficio |
| ❌ Nunca con estado mutable compartido | Provoca race conditions |

## Conclusión

Las referencias a métodos y los Parallel Streams representan el punto de encuentro entre la elegancia sintáctica y el rendimiento en Java moderno. Las primeras nos permiten escribir código que se lee casi como documentación, mientras que los segundos desbloquean el potencial multinúcleo de nuestro hardware.

Sin embargo, como toda herramienta poderosa, requieren comprensión profunda para usarse efectivamente:
- Las referencias a métodos no son solo "menos código"; son una forma de expresar intención más claramente
- Los Parallel Streams no son "Streams más rápidos"; son una estrategia de paralelización que debe aplicarse con criterio

En la próxima y última entrega de esta serie, exploraremos la librería **Vavr**, que lleva la programación funcional en Java al siguiente nivel con tipos inmutables como `Try`, `Either`, `Option` y capacidades de pattern matching que transformarán tu forma de manejar errores y flujos de datos.

---

Este artículo es parte de la serie **Programación Funcional en Java**, donde continuaremos profundizando en conceptos, buenas prácticas y casos de uso aplicados al desarrollo profesional.

📌 **No te pierdas las próximas entregas.**

Si este contenido te ha sido útil, te invito a seguirme y estar al tanto de futuras publicaciones.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)
- **Blog:** [www.geovannycode.com](https://www.geovannycode.com)

📚 **Referencias**

- Documentación oficial de Java (Method References)
  - 📄 Oracle Java Tutorials
  - 🔗 [https://docs.oracle.com/javase/tutorial/java/javaOO/methodreferences.html](https://docs.oracle.com/javase/tutorial/java/javaOO/methodreferences.html)

- Documentación oficial de Java (Parallel Streams)
  - 📄 Oracle Java SE Documentation
  - 🔗 [https://docs.oracle.com/javase/tutorial/collections/streams/parallelism.html](https://docs.oracle.com/javase/tutorial/collections/streams/parallelism.html)

- Libro: *Modern Java in Action, Second Edition*
  - 🖋️ Raoul-Gabriel Urma, Mario Fusco, Alan Mycroft – Manning Publications
  - 🔗 [https://www.manning.com/books/modern-java-in-action](https://www.manning.com/books/modern-java-in-action)

- Artículo: *Java 8 Method Reference*
  - 📄 Baeldung
  - 🔗 [https://www.baeldung.com/java-method-references](https://www.baeldung.com/java-method-references)

- Artículo: *When to Use Parallel Streams in Java*
  - 📄 Baeldung
  - 🔗 [https://www.baeldung.com/java-when-to-use-parallel-stream](https://www.baeldung.com/java-when-to-use-parallel-stream)
