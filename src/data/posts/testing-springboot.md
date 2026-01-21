---
#preview
title: 'Testing con Spring Boot: Una Guía Actualizada'
date: '2026-01-29'
image: "/img/blog/5.png"
categories:
    - Backend
    - Testing
tags:
    - Spring Boot
    - JUnit 5
    - Mockito
    - TDD
    - Testing
author: Geovanny Mendoza
short: Guía completa sobre testing en Spring Boot utilizando JUnit 5, Mockito y TDD. Incluye ejemplos prácticos paso a paso para construir una aplicación con pruebas unitarias efectivas.
---

## Introducción

Desde la última vez que abordamos el testing en Spring Boot en 2019, la tecnología y las metodologías han evolucionado significativamente. Este artículo revisa y expande los conceptos previos, proporcionando una visión actualizada sobre las pruebas en proyectos que utilizan Spring Boot. Enfocamos particularmente en cómo las herramientas modernas como JUnit 5 y Mockito complementan prácticas como el Test-Driven Development (TDD) para mejorar la calidad y la eficiencia del desarrollo.

## Propósito de las Pruebas de Software

El propósito fundamental de las pruebas de software es garantizar que las aplicaciones cumplan con los requisitos funcionales y no funcionales, y operen de manera eficiente en escenarios de uso real. Estas pruebas son cruciales para identificar bugs, mejorar la calidad del software y asegurar la satisfacción del usuario, sirviendo como una red de seguridad que permite a los desarrolladores realizar cambios y mejoras con confianza.

## Jerarquía de Alcance de las Pruebas

Las pruebas de software se estructuran en distintos niveles para abordar diferentes aspectos del sistema:

- **Pruebas unitarias:** El nivel base, donde se verifica cada componente o unidad de manera aislada para asegurar que funcione correctamente según lo especificado.
- **Pruebas de integración:** Examinan la interacción entre componentes y módulos para asegurar que las unidades combinadas funcionen juntas según lo diseñado.
- **Pruebas de sistema:** Evalúan el comportamiento del sistema completo en un entorno que simula la producción.
- **Pruebas de UI y API:** Se centran en la funcionalidad expuesta a través de las interfaces de usuario y APIs.
- **Pruebas manuales y exploratorias:** Implican interacción humana para encontrar problemas que las pruebas automatizadas podrían no detectar.

Como se puede observar en la Figura 1, esta estructura piramidal asegura una cobertura completa, desde la validación de la lógica interna del código hasta la experiencia del usuario final.

