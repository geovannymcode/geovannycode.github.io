---
#preview
title: 'Principios SOLID en Java'
date: '2026-01-17'
image: "/img/blog/4.png"
categories:
    - Backend
    - Arquitectura
tags:
    - Java
    - SOLID
    - Clean Code
    - OOP
    - Arquitectura
author: Geovanny Mendoza
short: Guía práctica de los principios SOLID en Java, manteniendo el contenido original y agregando versiones actualizadas de los ejemplos para Java 21+.
---

- Single-responsibility principle (Principio de responsabilidad única)
- Open-closed principle (Principio de abierto/cerrado)
- Liskov substitution principle (Principio de sustitución de Liskov)
- Interface segregation principle (Principio de segregación de interfaces)
- Dependency inversion principle (Principio de inversión de dependencias)

Suena científico, ¿verdad? Pero en realidad, es algo muy simple en el mundo de la programación. Estos principios, popularizados por Robert C. Martin, se centran en la programación orientada a objetos. Ahora veamos en qué consisten estos principios.

## Principio de Responsabilidad Única

Cada clase debe tener solo una razón para cambiar.

Definir una “razón” para cambiar puede ser complicado y a veces genera confusión. Generalmente, está relacionado con roles específicos que tienen los usuarios. Por ejemplo, imaginemos que estamos desarrollando una aplicación para expertos financieros. Estos usuarios necesitan informes, pero claramente un contador y un director financiero (CFO) requerirán informes y gráficos diferentes, aunque ambos necesiten ‘informes’. Así, parece prudente no consolidar la funcionalidad de generación de informes en una única clase Reporte, ya que necesitaría cambiar por diferentes razones según el usuario.

Otro ejemplo claro es la separación entre los datos y su representación. Por lo general, cambian por razones distintas, lo cual justifica desacoplar la capa de consulta de la capa de representación, una práctica que es el estándar de facto en la industria hoy en día.

Veamos un ejemplo hipotético y simplificado que ilustra este concepto en un contexto Java:

```java
public class CuentaResource {
    private final Usuario usuario;

    public CuentaResource(Usuario usuario) {
        this.usuario = usuario;
    }

    public Map<String, Object> toMap() {
        var transaccionesPopulares = usuario.getTransacciones().stream()
            .filter(t -> t.getConteoLikes() > 50 && t.getConteoCompartidos() > 25)
            .sorted(Comparator.comparingInt(Transaccion::getVisitas).reversed())
            .limit(10)
            .toList();

        return Map.of(
            "id", usuario.getId(),
            "nombre_completo", usuario.getNombreCompleto(),
            "transacciones_populares", transaccionesPopulares
        );
    }
}
```
Este código mezcla la representación de los datos y la lógica de consulta en una sola clase, lo que puede ser problemático. Por ejemplo, si se solicita un cambio en la definición de ‘transacciones populares’, intuitivamente no deberíamos tener que modificar CuentaResource.

La solución a este problema es separar las responsabilidades:

```java
public class CuentaResource {
    private final Usuario usuario;

    public CuentaResource(Usuario usuario) {
        this.usuario = usuario;
    }

    public Map<String, Object> toMap() {
        return Map.of(
            "id", usuario.getId(),
            "nombre_completo", usuario.getNombreCompleto(),
            "transacciones_populares", usuario.obtenerTransaccionesPopulares()
        );
    }
}

public class Usuario {
    public List<Transaccion> obtenerTransaccionesPopulares() {
        return this.getTransacciones().stream()
            .filter(t -> t.getConteoLikes() > 50 && t.getConteoCompartidos() > 25)
            .sorted(Comparator.comparingInt(Transaccion::getVisitas).reversed())
            .limit(10)
            .toList();
    }
}
```

Esto permite que `CuentaResource` se enfoque únicamente en la representación, mientras que Usuario maneja la lógica de consulta específica. Esto cumple con el Principio de Responsabilidad Única, ya que cada clase ahora tiene una sola razón para cambiar.

Indicadores de que estás violando el **`SRP`** incluyen:

- Consultas de base de datos en clases de representación o de datos simples.
- Modelos que despachan trabajos o comandos, acoplando indebidamente lógica de negocio y procesos.
- Dependencias inapropiadas, como una clase de modelo que maneja solicitudes HTTP.
El objetivo es mantener las clases enfocadas y cohesivas, minimizando las razones para cambiar y facilitando el mantenimiento del código.

