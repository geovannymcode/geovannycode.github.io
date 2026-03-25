---
#preview
title: 'CRUD con Vaadin Flow 25: Despliegue con Docker Compose y PostgreSQL'
date: '2026-03-25'
image: "/img/blog/10.png"
categories:
    - Backend
    - Java
tags:
    - Java
    - Vaadin
    - Spring Boot
    - Docker
    - PostgreSQL
author: Geovanny Mendoza
short: Construye un CRUD completo con Vaadin Flow 25.0.7, Spring Boot 4 y PostgreSQL 17. Spring Boot gestiona Docker Compose automáticamente y Flyway controla el esquema. Todo en Java.
---

# CRUD con Vaadin Flow 25: Despliegue con Docker Compose y PostgreSQL

## Tu solución Vaadin empieza aquí

En este artículo construimos una aplicación CRUD con Vaadin Flow 25, Spring Data JPA y Spring Boot. Spring Boot se encarga de la configuración de JPA y Vaadin Flow de la interfaz de usuario. Todo el código de UI va en Java, sin HTML, CSS ni JavaScript escritos a mano.

## ¿Qué es Vaadin Flow?

Vaadin Flow es un framework Java para construir aplicaciones web sin escribir HTML o JavaScript directamente. En lugar de mezclar templates y lógica de backend, defines la UI con componentes Java, y Flow sincroniza esos componentes con el navegador de forma automática.

¿Por qué importa eso? Porque puedes tener un `<vaadin-grid>` en pantalla sin haber escrito una línea de TypeScript. Flow maneja la comunicación entre el servidor y el cliente; tú te concentras en la lógica.

En este proyecto aprovechamos eso para construir un CRUD completo directamente desde Java, alineado con las prácticas de desarrollo que ya usamos en el ecosistema Spring.

## Requisitos

Antes de empezar, asegúrate de tener:

- **Java 25** (LTS, versión usada en este proyecto)
- Maven 3.6+
- Docker

Las dependencias de Vaadin se gestionan a través de Maven; no necesitas instalar Vaadin por separado.

## Formas de configurar el proyecto

Hay dos caminos para iniciar un proyecto con Vaadin y Spring Boot:

