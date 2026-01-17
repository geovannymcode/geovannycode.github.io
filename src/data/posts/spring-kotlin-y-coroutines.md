---
title: 'Construir una Api Rest reactiva con Spring, Kotlin y Coroutines'
date: '2026-01-16'
image: "/img/blog/3.png"
categories:
  - Backend
  - Kotlin
tags:
  - Spring
  - Spring Boot 4
  - Kotlin
  - Coroutines
  - R2DBC
  - PostgreSQL
author: Geovanny Mendoza
short: Guía paso a paso para construir una API REST reactiva desde cero usando Spring Boot, Kotlin y Coroutines, integrando R2DBC con PostgreSQL, Docker y Kotlin Flows para lograr un backend no bloqueante, claro y mantenible.
---

# Construir una Api Rest reactiva con Spring, Kotlin y Coroutines

## 1. Introducción

¡Hola amigos! En este post te enseñaré con una guía de paso a paso a crear una API REST reactiva usando Spring, Kotlin, coroutines y Kotlin Flows completamente desde cero.

Aunque Spring utiliza internamente la implementación Reactor, las coroutines proporcionan una forma más sencilla y natural de escribir código asíncrono y no bloqueante. Gracias a esto, podemos disfrutar de los beneficios de un código no bloqueante sin comprometer la legibilidad del código (lo que podría convertirse en un problema al utilizar Project Reactor en proyectos más maduros y complejos).

Al final de este tutorial, sabrás exactamente cómo:

- Configurar un proyecto con  Spring Boot 3 para trabajar con coroutines de Kotlin.
- Ejecutar una instancia PostgreSQL usando Docker.
- Implementar un crud usando R2DBC y CoroutineCrudRepository.
- Exponer una API REST reactiva con coroutines y Kotlin Flows.

## 2. Creación de la imagen de la Base de datos PostgreSQL con Docker Compose.

Creamos un archivo con el siguiente nombre dev-stack.yml y adicionaremos el siguiente código dentro del archivo.

```yaml
version: '3.0'
services:
  ##POSTGRESQL
  postgres:
    container_name: postgres
    image: postgres:17
    ports:
      - "5432:5432"
    restart: unless-stopped
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: 123
      POSTGRES_DB: app
```

Ejecutamos el siguiente comando en una terminal para subir la instancia.

```bash
docker compose -f dev-stack.yml up -d
```

## 3. Generar Nuevo Proyecto

Una vez hecho esto, vayamos a la pagina de Spring Initializr y generamos un nuevo proyecto con la siguiente configuración:

- Java: 21
- Spring Boot: 4.x
- Kotlin: 2.2.x
- Dependencias en Initializr:
  - Reactive Web (Spring WebFlux)
  - Spring Data R2DBC
  - PostgreSQL Driver
  - (Opcional) Validation

La configuración anterior es todo lo que necesitamos para crear un nuevo proyecto Spring Boot con Kotlin y Coroutines. Además, para conectarnos a la base de datos Postgres, necesitamos dos dependencias más: Spring Data R2DBC y PostgreSQL Driver.

Una vez hecho esto, vamos hacer click al botón Generate e importar el proyecto a nuestro IDE (IntelliJ IDEA).

## 4. Gestión de la Base de Datos

En esta sección exploraremos la gestión de la base de datos, para este ejemplo utilizamos el mismo IDE IntelliJ IDEA. Seleccionamos el icono Database como se puede observar en la figura # 2