## Principio Abierto-Cerrado

Una clase debe estar abierta para la extensión, pero cerrada para la modificación.

Este principio puede parecer un poco abstracto al principio, pero se clarifica con ejemplos prácticos.

Supongamos que estamos trabajando en una aplicación bancaria que gestiona `cuentas`, ```transacciones``` y ```usuarios```. Los usuarios pueden realizar operaciones como depositar y retirar dinero, lo que implementamos inicialmente en la clase Cuenta. Pero ahora, también queremos permitir que los usuarios puedan bloquear y desbloquear sus cuentas para seguridad adicional. Tenemos dos opciones:

- Copiar las funcionalidades relacionadas con el bloqueo en la clase `Cuenta`.
- Implementar una interfaz genérica que pueda ser utilizada en cualquier modelo.

Obviamente, preferimos la segunda opción. Esto podría verse así:

```java
interface Bloqueable {
    void bloquear();
    void desbloquear();
    boolean estaBloqueada();
}

final class Cuenta implements Bloqueable {
    private boolean bloqueada;

    @Override public void bloquear() { bloqueada = true; }
    @Override public void desbloquear() { bloqueada = false; }
    @Override public boolean estaBloqueada() { return bloqueada; }
}
```

Digamos que ahora necesitamos añadir la funcionalidad de tarjetas de crédito al app, y claro, los usuarios querrán poder bloquear y desbloquear sus tarjetas también. Así lo hacemos:

```java
final class TarjetaCredito implements Bloqueable {
    private boolean bloqueada;

    @Override public void bloquear() { bloqueada = true; }
    @Override public void desbloquear() { bloqueada = false; }
    @Override public boolean estaBloqueada() { return bloqueada; }
}
```

¡Esto es bastante estándar, pero piensa en lo que ocurrió aquí! Acabamos de añadir nueva funcionalidad a múltiples clases sin cambiarlas. Extendimos nuestras clases en lugar de modificarlas. Esto es una gran ventaja a largo plazo y es por eso que la programación orientada a interfaces y el polimorfismo en general son herramientas increíbles.

Vamos a ver otro ejemplo que utiliza polimorfismo e interfaces. Imagina que estamos trabajando en una aplicación que maneja diferentes tipos de cuentas bancarias. Algunas cuentas tienen intereses, otras tienen beneficios por transacciones múltiples, etc. Aquí está la estructura simplificada:

```java
public sealed abstract class TipoCuenta
        permits CuentaAhorro, CuentaCheques, CuentaBonificada {

    public abstract double calcularInteres(double saldo);
}

public final class CuentaAhorro extends TipoCuenta {
    @Override
    public double calcularInteres(double saldo) {
        return saldo * 0.02; // 2% de interés
    }
}

public final class CuentaCheques extends TipoCuenta {
    @Override
    public double calcularInteres(double saldo) {
        // No genera intereses
        return 0;
    }
}

public final class CuentaBonificada extends TipoCuenta {
    private final int transacciones;

    public CuentaBonificada(int transacciones) {
        this.transacciones = transacciones;
    }

    @Override
    public double calcularInteres(double saldo) {
        // Bonificación por transacciones
        return transacciones > 100 ? saldo * 0.05 : 0;
    }
}
```

Estas clases pueden calcular el interés de una cuenta según su tipo. Necesitamos una forma de crear estas clases fácilmente. Aquí es donde el patrón de diseño ***“fábrica”*** puede ser útil:

```java
class FabricaTipoCuenta {
    public TipoCuenta crearTipoCuenta(String tipo, int transacciones) {
        return switch (tipo) {
            case "ahorro" -> new CuentaAhorro();
            case "cheques" -> new CuentaCheques();
            case "bonificada" -> new CuentaBonificada(transacciones);
            default -> throw new IllegalArgumentException("Tipo de cuenta desconocido");
        };
    }
}
```

¿Ves lo que hicimos? Eliminamos la necesidad de modificar las clases existentes cada vez que surgen nuevos requisitos. En su lugar, extendemos nuestras clases con nuevas funcionalidades. Todo lo que necesitábamos era una fábrica, algunas clases estratégicas y un poco de polimorfismo.

## Principio de Sustitución de Liskov