**Vaadin Starter** — genera un proyecto preconfigurado desde [start.vaadin.com](https://start.vaadin.com). Ideal si quieres enfocarte en la UI desde el primer momento.

**Spring Initializr** — crea el proyecto desde cero en [start.spring.io](https://start.spring.io) y agregas las dependencias manualmente. Es el camino que seguimos aquí, porque entender qué entra en el `pom.xml` importa cuando algo falla.

## Paso 1: Crear la aplicación Spring Boot con Vaadin

Abre [Spring Initializr](https://start.spring.io) y configura el proyecto como se muestra en la Figura 1.

<!-- Figura 1: Configuración en Spring Initializr -->

Agrega estas dependencias desde Spring Initializr:

- Vaadin
- Validation
- Spring Data JPA
- PostgreSQL Driver
- Spring Boot DevTools
- Docker Compose Support

Descarga el ZIP, descomprímelo e impórtalo en tu IDE. El `pom.xml` completo con el que trabajamos es el siguiente. Presta atención a tres puntos: el parent usa **Spring Boot 4.0.1**, las propiedades definen Java 25 y Vaadin 25.0.7, y se agregan los repositorios de Vaadin para obtener el BOM correcto.

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.1</version>
</parent>

<properties>
    <java.version>25</java.version>
    <vaadin.version>25.0.7</vaadin.version>
</properties>

<repositories>
    <repository>
        <id>vaadin-prereleases</id>
        <url>https://maven.vaadin.com/vaadin-prereleases/</url>
    </repository>
    <repository>
        <id>vaadin-addons</id>
        <url>https://maven.vaadin.com/vaadin-addons</url>
    </repository>
</repositories>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-spring-boot-starter</artifactId>
    </dependency>
    <!-- Recarga en caliente para Vaadin en modo dev -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-dev</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-flyway</artifactId>
    </dependency>
    <!-- Módulo específico de Flyway para PostgreSQL (requerido desde Flyway 10) -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-database-postgresql</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>
    <!-- Spring Boot levanta y detiene Docker Compose automáticamente -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-docker-compose</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
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
    <dependency>
        <groupId>org.vaadin.crudui</groupId>
        <artifactId>crudui</artifactId>
        <version>7.2.0</version>
    </dependency>
</dependencies>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.vaadin</groupId>
            <artifactId>vaadin-bom</artifactId>
            <version>${vaadin.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Dos dependencias merecen una explicación. `vaadin-dev` habilita la recarga en caliente de componentes Vaadin durante el desarrollo, sin reiniciar el servidor. `spring-boot-docker-compose` es la novedad más importante de este setup: cuando arrancas la aplicación en modo dev, Spring Boot detecta el archivo `compose.yml` y levanta los servicios Docker automáticamente. Cuando detienes la app, los detiene. No hace falta correr `docker compose up` a mano.

## Paso 2: Crear el archivo Docker Compose

Gracias a `spring-boot-docker-compose`, Spring Boot busca por convención un archivo llamado `compose.yml` en el directorio raíz del proyecto. Créalo así:

```yaml
name: 'vaadin_flow'
services:
  customer-db:
    image: postgres:17-alpine
    container_name: customer-db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    ports:
      - "15432:5432"
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 500m
```

Usamos `postgres:17-alpine`, imagen ligera de PostgreSQL 17 basada en Alpine. El puerto `15432` en local apunta al `5432` del contenedor para evitar colisiones si tienes Postgres instalado de forma nativa.

## Paso 3: Arrancar la aplicación

Con `spring-boot-docker-compose` en el classpath y el archivo `compose.yml` en la raíz, **no necesitas levantar Docker manualmente**. Al ejecutar la aplicación desde tu IDE o con:

```bash
./mvnw spring-boot:run
```

Spring Boot detecta `compose.yml`, ejecuta `docker compose up` internamente, espera a que el healthcheck de `customer-db` pase y solo entonces arranca el contexto de la aplicación. Al detener la app, ejecuta `docker compose stop` solo. Esto elimina el paso manual de gestionar el ciclo de vida del contenedor durante el desarrollo.

## Paso 4: Configurar `application.properties`

```properties
spring.application.name=crud-vaadin-flow
server.port=8081

######## Database Configuration  #########
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:15432/postgres}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}
spring.jpa.open-in-view=false
```

### Paso 4.1: Migraciones con Flyway

Flyway mantiene un historial de cambios en el esquema. Desde Flyway 10, el soporte para cada base de datos se distribuye en módulos separados. Por eso el `pom.xml` incluye dos artefactos: `spring-boot-starter-flyway` para la integración con Spring Boot y `flyway-database-postgresql` para el driver específico de PostgreSQL. Sin el segundo, Flyway no sabe cómo conectarse a Postgres y la aplicación falla al arrancar.

Dos archivos de migración son suficientes para arrancar.

**`V1__create_customers_table.sql`** — define la estructura de la tabla:

```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100)
);
```

**`V2__add_customers_data.sql`** — agrega datos iniciales para probar:

```sql
INSERT INTO customers (name, email, phone, address, city, state, zip, country) VALUES
('John Doe', 'john.doe@example.com', '123-456-7890', '123 Elm Street', 'Springfield', 'IL', '62701', 'USA'),
('Jane Smith', 'jane.smith@example.com', '987-654-3210', '456 Oak Avenue', 'Metropolis', 'NY', '10001', 'USA');
```

Flyway ejecuta estos scripts en orden al iniciar la aplicación. Si el esquema ya existe y los scripts no cambiaron, no hace nada.

## Paso 5: Crear la entidad Customer

```java
@Table(name = "customers")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@ToString
@EqualsAndHashCode
@Entity
public class CustomerEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String zip;
    private String country;
}
```

## Paso 6: Crear el repositorio

```java
public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {}
```

`JpaRepository` nos da `save()`, `findById()`, `findAll()`, `delete()` y más sin escribir una sola query. El tipo de la clave primaria es `Long`, que coincide con el campo `id` de la entidad.

## Paso 7: Crear el servicio

El servicio maneja las cuatro operaciones del CRUD y convierte entre la entidad y el DTO usando un mapper. A continuación, cada método por separado.

**findAll():**

```java
public List<Customer> findAll() {
    return customerRepository.findAll()
                              .stream()
                              .map(CustomerMapper::toCustomer)
                              .collect(Collectors.toList());
}
```

**save():**

```java
public Customer save(Customer customer) {
    return CustomerMapper.toCustomer(
        customerRepository.save(CustomerMapper.toCustomerEntity(customer))
    );
}
```

**update():**

```java
public Customer update(Customer customer) {
    Long id = customer.getId();
    CustomerEntity customerEntityToUpdate = customerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Customer not found with given id:" + id));
    CustomerMapper.updateCustomerEntityFromCustomer(customerEntityToUpdate, customer);
    CustomerEntity updatedCustomerEntity = customerRepository.save(customerEntityToUpdate);
    return CustomerMapper.toCustomer(updatedCustomerEntity);
}
```

**delete():**

```java
public void delete(Customer customer) {
    Long id = customer.getId();
    if (!customerRepository.existsById(id)) {
        throw new RuntimeException("Customer not found with given id:" + id);
    }
    customerRepository.deleteById(id);
}
```

### DTO Customer

El DTO separa la capa de servicio de la representación interna de la base de datos:

```java
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@ToString
@EqualsAndHashCode
public class Customer {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String zip;
    private String country;
}
```

### Mapper CustomerMapper

El mapper convierte entre `CustomerEntity` y `Customer`. Tres métodos cubren los casos necesarios:

```java
public class CustomerMapper {

    static Customer toCustomer(CustomerEntity customerEntity) {
        return new Customer(
                customerEntity.getId(),
                customerEntity.getName(),
                customerEntity.getEmail(),
                customerEntity.getPhone(),
                customerEntity.getAddress(),
                customerEntity.getCity(),
                customerEntity.getState(),
                customerEntity.getZip(),
                customerEntity.getCountry()
        );
    }

    static CustomerEntity toCustomerEntity(Customer customer) {
        return new CustomerEntity(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getPhone(),
                customer.getAddress(),
                customer.getCity(),
                customer.getState(),
                customer.getZip(),
                customer.getCountry()
        );
    }

    static void updateCustomerEntityFromCustomer(CustomerEntity customerEntity, Customer customer) {
        customerEntity.setId(customer.getId());
        customerEntity.setName(customer.getName());
        customerEntity.setEmail(customer.getEmail());
        customerEntity.setPhone(customer.getPhone());
        customerEntity.setAddress(customer.getAddress());
        customerEntity.setCity(customer.getCity());
        customerEntity.setState(customer.getState());
        customerEntity.setZip(customer.getZip());
        customerEntity.setCountry(customer.getCountry());
    }
}
```

## Paso 8: Crear la interfaz gráfica

Para la UI usamos la biblioteca [crudui](https://vaadin.com/directory/component/crud-ui-add-on), que genera formularios y grids CRUD con muy poco código. Ya está incluida en el `pom.xml` del paso 1 con la versión `7.2.0`, compatible con Vaadin 25.

La vista principal recibe el servicio por inyección de dependencias:

```java
public MainCrudView(@Autowired CustomerService customerService) {
    // Configuración del grid
    crud.getGrid().setColumns("id", "name", "email", "phone", "address", "city", "state", "zip", "country");
    crud.getGrid().setColumnReorderingAllowed(true);

    // Configuración del formulario
    crud.getCrudFormFactory().setUseBeanValidation(true);
    crud.getCrudFormFactory().setVisibleProperties(
            "name", "email", "phone", "address", "city", "state", "zip", "country");
    crud.getCrudFormFactory().setVisibleProperties(
            CrudOperation.ADD,
            "name", "email", "phone", "address", "city", "state", "zip", "country");

    // Layout
    setSizeFull();
    add(crud);
    crud.setFindAllOperationVisible(false);

    // Operaciones CRUD
    crud.setOperations(
        customerService::findAll,
        customerService::save,
        customerService::update,
        customerService::delete
    );
}
```

`setUseBeanValidation(true)` activa las validaciones de `@NotNull`, `@Email`, etc. directamente en el formulario. `setColumnReorderingAllowed(true)` deja que el usuario reordene columnas arrastrándolas.

Con esto la aplicación ya muestra y gestiona la lista de clientes como se ve en la Figura 1.

<!-- Figura 1: Vista principal de la aplicación -->
![Figura #1: Vista principal de la aplicación](/img/blog/crud-vaadin/1.png)

## Búsqueda por nombre

Agregar filtrado por nombre toma cuatro pasos.

**1. Método en el repositorio:**

```java
List<CustomerEntity> findByNameContainingIgnoreCase(String name);
```

Spring Data JPA genera la query automáticamente a partir del nombre del método.

**2. Campo de búsqueda en la vista:**

```java
TextField filter = new TextField();
filter.setPlaceholder("Filter by name");
filter.setClearButtonVisible(true);
filter.setValueChangeMode(ValueChangeMode.EAGER);
crud.getCrudLayout().addFilterComponent(filter);
```

`ValueChangeMode.EAGER` dispara el evento en cada pulsación de tecla, lo que hace que la búsqueda responda de inmediato.

**3. Lógica de filtrado en las operaciones:**

```java
crud.setOperations(
    () -> {
        String filterValue = filter.getValue();
        if (filterValue == null || filterValue.isEmpty()) {
            return customerService.findAll();
        } else {
            return customerService.findByNameContainingIgnoreCase(filterValue);
        }
    },
    customerService::save,
    customerService::update,
    customerService::delete
);
```

**4. Listener para refrescar el grid:**

```java
filter.addValueChangeListener(e -> crud.refreshGrid());
```

El resultado es una búsqueda en tiempo real: la tabla se actualiza con cada letra que escribe el usuario, como se muestra en la Figura 2.

![Figura #2: Vista de la aplicación con búsqueda activa](/img/blog/crud-vaadin/2.png)

Puedes encontrar el código completo en el repositorio: [crud-vaadin-flow](https://github.com/geovannymcode/crud-vaadin-flow)

---

## Conclusión

Este post mostró cómo construir un CRUD funcional con Vaadin Flow 25.0.7, Spring Boot 4.0.1 y PostgreSQL 17. La integración `spring-boot-docker-compose` elimina la fricción de gestionar contenedores a mano durante el desarrollo: arrancas la app y el stack de base de datos sube con ella. Flyway con sus dos módulos para PostgreSQL mantiene el esquema versionado. crudui 7.2.0 reduce la UI a pocas líneas de Java, y el filtrado por nombre agrega usabilidad sin añadir complejidad. El resultado es una base limpia y lista para extender.

---

## Referencias

1. [Documentación de Vaadin](https://vaadin.com/docs/latest/)
2. [Tutorial oficial de Vaadin](https://vaadin.com/docs/latest/tutorial/overview)
3. [Starter de Vaadin](https://start.vaadin.com)
4. [Componentes y ejemplos de UI](https://vaadin.com/docs/latest/components)
5. [crudui add-on](https://vaadin.com/directory/component/crud-ui-add-on)
6. [Demos y ejemplos](https://vaadin.com/examples-and-demos)
7. [Directorio de complementos](https://vaadin.com/directory)