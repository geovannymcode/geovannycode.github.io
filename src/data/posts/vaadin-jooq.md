---
#preview
title: 'Spring Boot + Vaadin + Okta: autenticación y autorización'
date: '2026-04-07'
image: "/img/blog/14.png"
categories:
    - Backend
    - Seguridad
tags:
    - Java
    - Spring Boot
    - Vaadin
    - Okta
    - OAuth2
    - Spring Security
author: Geovanny Mendoza
short: Integra Okta como proveedor de identidad en una aplicación Vaadin con Spring Boot 4. Cubre la configuración OAuth 2.0, el registro de usuarios vía API, las vistas de login y perfil, y la protección de rutas con SecurityFilterChain.
---

# Spring Boot + Vaadin + Okta: autenticación y autorización

## El problema que Okta resuelve

Implementar autenticación desde cero en Spring Boot no es complicado hasta que aparecen los detalles: recuperación de contraseñas, tokens de refresco, MFA, bloqueo de cuentas por intentos fallidos. Cada uno de esos puntos es una superficie de ataque potencial.

Okta gestiona todo eso como servicio. Tu aplicación delega el flujo de identidad usando OAuth 2.0 y OpenID Connect, y se queda solo con la lógica de negocio. Esta guía muestra cómo conectar Vaadin Flow 25 con Spring Boot 4 usando Okta como proveedor.

## Stack utilizado

- **Java 25**
- **Spring Boot 4.0.1**
- **Vaadin Flow 25.0.7**
- **Okta Spring Boot Starter**
- **Spring Security**

## Configuración del proyecto