Cada clase base debe poder ser reemplazada por sus subclases.

Aunque parece obvio, este es uno de los principios más fundamentales y, a veces, uno de los más complicados de aplicar correctamente. El principio establece que si tienes una clase base y algunas subclases, deberías poder reemplazar la clase base con cualquiera de sus subclases dentro de tu aplicación sin ningún problema.

Veamos un ejemplo relacionado con el procesamiento de transacciones en un sistema bancario:

```java
abstract class ProcesadorDePagos {
    public abstract void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException;
}

final class ProcesadorVisa extends ProcesadorDePagos {
    @Override
    public void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException {
        if (monto > cuenta.getSaldo()) {
            throw new ProcesamientoPagoException("Fondos insuficientes");
        }
        cuenta.decrementarSaldo(monto);
    }
}

final class ProcesadorMastercard extends ProcesadorDePagos {
    @Override
    public void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException {
        double montoConComision = monto * 1.1;
        if (montoConComision > cuenta.getSaldo()) {
            throw new ProcesamientoPagoException("Fondos insuficientes, incluida la comisión");
        }
        cuenta.decrementarSaldo(montoConComision);
    }
}
```

En el ejemplo anterior, aunque `ProcesadorVisa` y `ProcesadorMastercard` parecen cumplir con la interfaz definida por `ProcesadorDePagos`, hay una discrepancia importante en cómo manejan las comisiones y los cheques de fondos. Esto podría llevar a problemas si se espera que cualquier `ProcesadorDePagos` maneje la cuenta de la misma manera.

#### Corrección del diseño para cumplir con Liskov: 

Para asegurarnos de que cumplimos con el principio de Liskov, es fundamental que todas las subclases manejen las operaciones de manera coherente. Esto puede significar centralizar o estandarizar cómo se manejan las comisiones o asegurarse de que las comprobaciones y efectos son transparentes y consistentes entre subclases.

```java
abstract class ProcesadorDePagos {
    public abstract void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException;

    protected final void verificarFondos(Cuenta cuenta, double monto) throws ProcesamientoPagoException {
        if (monto > cuenta.getSaldo()) {
            throw new ProcesamientoPagoException("Fondos insuficientes");
        }
    }
}

final class ProcesadorVisa extends ProcesadorDePagos {
    @Override
    public void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException {
        verificarFondos(cuenta, monto);
        cuenta.decrementarSaldo(monto);
    }
}

final class ProcesadorMastercard extends ProcesadorDePagos {
    @Override
    public void procesarPago(Cuenta cuenta, double monto) throws ProcesamientoPagoException {
        double montoConComision = monto * 1.1;
        verificarFondos(cuenta, montoConComision);
        cuenta.decrementarSaldo(montoConComision);
    }
}
```

Acá podemos observar que ambas clases de `ProcesadorDePagos` utilizan un método común para verificar los fondos antes de proceder con el decremento del saldo. Este enfoque garantiza que el comportamiento de verificación sea consistente y previsible a través de diferentes implementaciones.

Como puedes ver, el principio es bastante simple en teoría, pero en la práctica es fácil cometer errores que lo violen. Asegurarse de que las subclases puedan sustituir a la clase base sin efectos secundarios requiere una atención cuidadosa al diseño de tu sistema. Esta atención asegura que las funcionalidades extendidas se integren sin problemas y sin introducir incompatibilidades o comportamientos inesperados.

Vamos a traducir y adaptar el `Principio de Segregación` de Interfaces al contexto de Java, utilizando un ejemplo relacionado con el ámbito bancario para que sea más comprensible y útil para los lectores.

## Principio de Segregación de Interfaces

Este principio sugiere que deberíamos tener muchas interfaces pequeñas en lugar de unas pocas grandes. La idea original es que ningún código debería verse obligado a depender de métodos que no utiliza, pero la implicación práctica es justo la definición que te he dado. Honestamente, este es uno de los principios más fáciles de seguir.

Supongamos que estamos trabajando en una aplicación bancaria que maneja cuentas, transacciones, informes de usuarios y cálculos fiscales. Podríamos pensar en crear una clase genérica como Cuenta, y tratar de manejar todo con métodos en esta clase. Así, tendríamos algo como:

```java
interface Cuenta {
    void procesarTransaccion(double monto);
    void calcularImpuestos();
    void generarInforme();
}
```