![Figura #1: Jerarquia](/img/blog/testing/fig-1.png)

## Integración de JUnit 5, Mockito y TDD

El corazón de una estrategia de prueba efectiva en Spring Boot reside en la integración de herramientas como JUnit 5 y Mockito, potenciadas por la metodología de Test-Driven Development (TDD). Estos componentes trabajan en conjunto para proporcionar un enfoque robusto y eficiente para asegurar la calidad del software.

### JUnit 5

La última generación del framework de pruebas unitarias para Java, JUnit 5, introduce mejoras significativas que facilitan la escritura y ejecución de pruebas. Sus características permiten a los desarrolladores realizar pruebas más complejas y eficientes. Algunas de las anotaciones y funcionalidades más destacadas incluyen:

- `@Test`: Declara que un método es una prueba.
- `@ParameterizedTest`: Permite ejecutar una prueba con diferentes argumentos. Es necesario definir una fuente que proporcione los datos para cada invocación del método de prueba.
- `@RepeatedTest`: Facilita la ejecución repetida de una prueba un número determinado de veces.
- `@BeforeEach` / `@AfterEach`: Métodos que se ejecutan antes y después de cada prueba, respectivamente, útiles para preparar y limpiar condiciones.
- `@BeforeAll` / `@AfterAll`: Métodos que se ejecutan antes y después de todas las pruebas en una clase, ideal para configurar o desmontar recursos compartidos.

### Mockito

Mockito, un framework de simulación para Java, es ampliamente utilizado para testear clases con dependencias externas. Permite a los desarrolladores simular esas dependencias eficazmente:

- `@Mock`: Crea y inyecta instancias simuladas (mocks). Se utiliza en lugar de `Mockito.mock()`, proporcionando una forma más clara y concisa de crear mocks.
- `@Spy`: Permite crear un 'spy' sobre un objeto real, lo que significa que se puede supervisar cómo se utilizan los métodos reales del objeto mientras se conserva su comportamiento original.
- `@InjectMocks`: Automatiza la inyección de mocks en el objeto bajo prueba, intentando la inyección a través de constructor, métodos setter o directamente en las propiedades.

### Test-Driven Development (TDD)

Es una técnica de desarrollo de software que involucra ciclos repetidos de un proceso muy corto de desarrollo. Este proceso se basa en la escritura de una prueba automatizada que define una mejora deseada o una nueva función. Solo entonces se produce el código necesario para pasar la prueba, y finalmente se refactoriza el nuevo código a los estándares apropiados. Veamos los pasos típicos en TDD:

1. **Escribir una prueba:** Antes de escribir el código funcional, se escribe una prueba automatizada para la nueva funcionalidad. Esta prueba inicialmente fallará, ya que aún no se ha implementado la funcionalidad.
2. **Escribir el código necesario:** Se escribe el código mínimo necesario para que la prueba pase. Este enfoque asegura que el código desarrollado está estrictamente diseñado para pasar la prueba, evitando la sobreingeniería.
3. **Refactorización:** Una vez que la prueba pasa, el siguiente paso es revisar el nuevo código y hacer cambios para mejorar la estructura y la claridad, asegurando que no se altere la funcionalidad. Este paso es crucial para mantener la calidad del código y facilitar el mantenimiento a largo plazo.
4. **Repetir:** Este ciclo se repite para cada nueva funcionalidad, asegurando que el sistema sea desarrollado de manera incremental y que cada parte del código tenga pruebas correspondientes.

**Beneficios de TDD:**

- **Mejora de la calidad del código:** El código tiende a ser más modular y testeable.
- **Reducción de errores:** Al escribir pruebas primero, se detectan errores desde temprano en el proceso de desarrollo.
- **Documentación del código:** Las pruebas actúan como documentación real y actualizada de los requisitos del sistema.
- **Desarrollo más confiable y limpio:** Al refactorizar continuamente, el código se mantiene limpio y adaptado a los estándares.

## Decidir entre Spring Test y Mockito

- **Con Spring:** Utiliza `@ExtendWith(SpringExtension.class)` o `@SpringBootTest` si deseas integrar características del framework de Spring en tus pruebas, como `@MockBean`.
- **Sin Spring:** Si solo necesitas Mockito y no los aspectos completos de Spring, usa `@ExtendWith(MockitoExtension.class)`, lo que evita cargar componentes innecesarios de Spring y simplifica la configuración de la prueba.

## Patrón Organizar, Actuar y Afirmar (AAA)

El patrón AAA (Arrange-Act-Assert) es un estándar en el desarrollo de pruebas de software, ofreciendo una estructura clara y metódica para escribir métodos de prueba, permitiendo una verificación eficiente y organizada de cada aspecto del código bajo prueba.

**1. Organizar (Arrange):** En esta fase se prepara el entorno de prueba. Esto incluye la creación y configuración de los objetos necesarios, estableciendo las condiciones iniciales y configurando los mocks para que se comporten de una manera esperada.

```java
IClientRepository repository = Mockito.mock(IClientRepository.class);
Client client = new Client(repository);
Mockito.when(repository.someCondition()).thenReturn(someResult);
```

**2. Actuar (Act):** Aquí se ejecuta el método bajo prueba, lo que debería desencadenar comportamientos o cambios en el estado que serán verificados en la siguiente fase.

```java
client.save();
```

**3. Afirmar (Assert):** En la última fase, se verifica si los resultados obtenidos cumplen con las expectativas. Esto incluye comprobar el estado de los objetos, los valores de retorno y asegurarse de que se hayan invocado los métodos esperados en los objetos mock.

```java
Mockito.verify(repository).someMethod();
Result result = client.execute();
Assertions.assertNotNull(result);
Assertions.assertEquals(expected, result);
```

### Ejemplos de Escenarios de Prueba

**Organizar:** Preparar mocks y establecer comportamientos esperados.

```java
Mockito.when(repository.someCondition()).thenReturn(someResult);
Mockito.doReturn(someResult).when(repository).someCondition();
Mockito.doNothing().when(repository).someMethod();
```

**Actuar:** Ejecutar la acción que se está probando.

```java
client.save();
```

**Afirmar:** Comprobar que se cumplan las expectativas.

```java
Mockito.verify(repository, Mockito.times(1)).someMethod();
Result result = client.execute();
Assertions.assertNotNull(result);
Assertions.assertEquals(expected, result);
```

## Implementación Paso a Paso

Antes de comenzar, es importante entender por qué vamos a seguir estos pasos para construir una aplicación. En esta guía, te mostraré cómo empezar con una aplicación Spring Boot, enfocándonos en añadir las herramientas y configuraciones necesarias para que funcione bien y sea fácil de mantener.

Cada paso te ayudará a construir una base sólida y entender cómo funcionan juntos los componentes de Spring Boot. Así, al final, tendrás una aplicación completa y lista para usar o expandir según tus necesidades.

### Paso 1: Crear una Aplicación Spring Boot

Para comenzar, crea un nuevo proyecto Spring Boot. Esto se puede hacer fácilmente utilizando Spring Initializr, una herramienta en línea que permite configurar proyectos Spring básicos de manera personalizada.

1. **Accede a Spring Initializr:** Ve a [start.spring.io](https://start.spring.io).
2. **Selecciona las Dependencias del Proyecto:** Añade las siguientes dependencias para asegurarte de que tu proyecto tenga todo lo necesario para el desarrollo y pruebas:
   - **Spring Web:** Para construir servicios web, incluyendo aplicaciones RESTful utilizando Spring MVC.
   - **Spring Data JPA:** Para facilitar el acceso a bases de datos en aplicaciones Spring.
   - **Spring Boot Validation:** Para agregar soporte de validación.
   - **H2 Database:** Proporciona una base de datos en memoria que es ideal para pruebas.
   - **Lombok:** Para reducir el código boilerplate en Java mediante anotaciones.
   - **Spring Boot Test:** Para soporte de pruebas durante el desarrollo.
3. **Genera el Proyecto:** Elige las opciones apropiadas para el lenguaje (Java), la versión de Spring Boot y otros detalles del proyecto como el Grupo, Artefacto, Nombre y Descripción.
4. **Descarga y Descomprime:** Descarga el proyecto generado como un archivo ZIP, luego descomprímelo.
5. **Importa el Proyecto en tu IDE:** Abre tu Entorno de Desarrollo Integrado (IDE) preferido, como IntelliJ IDEA, Eclipse o Visual Studio Code, y selecciona la opción para importar un proyecto existente. Navega a la ubicación del proyecto descomprimido y ábrelo.

### Paso 2: Configuración de Dependencias Adicionales

Una vez importado el proyecto en tu IDE, debes asegurarte de que todas las dependencias necesarias están incluidas en tu archivo `pom.xml` (si estás utilizando Maven) o `build.gradle` (si estás utilizando Gradle).

Revisa el archivo de configuración de tu proyecto:

**Para Maven:** Abre el archivo `pom.xml` y verifica que contenga las siguientes dependencias:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

**Para Gradle:** Abre el archivo `build.gradle` y asegúrate de que las dependencias estén listadas bajo `dependencies { ... }`.

**Sincroniza tu Proyecto:** Después de modificar el archivo de configuración, sincroniza tu proyecto para que todas las nuevas dependencias sean descargadas y estén disponibles para ser utilizadas en tu entorno de desarrollo.

### Paso 3: Crear una Entidad JPA

Primero, vamos a crear una entidad JPA para representar un coche en la base de datos:

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "cars")
public class CarEntity {
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(
            name = "UUID",
            strategy = "org.hibernate.id.UUIDGenerator",
            parameters = {
                    @Parameter(name = "uuid_gen_strategy_class", value = "org.hibernate.id.uuid.CustomVersionOneStrategy")
            })
    private UUID id;

    @Column(name = "brand")
    private String brand;

    @Column(name = "model")
    private String model;

    @Column(name = "color")
    private String color;

    @Column(name = "registration_number", nullable = false, unique = true)
    @NotEmpty(message = "Product code is required")
    private String registrationNumber;

    @Column(name = "model_year")
    private Integer modelYear;

    @NotNull(message = "Car price is required") @DecimalMin("0.1")
    @Column(nullable = false)
    private BigDecimal price;

    public CarEntity(String brand, String model, String color, String registrationNumber, Integer modelYear, BigDecimal price) {
        this.brand = brand;
        this.model = model;
        this.color = color;
        this.registrationNumber = registrationNumber;
        this.modelYear = modelYear;
        this.price = price;
    }
}
```

Estamos utilizando anotaciones Lombok para reducir el código repetitivo y simplificar la definición de la entidad.

### Paso 4: Crear Capa de Repositorio

Ahora definimos el repositorio que interactuará con la base de datos:

```java
public interface CarRepository extends JpaRepository<CarEntity, UUID> {
    Optional<CarEntity> findByRegistrationNumber(String registrationNumber);
}
```

### Paso 5: Crear DTO de Car

Definimos un Data Transfer Object (DTO) para Car:

```java
public record Car(
    String brand,
    String model,
    String color,
    String registrationNumber,
    Integer modelYear,
    BigDecimal price
) {}
```

### Paso 6: Manejo de Excepciones con CarNotFoundException

Creamos una excepción personalizada para manejar situaciones cuando un carro no se encuentra:

```java
public class CarNotFoundException extends RuntimeException {
    public CarNotFoundException(String message) {
        super(message);
    }

    public static CarNotFoundException forRegistrationNumber(String registrationNumber) {
        return new CarNotFoundException("Car with registration number " + registrationNumber + " not found");
    }
}
```

### Paso 7: Crear Servicio de Car

Implementamos la lógica del negocio en un servicio:

```java
@Service
public class CarService {
    private final CarRepository carRepository;

    public CarService(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    public List<Car> getAllCars() {
        return carRepository.findAll().stream().map(CarMapper::toCar).collect(Collectors.toList());
    }

    public Optional<Car> getCarByRegistrationNumber(String registrationNumber) {
        return carRepository.findByRegistrationNumber(registrationNumber).map(CarMapper::toCar);
    }

    public Car saveCar(Car car) {
        checkIfCarExists(car.registrationNumber());
        CarEntity carEntity = CarMapper.toCarEntity(car);
        CarEntity savedCarEntity = carRepository.save(carEntity);
        return CarMapper.toCar(savedCarEntity);
    }

    public Car updateCar(String registrationNumber, Car car) {
        CarEntity carEntityToUpdate = carRepository.findByRegistrationNumber(registrationNumber)
            .orElseThrow(() -> new CarNotFoundException("Car not found with given registration number:" + registrationNumber));
        CarMapper.updateCarEntityFromCar(carEntityToUpdate, car);
        CarEntity updatedCarEntity = carRepository.save(carEntityToUpdate);
        return CarMapper.toCar(updatedCarEntity);
    }

    public void deleteCar(UUID id) {
       if (!carRepository.existsById(id)) {
           throw new CarNotFoundException("Car not found with given id:" + id);
       }
        carRepository.deleteById(id);
    }

    private void checkIfCarExists(String registrationNumber) {
        Optional<CarEntity> existingCar = carRepository.findByRegistrationNumber(registrationNumber);
        if(existingCar.isPresent()){
            throw new CarNotFoundException("Car already exist with given registration number:" + registrationNumber);
        }
    }
}
```

### Paso 8: Crear Controlador para Car

Finalmente, implementamos el controlador que expone endpoints REST para interactuar con los carros, específicamente para consultar todos los carros disponibles y buscar un carro específico por su número de registro:

```java
@RestController
@RequestMapping("/api/cars")
public class CarController {

    private final CarService carService;

    public CarController(CarService carService) {
        this.carService = carService;
    }

    @GetMapping
    List<Car> getCars() {
        return carService.getAllCars();
    }

    @GetMapping("/{registrationNumber}")
    ResponseEntity<Car> getCarByRegistrationNumber(@PathVariable String registrationNumber) {
        return carService
                .getCarByRegistrationNumber(registrationNumber)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> CarNotFoundException.forRegistrationNumber(registrationNumber));
    }
}
```

En este paso, se establecen dos métodos GET en el controlador para proporcionar una verificación básica del funcionamiento de la aplicación:

- `getAllCars()`: Este endpoint devuelve una lista de todos los carros disponibles, permitiendo confirmar que la aplicación puede recuperar y mostrar todos los registros correctamente.
- `getCarByRegistrationNumber(String registrationNumber)`: Este método busca un carro específico por su número de registro. Si el carro no se encuentra, se genera una excepción que se maneja adecuadamente, permitiendo probar la respuesta de la aplicación ante situaciones de error.

Estos endpoints son esenciales para comprobar que la aplicación está configurada correctamente y responde como se espera antes de profundizar en las pruebas más detalladas de la capa de servicio, las cuales se explorarán en el paso 9. El objetivo principal aquí es asegurar que la aplicación funcione en términos básicos, estableciendo una base sólida para las pruebas unitarias más complejas que seguirán.

### Paso 9: Pruebas Unitarias de la Capa de Servicio Usando JUnit 5 y Mockito

Para garantizar que la lógica en `CarService` funcione correctamente, vamos a escribir pruebas unitarias que verifiquen el comportamiento de este servicio sin necesidad de cargar el contexto de Spring. Utilizaremos JUnit 5 y Mockito para mockear las dependencias.

#### Configuración de la Clase de Prueba

Primero, configuramos la clase de prueba para usar Mockito, lo que nos permite crear mocks de las dependencias requeridas por `CarService`.

```java
@ExtendWith(MockitoExtension.class)
public class CarServiceTests {
    @Mock
    private CarRepository carRepository;

    @InjectMocks
    private CarService carService;

    private Car car;

    @BeforeEach
    public void setup() {
        car = new Car(
                "Toyota",
                "Corolla",
                "White",
                "ABC123",
                2021,
                BigDecimal.valueOf(20000.00)
        );
    }
}
```

En este setup:

- `@ExtendWith(MockitoExtension.class)` permite a Mockito integrarse con JUnit 5 para la inicialización automática de mocks.
- `@Mock` crea un mock de `CarRepository`.
- `@InjectMocks` crea una instancia de `CarService` e inyecta los mocks creados.

#### Test JUnit del Método saveCar

Escribimos un caso de prueba para el método `saveCar` en `CarService`. Queremos asegurarnos de que cuando guardamos un carro nuevo, el resultado es el carro guardado con los valores esperados.

```java
@DisplayName("JUnit test for saveCar method")
@Test
public void givenCarObject_whenSaveCar_thenReturnCarObject() {
    // given - precondition or setup
    CarEntity carEntity = CarMapper.toCarEntity(car);
    when(carRepository.findByRegistrationNumber(car.registrationNumber()))
            .thenReturn(Optional.empty());
    when(carRepository.save(any(CarEntity.class))).thenReturn(carEntity);

    // when - action or the behaviour that we are going test
    Car savedCar = carService.saveCar(car);

    // then - verify the output
    assertThat(savedCar).isNotNull();
    assertThat(savedCar.brand()).isEqualTo(car.brand());
    assertThat(savedCar.model()).isEqualTo(car.model());
    assertThat(savedCar.color()).isEqualTo(car.color());
    assertThat(savedCar.registrationNumber()).isEqualTo(car.registrationNumber());
    assertThat(savedCar.modelYear()).isEqualTo(car.modelYear());
    assertThat(savedCar.price()).isEqualTo(car.price());

    verify(carRepository, times(1)).findByRegistrationNumber(car.registrationNumber());
    verify(carRepository, times(1)).save(any(CarEntity.class));
}
```

En este test:

- **Given** se establece el entorno de prueba. Creamos las condiciones necesarias antes de invocar el método que estamos probando.
- **When** ejecutamos la acción central que queremos probar, en este caso, `saveCar`.
- **Then** verificamos que el resultado es el esperado, asegurándonos de que todos los atributos del carro guardado coincidan con los del carro original y que las interacciones con el repositorio sean las correctas.

#### Test JUnit del Método getAllCars

Este test verifica que el método `getAllCars` del servicio retorne correctamente la lista de todos los coches.

```java
@DisplayName("JUnit test for getAllCars method")
@Test
public void givenCarsList_whenGetAllCars_thenReturnCarsList(){
    // given - precondition or setup
    Car car1 = new Car(
            "Chevrolet",
            "Aveo",
            "Green",
            "KEA144",
            2022,
            BigDecimal.valueOf(30000.00)
    );
    CarEntity carEntity = CarMapper.toCarEntity(car);
    CarEntity carEntity1 = CarMapper.toCarEntity(car1);

    when(carRepository.findAll()).thenReturn(List.of(carEntity,carEntity1));

    // when -  action or the behaviour that we are going test
    List<Car> carList = carService.getAllCars();

    // then - verify the output
    assertThat(carList).isNotNull();
    assertThat(carList.size()).isEqualTo(2);
}
```

#### Test JUnit del Método getCarByRegistrationNumber

Este test verifica que el método `getCarByRegistrationNumber` retorne el coche correcto según el número de registro proporcionado.

```java
@DisplayName("JUnit test for getCarByRegistrationNumber method")
@Test
public void givenCarRegistrationNumber_whenGetCarByRegistrationNumber_thenReturnCarObject(){
    CarEntity carEntity = CarMapper.toCarEntity(car);
    // given
    when(carRepository.findByRegistrationNumber("ABC123")).thenReturn(Optional.of(carEntity));

    // when
    Car savedCar = carService.getCarByRegistrationNumber(car.registrationNumber()).get();

    // then
    assertThat(savedCar).isNotNull();
}
```

#### Test JUnit del Método updateCar

Este test verifica que el método `updateCar` actualice correctamente los detalles del coche.

```java
@DisplayName("JUnit test for updateCar method")
@Test
public void givenCarObject_whenUpdateCar_thenReturnUpdatedCar(){
    // given - precondition or setup
    String registrationNumber = "ABC123";
    CarEntity carEntity = CarMapper.toCarEntity(car);
    when(carRepository.findByRegistrationNumber(registrationNumber)).thenReturn(Optional.of(carEntity));
    when(carRepository.save(any(CarEntity.class))).thenReturn(carEntity);

    Car updatedCarInput = new Car(
            car.brand(),
            car.model(),
            "Red",
            car.registrationNumber(),
            car.modelYear(),
            BigDecimal.valueOf(25000.00) // updated price
    );

    // when -  action or the behaviour that we are going test
    Car updatedCar = carService.updateCar(registrationNumber, updatedCarInput);

    // then - verify the output
    assertThat(updatedCar.color()).isEqualTo("Red");
    assertThat(updatedCar.price()).isEqualTo(BigDecimal.valueOf(25000.00));
}
```

#### Test JUnit del Método deleteCar

Este test asegura que el método `deleteCar` elimine el coche sin errores.

```java
@DisplayName("JUnit test for deleteCar method")
@Test
public void givenCarRegistrationNumber_whenDeleteCar_thenNothing(){
    // given - precondition or setup
    UUID carId = UUID.fromString("b73d2343-f072-490a-b796-cbfa6de20f67");
    CarEntity carEntity = CarMapper.toCarEntity(car);
    carEntity.setId(carId);

    // Save the carEntity in the mock repository before trying to delete it
    when(carRepository.save(carEntity)).thenReturn(carEntity);
    carRepository.save(carEntity);

    // Set up the existsById method of the mock repository to return true for the carId
    when(carRepository.existsById(carId)).thenReturn(true);

    doNothing().when(carRepository).deleteById(carId);

    // when -  action or the behaviour that we are going test
    carService.deleteCar(carId);

    // then - verify the output
    verify(carRepository, times(1)).deleteById(carId);
}
```

## Conclusión

Estas pruebas unitarias ilustran un enfoque efectivo para validar la funcionalidad de servicios REST en Spring, utilizando JUnit y Mockito para simular dependencias y verificar comportamientos sin necesidad de cargar el contexto completo de Spring. Este método no solo mejora la velocidad de las pruebas, sino que también facilita un proceso de desarrollo más ágil y enfocado.

Gracias por tomarse el tiempo para leer este artículo. Si lo encontraron útil, los invito a compartirlo y comentar abajo. Cada comentario y cada vez que se comparte este contenido, no solo me motiva a seguir creando contenido valioso sino que también enriquece nuestra comunidad con sus valiosas perspectivas. ¡Agradezco sinceramente cualquier retroalimentación y espero con interés sus sugerencias!

📌 **Repositorio del proyecto**

- **GitHub:** [CarTest on GitHub](https://github.com/geovannymcode/CarTest)

📚 **Referencias**

- Libro: *Hands-On Full Stack Development with Spring Boot 3.0 and React*, Cuarta Edición, By Juha Hinkula.

🔗 **Redes sociales**

- **X (Twitter):** [@geovannycode](https://x.com/geovannycode)
- **LinkedIn:** [Geovanny Mendoza](https://www.linkedin.com/in/geovannycode/)

¡Gracias por leer y hasta la próxima publicación!