La forma más directa de generar la base es con [Spring Initializr](https://start.spring.io). Configura:

- Project: Maven
- Language: Java
- Spring Boot: 4.0.1
- Group: `com.geovannycode`
- Artifact: `vaadin-okta-app`
- Dependencies: Spring Web, Spring Security, Vaadin, Okta Spring Boot Starter

Una vez generado el ZIP, las dependencias en el `pom.xml` quedan así:

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

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-spring-boot-starter</artifactId>
    </dependency>

    <dependency>
        <groupId>com.okta.spring</groupId>
        <artifactId>okta-spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

## Registro de la aplicación en Okta

Antes de escribir código, necesitas una cuenta en [developer.okta.com](https://developer.okta.com) y registrar tu aplicación:

1. Ve a **Applications > Create App Integration**
2. Selecciona **OIDC - OpenID Connect** y tipo **Web Application**
3. Completa los URIs de redirección:
    - Sign-in redirect URI: `http://localhost:8080/login/oauth2/code/okta`
    - Sign-out redirect URI: `http://localhost:8080`
    - Initiate login URI: `http://localhost:8080/login`
4. Grant type: **Authorization Code** únicamente
5. Guarda y toma nota del **Client ID**, **Client Secret** e **Issuer URL**

Con la aplicación creada, configura también:

- **Assignments**: asigna tu usuario o grupo en la pestaña correspondiente
- **CORS**: en Security > API > Trusted Origins, agrega `http://localhost:8080` con métodos CORS y Redirect
- **Scopes**: en Security > API > Authorization Servers > default, confirma que existen `openid`, `profile` y `email`
- **Access Policy**: crea una regla que permita esos tres scopes con grant type Authorization Code

## Configuración de la aplicación

Con las credenciales de Okta en mano, configura `application.yml`:

```yaml
vaadin:
  launch-browser: ${VAADIN_LAUNCH_BROWSER:true}

spring:
  application:
    name: vaadin-okta-app
  security:
    oauth2:
      client:
        registration:
          okta:
            client-id: ${OKTA_CLIENT_ID}
            client-secret: ${OKTA_CLIENT_SECRET}
            scope: openid,profile,email
        provider:
          okta:
            issuer-uri: ${OKTA_ISSUER_URI}

server:
  port: ${SERVER_PORT:8080}

okta:
  api:
    token: ${OKTA_API_TOKEN}
```

Las variables de entorno (`OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER_URI`, `OKTA_API_TOKEN`) pueden definirse en un archivo `.env` o en la configuración de tu IDE. No las incluyas en el repositorio.

## Modelo de usuario con validación

Antes de conectar con la API de Okta para registrar usuarios, definimos el modelo con validaciones:

```java
// src/main/java/com/geovannycode/model/User.java
public class User {

    @NotBlank(message = "El nombre es obligatorio")
    private String firstName;

    @NotBlank(message = "El apellido es obligatorio")
    private String lastName;

    @Email(message = "Formato de correo inválido")
    @NotBlank(message = "El correo es obligatorio")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;

    public User() {}

    public User(String firstName, String lastName, String email, String password) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
    }

    // Getters y setters
}
```

## Servicio de registro vía API de Okta

Para crear usuarios en Okta desde tu aplicación, el starter incluye soporte para la API de Okta. El siguiente servicio llama al endpoint de creación de usuarios usando el token de API:

```java
// src/main/java/com/geovannycode/service/OktaUserService.java
@Service
public class OktaUserService {

    @Value("${spring.security.oauth2.client.provider.okta.issuer-uri}")
    private String oktaIssuer;

    @Value("${okta.api.token}")
    private String apiToken;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean registerUser(User user) {
        String baseUrl = oktaIssuer.replace("/oauth2/default", "");
        String url = baseUrl + "/api/v1/users?activate=true";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "SSWS " + apiToken);

        Map<String, Object> profile = Map.of(
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "email", user.getEmail(),
                "login", user.getEmail()
        );

        Map<String, Object> credentials = Map.of(
                "password", Map.of("value", user.getPassword())
        );

        Map<String, Object> body = Map.of(
                "profile", profile,
                "credentials", credentials
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
```

El token de API (`okta.api.token`) se genera desde el panel de administración de Okta en **Security > API > Tokens**. Necesita permisos de `okta.users.manage` para poder crear usuarios.

## Vista de login

Vaadin maneja el enrutamiento con `@Route`. La vista de login redirige al flujo de OAuth con Okta usando un enlace que ignora el router de Vaadin:

```java
// src/main/java/com/geovannycode/views/LoginView.java
@Route("login")
@PageTitle("Login")
@RouteAlias("")
public class LoginView extends VerticalLayout {

    public LoginView() {
        addClassName("login-view");
        setSizeFull();
        setAlignItems(Alignment.CENTER);
        setJustifyContentMode(JustifyContentMode.CENTER);

        H1 title = new H1("Bienvenido a la aplicación");

        Anchor loginLink = new Anchor("oauth2/authorization/okta", "Iniciar sesión con Okta");
        loginLink.getElement().setAttribute("router-ignore", true);
        loginLink.getStyle().set("margin-top", "20px");

        Anchor registerLink = new Anchor("register", "Registrarse");
        registerLink.getStyle().set("margin-top", "10px");

        Div linkContainer = new Div(loginLink, new Div(registerLink));
        linkContainer.getStyle().set("display", "flex");
        linkContainer.getStyle().set("flex-direction", "column");
        linkContainer.getStyle().set("align-items", "center");

        add(title, linkContainer);
    }
}
```

El atributo `router-ignore` es importante. Sin él, Vaadin intercepta la navegación antes de que Spring Security pueda iniciar el flujo OAuth.

## Vista de perfil

Una vez autenticado, Spring Security expone el usuario via `SecurityContextHolder`. Vaadin puede leer esos datos directamente para construir la vista de perfil:

```java
// src/main/java/com/geovannycode/views/ProfileView.java
@Route("profile")
@PageTitle("Perfil de Usuario")
public class ProfileView extends VerticalLayout {

    public ProfileView() {
        addClassName("profile-view");
        setSizeFull();
        setAlignItems(Alignment.CENTER);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof OidcUser user) {
            H1 title = new H1("Bienvenido, " + user.getGivenName());
            Paragraph email = new Paragraph("Email: " + user.getEmail());

            Button logoutButton = new Button("Cerrar sesión", e ->
                    getUI().ifPresent(ui -> ui.getPage().setLocation("/logout"))
            );

            add(title, email, logoutButton);
        } else {
            H1 title = new H1("No has iniciado sesión");
            Button loginButton = new Button("Ir a login", e ->
                    getUI().ifPresent(ui -> ui.navigate("login"))
            );

            add(title, loginButton);
        }
    }
}
```

El cast usa pattern matching de Java 16+ (`instanceof OidcUser user`), lo que elimina el cast explícito del original.

## Configuración de seguridad

Esta es la parte donde más fallan las integraciones. Vaadin necesita que varios paths estén libres de autenticación para cargar sus recursos, y Spring Security los bloquea por defecto:

```java
// src/main/java/com/geovannycode/config/SecurityConfig.java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                    "/",
                    "/login",
                    "/register",
                    "/VAADIN/**",
                    "/images/**",
                    "/favicon.ico",
                    "/manifest.webmanifest",
                    "/oauth2/authorization/okta",
                    "/login/oauth2/code/okta"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/profile", true)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
            );

        return http.build();
    }
}
```

El path `/VAADIN/**` es el que más se olvida. Sin él la aplicación carga el flujo OAuth correctamente pero la interfaz de Vaadin no levanta después del login.

## Flujo completo

Con todo configurado, el flujo es el siguiente:

1. El usuario accede a cualquier ruta protegida
2. Spring Security redirige a `/login`
3. El usuario hace clic en "Iniciar sesión con Okta"
4. Okta muestra su página de login
5. Tras autenticarse, Okta redirige a `/login/oauth2/code/okta` con el código de autorización
6. Spring Security intercambia el código por tokens y almacena el `OidcUser` en el contexto
7. El usuario llega a `/profile` con su información disponible

El logout sigue el camino inverso: `/logout` invalida la sesión local y redirige a `/login`.

## Repositorio del proyecto

Código fuente completo: [vaadin-okta-app](https://github.com/geovannymcode/vaadin-okta-app)

---

## Referencias

1. [Okta Developer Documentation](https://developer.okta.com/docs/)
2. [Vaadin Flow Documentation](https://vaadin.com/docs/latest)
3. [Spring Security OAuth2 Client](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/index.html)
4. [Okta Spring Boot Starter](https://github.com/okta/okta-spring-boot)