Puedes ver el problema aquí. Esta interfaz es demasiado grande. Maneja demasiadas cosas que son independientes entre sí. En lugar de escribir una interfaz enorme para manejar todo, separamos estas responsabilidades en interfaces más pequeñas:

```java
interface Transaccionable {
    void procesarTransaccion(double monto);
}

interface ImpuestoCalculable {
    void calcularImpuestos();
}

interface InformeGenerable {
    void generarInforme();
}
```

Estas interfaces son ejemplos de cómo podemos aplicar el Principio de Segregación de Interfaces en el desarrollo de software, asegurando que las clases que implementan estas interfaces no se vean forzadas a implementar métodos que no necesitan, manteniendo así el código más limpio, modular y fácil de mantener.

Veamos un ejemplo más concreto:

```java
// Implementación de una Cuenta Corriente que procesa transacciones y calcula impuestos.
final class CuentaCorriente implements Transaccionable, ImpuestoCalculable {
    private double saldo;

    public CuentaCorriente(double saldoInicial) {
        this.saldo = saldoInicial;
    }

    @Override
    public void procesarTransaccion(double monto) {
        this.saldo += monto;
        System.out.println("Transacción procesada. Saldo actual: " + this.saldo);
    }

    @Override
    public void calcularImpuestos() {
        double impuesto = this.saldo * 0.003;
        System.out.println("Impuestos calculados: " + impuesto);
    }
}

// Implementación de una Cuenta de Ahorros que procesa transacciones y genera informes.
final class CuentaDeAhorros implements Transaccionable, InformeGenerable {
    private double saldo;

    public CuentaDeAhorros(double saldoInicial) {
        this.saldo = saldoInicial;
    }

    @Override
    public void procesarTransaccion(double monto) {
        this.saldo += monto;
        System.out.println("Transacción procesada en cuenta de ahorros. Saldo actual: " + this.saldo);
    }

    @Override
    public void generarInforme() {
        System.out.println("Informe generado para la cuenta con saldo: " + this.saldo);
    }
}
```

En este diseño, las clases `CuentaCorriente` y `CuentaDeAhorros` implementan específicamente aquellas interfaces que son esenciales para sus operaciones. Por ejemplo, la `CuentaCorriente` maneja cálculos de impuestos, una necesidad para cuentas que frecuentemente procesan transacciones comerciales, mientras que la `CuentaDeAhorros` está equipada para generar informes sobre el crecimiento de los ahorros, lo cual no es necesario en una `CuentaCorriente`.

Este enfoque de segregación de interfaces asegura que cada clase solo contenga los métodos que realmente utiliza, evitando la inclusión de funcionalidades innecesarias. Al dividir las responsabilidades de esta manera, el sistema no solo se vuelve más limpio y mantenible, sino también más intuitivo y escalable. Permite a los desarrolladores, ya sean novatos o con experiencia, comprender rápidamente la estructura del sistema y facilita la incorporación de nuevas características o adaptaciones a los cambios en los requisitos.

## Principio de Inversión de Dependencias

Depende de abstracciones, no de concreciones.

Este principio sugiere que debemos utilizar clases abstractas o interfaces en nuestras dependencias en lugar de clases concretas. Así, si cambiamos la implementación subyacente, no necesitaremos modificar las clases que dependen de estas abstracciones.

Veamos cómo podríamos aplicar esto en un sistema bancario que necesita interactuar con diferentes tipos de servicios de consulta de crédito para evaluar la solvencia de los clientes:

```java
// Interfaz para proveedores de datos de crédito
interface ProveedorDatosCredito {
    double obtenerPuntuacionCredito(String idCliente);
}

// Implementación concreta para un proveedor de datos de crédito
final class EquifaxProveedor implements ProveedorDatosCredito {
    @Override
    public double obtenerPuntuacionCredito(String idCliente) {
        return 650.0; // Simulación de una respuesta
    }
}

// Implementación concreta para otro proveedor de datos de crédito
final class TransUnionProveedor implements ProveedorDatosCredito {
    @Override
    public double obtenerPuntuacionCredito(String idCliente) {
        return 700.0; // Simulación de una respuesta
    }
}
```