![Figura #2: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-2.png)

### 4.1 Conectar a la interfaz de la base de datos

Después de haber seleccionado la Database, procedemos adicionar la conexión con nuestra base de datos, para este ejemplo utilizamos la BD de PostgreSQL como se puede observar en la figura # 3.

![Figura #3: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-3.png)

El primer paso es presionar con un click en el signo (+) y después seleccionamos el Data Source.
Seleccionamos la base de datos PostgreSQL.

### 4.2 Configuración el Data Sources

En este paso ingresamos el user que tendrá el valor por defecto root y para el password  su valor será 123, como se puede observar en la figura # 4.

![Figura #4: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-4.png)

Si es la primera vez que vamos a realizar una conexión, nos toca descargar el driver de la base de datos.

Por ultimo presionamos click en el botón OK.

### 4.3 Ejecutar el script de la Base de Datos

En este paso copiaremos el siguiente script que se encuentra aquí.

```sql
create schema if not exists app;
create table if not exists app.school(
       id serial not null primary key,
       name varchar(255) not null,
       address varchar(255) not null,
       email varchar(255) not null unique
);
create table if not exists app.student(
       id serial not null primary key,
       first_name varchar(255) not null,
       last_name varchar(255) not null,
       email varchar(255) not null unique,
       age int not null,
       school_id bigint not null references app.school(id) on delete cascade
);

INSERT INTO app.school ("name", address, email) VALUES('San Jose', 'La Paz', 'sanjose@gmail.com');
INSERT INTO app.school ("name", address, email) VALUES('San Francisco', 'La Paz', 'sanjose@gmail.com');

INSERT INTO app.student (first_name, last_name, email, age, school_id) VALUES('Geovanny', 'Mendoza', 'geovanny@gmail.com', 23, 1);
INSERT INTO app.student (first_name, last_name, email, age, school_id) VALUES('Maria', 'Mendoza', 'maria@hotmail.com', 20, 2);
INSERT INTO app.student (first_name, last_name, email, age, school_id) VALUES('Omar', 'Berroteran', 'omar@gmail.com', 30, 2);
INSERT INTO app.student (first_name, last_name, email, age, school_id) VALUES('Lizzete', 'Gonzalez', 'lizzete@gmail.com', 26, 1);
```

Pegamos el script en la ventana de la consola, como se puede observar la figura # 5.

![Figura #5: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-5.png)

Después de ejecutar el script en la consola, podemos observar como en la figura # 6 que se ha creado la base de datos con sus respectivas tablas.

![Figura #6: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-6.png)

Continuando con el proceso de creación e inserción de registros, en este paso realizaremos una consulta a la tabla de student como se puede observar en la figura # 7

![Figura #7: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-7.png)

Hasta aquí hemos configurado la base de datos, en el paso siguiente entraremos en materia para trabajar sobre el proyecto, lo primero que vamos hacer es configurar la conexión con la base de datos.

## 5. Configurar la conexión R2DBC

A continuación, en nuestro proyecto buscamos dentro del paquete resource el archivo application.properties y modificamos la extension por  .yaml. Quedaría con el siguiente nombre application.yaml

El siguiente paso es abrir el archivo e insertar el siguiente código par configuración de la conexión:

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://${DB_HOST:localhost}:5432/${DB_NAME:app}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:123}
```

Esta configuración indica a Spring que compruebe primero las variables de entorno DB_HOST, DB_USERNAME, DB_PASSWORD y DB_NAME. Si falta alguna variable en particular, entonces proporcionamos los valores por defecto.

## 6. Crear los modelos

A continuación, vamos a crear un nuevo paquete llamado model e introduciremos las clases encargadas de mapear las tablas de la base de datos.

Implementemos la clase School:

```kotlin
@Table("app.school")
data class School(
    @Id val id: Long? = null,
    val name: String,
    val address: String,
    val email: String
)
```

Las anotaciones @Table y @Id son bastante descriptivas y necesarias para configurar el mapeo en Spring. No obstante, cabe mencionar que si no queremos generar identificadores manualmente, los campos identificadores deben ser nullable.

Del mismo modo, vamos a crear la clase de datos Student:

```kotlin
import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Table

@Table("app.student")
data class Student(
    @Id val id: Long? = null,
    val firstName: String,
    val lastName: String,
    val email: String,
    val age: Int,
    val schoolId: Long
)
```

## 7. Operaciones CRUD usando Kotlin Coroutines

A continuación, vamos a crear el paquete repository.En nuestro proyecto, utilizaremos CoroutineCrudRepository, que es un repositorio que esta inluido en el proyecto de Spring Data R2DBC, que expone la naturaleza no bloqueante del acceso a datos a través de Coroutines de Kotlin. Si alguna vez has trabajado con Reactor, en pocas palabras, las funciones Mono<T> se sustituyen por funciones suspend que devuelven el tipo T, y en lugar de crear Fluxes, generaremos Flows. Por otro lado, si nunca has trabajado con Reactor, entonces el tipo de retorno Flow<T> significa que una función devuelve múltiples valores computados asíncronamente, la función suspend devuelve sólo un único valor.

### 7.1 Crear School Repositorio

Para empezar, vamos a implementar la interfaz SchoolRepository con una única función personalizada:

```kotlin
interface SchoolRepository : CoroutineCrudRepository<School, Long> {
    fun findByNameContaining(name: String): Flow<School>
}
```

### 7.2 Crear Student Repositorio

A continuación vamos a crear el StudentRepository.

```kotlin
import kotlinx.coroutines.flow.Flow
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.data.r2dbc.repository.Query

interface StudentRepository : CoroutineCrudRepository<Student, Long> {

    fun findByLastNameContaining(name: String): Flow<Student>

    fun findBySchoolId(schoolId: Long): Flow<Student>

    @Query("SELECT * FROM app.student WHERE email = :email")
    fun findByEmail(email: String): Flow<Student>
}
```

El CoroutineCrudRepository extiende el Spring Data Repository y requiere que proporcionemos dos tipos: el tipo de dominio y el tipo de identificador. Un Student y un Long en nuestro caso. Esta interfaz viene con 15 funciones ya implementadas, como por ejemplo el save, findAll, delete, etc. Responsables de las operaciones CRUD genéricas. De esta manera, podemos reducir tremendamente la cantidad de boilerplate en nuestra base de código Kotlin. Además, hacemos uso de dos grandes características de Spring Data (que no son específicas de Kotlin o coroutines):

@Query, que nos permite ejecutar tanto consultas JPQL como consultas SQL nativas.
Query Methods (Los métodos de consulta), que en términos simples nos permiten definir consultas a través de nombres de función. Como en el caso anterior, findByLastNameContaining se traducirá en where like.. query y findBySchoolId nos permitirá buscar estudiantes por el identificador de la escuela.

Nota: He nombrado un tercer método con el nombre randomLastNameFindByEmail sólo para enfatizar, que el nombre de la función es irrelevante cuando se utiliza la Consulta, no hagas esto en un desarrollo del mundo real.

## 8. Crear Servicios

Con el modelo y la capa de repositorio implementadas, podemos continuar y crear un paquete de servicios.

### 8.1 Crear Interfaz de School Service

En primer lugar, vamos a crear la interfaz SchoolService a nuestro proyecto, donde crearemos todos los métodos para realizar las operaciones de la lógica de negocio:

```kotlin
interface SchoolService {
    suspend fun saveSchool(school: School): School?

    suspend fun findAllSchools(): Flow<School>

    suspend fun findSchoolById(id: Long): School?

    suspend fun deleteSchoolById(id: Long)

    suspend fun findAllSchoolsByNameLike(name: String): Flow<School>

    suspend fun updateSchool(id: Long, requestedSchool: School): School
}
```

### 8.2 Implementar School Service

En esta clase se implementa toda la lógica de negocio de nuestro ejemplo de School, adicionamos la anotación @Service e implementamos la clase desde la interfaz de servicio.

```kotlin
@Service
class DefaultSchoolService(private val schoolRepository: SchoolRepository) : SchoolService {
    override suspend fun saveSchool(school: School): School? = schoolRepository.save(school)

    override suspend fun findAllSchools(): Flow<School> = schoolRepository.findAll()

    override suspend fun findSchoolById(id: Long): School? = schoolRepository.findById(id)

    override suspend fun deleteSchoolById(id: Long) {
        val foundSchool = schoolRepository.findById(id)

        if (foundSchool == null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "School with id $id no found.")
        } else {
            schoolRepository.deleteById(id)
        }
    }

    override suspend fun findAllSchoolsByNameLike(name: String): Flow<School> = schoolRepository.findByNameContaining(name)

    override suspend fun updateSchool(id: Long, requestedSchool: School): School {
        val foundSchool = schoolRepository.findById(id)

        return if (foundSchool == null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "School with id $id no found.")
        } else {
            schoolRepository.save(requestedSchool.copy(id = foundSchool.id))
        }
    }
}
```

Toda la magia comienza con la anotación @Service, que es una especialización de @Component. De esta forma, simplemente ordenamos a Spring que cree un bean de SchoolService.

Como podemos ver claramente, la lógica de nuestro servicio es realmente sencilla, y gracias a las coroutines podemos escribir código similar a la programación imperativa.

Por último, quería mencionar la lógica responsable de las actualizaciones de School. El método save de la interfaz del Repositorio funciona de dos maneras:

Cuando el valor de un campo marcado con @Id es null, se creará una nueva entrada en la base de datos, sin embargo, si el id no es nulo, entonces se actualizará la fila con el especificado.

### 8.3 Crear Interfaz de School Service

A continuación, vamos a crear la interfaz StudentService a nuestro proyecto.

```kotlin
interface StudentService {
    suspend fun saveUser(student: Student): Student?
    suspend fun findAllStudents(): Flow<Student>
    suspend fun findStudentById(id: Long): Student?
    suspend fun deleteStudentById(id: Long)
    suspend fun updateStudent(id: Long, requestedStudent: Student): Student
    suspend fun findAllStudentsByLastNameLike(name: String): Flow<Student>
    suspend fun findStudentsBySchoolId(id: Long): Flow<Student>
}
```

### 8.4 Implementar Student Service

A continuación vamos a implementar la clase DefaultStudentService encargada de la gestión de los estudiantes:

```kotlin
@Service
class DefaultStudentService(private val studentRepository: StudentRepository) : StudentService {
    override suspend fun saveUser(student: Student): Student? =
        studentRepository.randomLastNameFindByEmail(student.email)
            .firstOrNull()
            ?.let { throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The specified email is already in student.") }
            ?: studentRepository.save(student)

    override suspend fun findAllStudents(): Flow<Student> = studentRepository.findAll()

    override suspend fun findStudentById(id: Long): Student? = studentRepository.findById(id)

    override suspend fun deleteStudentById(id: Long) {
        val foundStudent = studentRepository.findById(id)

        return if (foundStudent == null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Stundet with id $id not found.")
        } else {
            studentRepository.deleteById(id)
        }
    }

    override suspend fun updateStudent(id: Long, requestedStudent: Student): Student {
        val foundStudent = studentRepository.findById(id)

        return if (foundStudent == null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Student with id $id not found.")
        } else {
            studentRepository.save(requestedStudent.copy(id = foundStudent.id))
        }
    }

    override suspend fun findAllStudentsByLastNameLike(name: String): Flow<Student> =
        studentRepository.findByLastNameContaining(name)

    override suspend fun findStudentsBySchoolId(id: Long): Flow<Student> =
        studentRepository.findBySchoolId(id)
}
```

## 9. Crear Controladores

Lo último que nos falta por implementar en nuestro proyecto Spring Kotlin Coroutines son... endpoints REST (y un par de DTOs).

### 9.1 Crear StudentResponse y StudentRequest

Cuando trabajamos en escenarios reales podemos utilizar diferentes enfoques, cuando se trata de serialización y deserialización de datos (o en términos simples - JSON <-> conversiones de objetos Kotlin). En algunos casos tratar con clases modelo puede ser suficiente, pero introducir DTOs suele ser un mejor enfoque. En nuestros ejemplos, vamos a introducir clases separadas de petición y respuesta, que en mi opinión nos permiten mantener nuestra base de código mucho más fácil.

Para ello, vamos crear un paquete dto y añadimos dos data class a nuestra base de código: StudentRequest y StudentResponse:

Request:

```kotlin
data class StudentRequest(
    val email: String,
    @JsonProperty("first_name") val firstName: String,
    @JsonProperty("last_name")val lastName: String,
    val age: Int,
    @JsonProperty("school_id") val schoolId: Long
)
```

Response:

```kotlin
data class StudentResponse(
    val id: Long,
    val email: String,
    @JsonProperty("first_name")val firstName: String,
    @JsonProperty("last_name")val lastName: String,
    val age: Int
)
```

Las clases request se utilizarán para traducir la carga JSON a objetos Kotlin, mientras que las response harán lo contrario.

Además, hacemos uso de la anotación @JsonProperty, para que nuestros ficheros JSON utilicen el caso snake.

### 9.2 Implementar StudentController

Con esto preparado, no nos queda más que crear un paquete controlador e implementamos la clase StudentController:

```kotlin
@RestController
@RequestMapping("/api/students")
class StudentController(private val studentService: StudentService) {

    @GetMapping
    suspend fun findStudents(
        @RequestParam("name", required = false) name: String?,
    ): Flow<StudentResponse> {
        val students = name?.let { studentService.findAllStudentsByLastNameLike(name) }
            ?: studentService.findAllStudents()

        return students.map(Student::toResponse)
    }

    @PostMapping
    suspend fun createStudent(@RequestBody studentRequest: StudentRequest): StudentResponse =
        studentService.saveUser(
            student = studentRequest.toModel(),
        )
            ?.toResponse()
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error during student creation.")

    @GetMapping("/{id}")
    suspend fun findStudentById(
        @PathVariable id: Long,
    ): StudentResponse =
        studentService.findStudentById(id)
            ?.let(Student::toResponse)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Student with id $id was not found.")

    @DeleteMapping("/{id}")
    suspend fun deleteStudentById(
        @PathVariable id: Long,
    ) {
        studentService.deleteStudentById(id)
    }

    @PutMapping("/{id}")
    suspend fun updateStudent(
        @PathVariable id: Long,
        @RequestBody studentRequest: StudentRequest,
    ): StudentResponse =
        studentService.updateStudent(
            id = id,
            requestedStudent = studentRequest.toModel(),
        )
            .toResponse()
}

fun Student.toResponse(): StudentResponse =
    StudentResponse(
        id = this.id!!,
        firstName = this.firstName,
        lastName = this.lastName,
        email = this.email,
        age = this.age,
    )

private fun StudentRequest.toModel(): Student =
    Student(
        email = this.email,
        firstName = this.firstName,
        lastName = this.lastName,
        age = this.age,
        schoolId = this.schoolId,
    )
```

### 9.3 Crear SchoolResponse y SchoolRequest

Del mismo modo, vamos a añadir las clases response y request para los recursos de School:

Request:

```kotlin
data class SchoolRequest(
    val name: String,
    val address: String,
    val email: String
)
```

Response:

```kotlin
data class SchoolResponse(
    val id: Long,
    val name: String,
    val address: String,
    val email: String,
    val students: List<StudentResponse>
)
```

### 9.4 Implementar SchoolController

A continuación, vamos añadir la clase SchoolController

```kotlin
@RestController
@RequestMapping("/api/schools")
class SchoolController(
    private val schoolService: SchoolService,
    private val studentService: StudentService,
) {
    @GetMapping
    suspend fun findSchool(
        @RequestParam("name", required = false) name: String?,
    ): Flow<SchoolResponse> {
        val schools = name?.let { schoolService.findAllSchoolsByNameLike(name) }
            ?: schoolService.findAllSchools()

        return schools
            .map { school ->
                school.toResponse(
                    students = findSchoolStudents(school),
                )
            }
    }

    @PostMapping
    suspend fun createSchool(@RequestBody schoolRequest: SchoolRequest): SchoolResponse =
        schoolService.saveSchool(
            school = schoolRequest.toModel(),
        )?.toResponse()
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error during school creation.")

    @GetMapping("/{id}")
    suspend fun findSchoolById(
        @PathVariable id: Long,
    ): SchoolResponse =
        schoolService.findSchoolById(id)
            ?.let { school ->
                school.toResponse(
                    students = findSchoolStudents(school),
                )
            }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "School with id $id not found.")

    @PutMapping("/{id}")
    suspend fun updateSchool(
        @PathVariable id: Long,
        @RequestBody schoolRequest: SchoolRequest
    ): SchoolResponse =
        schoolService.updateSchool(
            id = id,
            requestedSchool = schoolRequest.toModel()
        )
            .let { school ->
                school.toResponse(
                    students = findSchoolStudents(school)
                )
            }

    @DeleteMapping("/{id}")
    suspend fun deleteSchoolById(
        @PathVariable id: Long
    ) {
        schoolService.deleteSchoolById(id)
    }

    private suspend fun findSchoolStudents(school: School) =
        studentService.findStudentsBySchoolId(school.id!!)
            .toList()
}

private fun School.toResponse(students: List<Student> = emptyList()): SchoolResponse =
    SchoolResponse(
        id = this.id!!,
        name = this.name,
        address = this.address,
        email = this.email,
        students = students.map(Student::toResponse),
    )

private fun SchoolRequest.toModel(): School =
    School(
        name = this.name,
        address = this.address,
        email = this.email,
    )
```

## 10. Prueba con Postman

Llegados a este punto, ya tenemos todo lo necesario para empezar a hacer las pruebas. Aquí mismo puedes encontrar una colección de Postman lista para usar, que puedes importar a tu ordenador.

## 11. Resultado con Postman

En esta sección se visualiza las pruebas exitosas de postman con los métodos GET y POST como se puede observar en las figuras # 8 y #9.

### 11.1 Prueba del Método GET:

Acá se puede visualizar el resultado de la prueba del método GET donde nos muestra todo los estudiantes registrados, como se puede visualizar en la figura # 8

![Figura #8: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-8.png)

### 11.2 Prueba del Método POST:

Continuando se puede visualizar la creación de un estudiante con el método POST como se puede observar en la figura # 9.

![Figura #9: Ventana Database en IntelliJ IDEA](/img/blog/spring-kotlin-coroutines/fig-9.png)

## 12. Conclusión

Hemos finalizado este tutorial práctico, en el que has aprendido cómo crear una API REST usando Spring, Kotlin, coroutines, y Kotlin Flows. Como siempre, puedes encontrar el proyecto completo en este repositorio de GitHub.

Espero que te haya gustado este artículo y estaré eternamente agradecido por tu feedback en la sección de comentarios.

## Referencias

### Artículos:

- https://codersee.com/reactive-rest-api-with-spring-kotlin-and-coroutines/
- https://xebia.com/blog/spring-data-r2dbc-and-kotlin-coroutines/