En el sistema bancario, en lugar de codificar directamente contra una implementación específica (como EquifaxProveedor o TransUnionProveedor), dependemos de la interfaz ProveedorDatosCredito. Esto nos permite cambiar fácilmente de proveedor sin alterar las clases que utilizan esta interfaz:

```java
// Clase que actúa como controlador para evaluar el crédito de los clientes.
class EvaluacionCreditoController {
    // La clase controladora depende de la interfaz ProveedorDatosCredito, no de una implementación específica.
    private ProveedorDatosCredito proveedorDatos;

    // Constructor que inyecta cualquier clase que implemente ProveedorDatosCredito.
    // Esto permite cambiar fácilmente entre diferentes proveedores de datos de crédito sin cambiar el código del controlador.
    public EvaluacionCreditoController(ProveedorDatosCredito proveedor) {
        this.proveedorDatos = proveedor;
    }

    // Método para evaluar el crédito de un cliente, utiliza la interfaz para obtener la puntuación de crédito.
    public void evaluarCreditoCliente(String idCliente) {
        // Llama al método obtenerPuntuacionCredito definido en la interfaz, ejecutado por la instancia concreta proporcionada en el constructor.
        double puntuacion = proveedorDatos.obtenerPuntuacionCredito(idCliente);
        System.out.println("Puntuación de crédito obtenida para el cliente " + idCliente + ": " + puntuacion);
        
        // Aquí se podría agregar lógica adicional para tomar decisiones basadas en la puntuación de crédito,
        // como aprobar un préstamo, ajustar límites de crédito, etc.
    }
}

// Ejemplo de uso en la práctica:
public class SistemaBancario {
    public static void main(String[] args) {
        // Crear una instancia de EquifaxProveedor
        ProveedorDatosCredito equifax = new EquifaxProveedor();
        // Inyectar la dependencia en el controlador
        EvaluacionCreditoController controlador = new EvaluacionCreditoController(equifax);

        // Evaluar el crédito de un cliente
        controlador.evaluarCreditoCliente("123456789");

        // Cambiar a otro proveedor de datos es tan simple como:
        ProveedorDatosCredito transUnion = new TransUnionProveedor();
        controlador = new EvaluacionCreditoController(transUnion);
        controlador.evaluarCreditoCliente("987654321");
    }
}
```

Este ejemplo ilustra la aplicación del Principio de Inversión de Dependencias en un contexto bancario. La esencia de este diseño radica en su flexibilidad: `EvaluacionCreditoController` opera basándose en una interfaz (ProveedorDatosCredito), en lugar de depender directamente de implementaciones específicas como `EquifaxProveedor` o `TransUnionProveedor`. Esto permite cambiar entre diferentes servicios de evaluación de crédito sin necesidad de alterar el código interno del controlador. Tal flexibilidad es crucial al integrar servicios externos, cuyas especificaciones pueden variar con el tiempo, como APIs o bibliotecas.

La facilidad para intercambiar proveedores de datos, simplemente ajustando la instancia suministrada al constructor de `EvaluacionCreditoController`, convierte a nuestro sistema en uno robusto y adaptable. Esto resulta extremadamente beneficioso en ambientes empresariales donde los requerimientos pueden evolucionar rápidamente debido a factores como nuevas regulaciones o cambios tecnológicos. Simplemente cambiando la instancia del proveedor en el controlador, podemos adaptarnos a nuevas condiciones sin grandes modificaciones en el código, manteniendo así la estabilidad y la escalabilidad del sistema.

## Conclusión

Implementar los ***Principios SOLID*** en `Java` no solo mejora la calidad y la mantenibilidad de tu código, sino que también te equipa con un enfoque más estructurado y profesional hacia el desarrollo de software. A través de estos principios, podemos construir aplicaciones más robustas y fáciles de administrar, que se adaptan con gracia a las demandas cambiantes del desarrollo moderno.

Espero que este artículo te haya sido útil y que apliques estos principios en tus proyectos futuros para ver los beneficios por ti mismo. Si deseas más contenido como este y actualizaciones sobre mis últimas publicaciones, te invito a seguirme en mis redes sociales. Agradezco tu tiempo y tu interés y espero que continúes explorando y mejorando tus habilidades de programación con cada línea de código que escribes.

📌 **Repositorio del proyecto**

- **GitHub:** [solid-java-example](https://github.com/geovannymcode/solid-java-example)

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)

¡Gracias por leer y hasta la próxima publicación!


