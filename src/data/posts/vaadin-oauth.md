---
#preview
title: 'Spring Boot + Vaadin + Auth0: autenticación y registro de usuarios'
date: '2026-04-07'
image: "/img/blog/14.png"
categories:
   - Backend
   - Seguridad
tags:
   - Java
   - Spring Boot
   - Vaadin
   - Auth0
   - OAuth2
   - Spring Security
author: Geovanny Mendoza
short: Reemplazamos Okta por Auth0 en una aplicación Vaadin con Spring Boot. El post cubre la configuración OAuth 2.0, el registro de usuarios vía la API v2 de Auth0, el formulario de registro con Vaadin Flow y la protección de rutas con SecurityFilterChain.
---

# Spring Boot + Vaadin + Auth0: autenticación y registro de usuarios

## Por qué cambiamos de Okta a Auth0

La versión anterior de este post usaba Okta. El problema fue práctico: el starter de Okta empezó a interferir con el arranque de la aplicación y la configuración del proveedor dejó de funcionar de forma predecible con las versiones recientes de Spring Boot. Auth0 (que es producto de la misma empresa, Okta Inc.) ofrece una integración más limpia con el estándar OAuth 2.0 nativo de Spring Security, sin depender de un starter propietario.

El resultado es una configuración más portable y con menos magia implícita.

## Stack

- **Java 21**
- **Spring Boot 4.0.5**
- **Vaadin Flow 25.1.1**
- **spring-boot-starter-oauth2-client**
- **Spring Security**

## Configuración del proyecto

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.5</version>
</parent>

<properties>
    <java.version>21</java.version>
    <vaadin.version>25.1.1</vaadin.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-spring-boot-starter</artifactId>
    </dependency>

    <!-- Servidor de desarrollo de Vaadin - requerido en modo dev -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-dev-server</artifactId>
        <optional>true</optional>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
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

Una nota sobre `vaadin-dev-server`: a partir de Vaadin 24+, el servidor de desarrollo quedó en su propia dependencia separada. Si no la incluyes, la aplicación falla al arrancar en modo desarrollo con una excepción que dice que no puede encontrar el dev server. Al marcarlo como `optional`, se excluye automáticamente en el perfil de producción.

## Configuración de Auth0

Necesitas una cuenta gratuita en [auth0.com](https://auth0.com). Una vez dentro:

**Aplicación web (para el login):**
1. Ve a Applications > Create Application
2. Selecciona "Regular Web Applications"
3. En la pestaña Settings, configura:
   - Allowed Callback URLs: `http://localhost:8080/login/oauth2/code/auth0`
   - Allowed Logout URLs: `http://localhost:8080`
   - Allowed Web Origins: `http://localhost:8080`
4. Guarda y toma nota del **Domain**, **Client ID** y **Client Secret**

**Machine-to-Machine app (para crear usuarios vía API):**
1. Ve a Applications > Create Application > Machine to Machine
2. Selecciona la Auth0 Management API
3. En permisos, habilita `create:users`
4. Guarda y toma nota del **Client ID** y **Client Secret** de esta aplicación M2M

Para obtener el token de API que usarás en el servicio de registro, puedes generarlo desde Applications > APIs > Auth0 Management API > Test, o mediante el flujo `client_credentials` de tu app M2M. Ese token es el que va en la variable `AUTH0_API_TOKEN`.

## application.yaml

```yaml
vaadin:
  launch-browser: ${VAADIN_LAUNCH_BROWSER:true}

spring:
  application:
    name: vaadin-auth0-app
  security:
    oauth2:
      client:
        registration:
          auth0:
            client-id: ${AUTH0_CLIENT_ID}
            client-secret: ${AUTH0_CLIENT_SECRET}
            scope: openid,profile,email
        provider:
          auth0:
            issuer-uri: ${AUTH0_ISSUER_URI}

auth0:
  api:
    token: ${AUTH0_API_TOKEN}

server:
  port: ${SERVER_PORT:8080}
```

La `issuer-uri` tiene el formato `https://tu-dominio.auth0.com/`. El trailing slash importa para que Spring Security construya correctamente las URLs de discovery.

Define las variables de entorno en tu IDE o en un archivo `.env` local. No las incluyas en el repositorio.

## Modelo de usuario

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

## Servicio de registro vía API de Auth0

Auth0 expone la API de gestión en `{domain}/api/v2/users`. Hay dos diferencias importantes respecto a Okta: el token usa `Bearer` en lugar de `SSWS`, y el payload necesita el campo `connection` que indica la base de datos de usuarios donde se crea la cuenta (por defecto `Username-Password-Authentication`).

```java
// src/main/java/com/geovannycode/service/Auth0UserService.java
@Service
public class Auth0UserService {

    @Value("${spring.security.oauth2.client.provider.auth0.issuer-uri}")
    private String auth0Issuer;

    @Value("${auth0.api.token}")
    private String apiToken;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean registerUser(User user) {
        String baseUrl = auth0Issuer.endsWith("/") ? auth0Issuer : auth0Issuer + "/";
        String url = baseUrl + "api/v2/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiToken);

        Map<String, Object> body = Map.of(
                "email",       user.getEmail(),
                "password",    user.getPassword(),
                "connection",  "Username-Password-Authentication",
                "given_name",  user.getFirstName(),
                "family_name", user.getLastName(),
                "name",        user.getFirstName() + " " + user.getLastName()
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

El nombre `Username-Password-Authentication` es el nombre por defecto de la conexión de base de datos en Auth0. Si creaste una conexión con otro nombre, ajusta ese campo.

## Formulario de registro con Vaadin

Esta es la parte que no existía en la versión con Okta. Vaadin maneja la validación del lado del cliente directamente desde Java, sin necesidad de JavaScript adicional:

```java
// src/main/java/com/geovannycode/views/RegisterView.java
@Route("register")
@PageTitle("Registro de Usuario")
public class RegisterView extends VerticalLayout {

    public RegisterView(Auth0UserService auth0UserService) {
        setSizeFull();
        setAlignItems(Alignment.CENTER);
        setJustifyContentMode(JustifyContentMode.CENTER);

        TextField firstName = new TextField("Nombre");
        firstName.setRequired(true);
        firstName.setMinLength(2);

        TextField lastName = new TextField("Apellido");
        lastName.setRequired(true);
        lastName.setMinLength(2);

        EmailField email = new EmailField("Correo electrónico");
        email.setRequired(true);
        email.setErrorMessage("Por favor ingresa un correo electrónico válido");
        email.setPlaceholder("ejemplo@correo.com");

        PasswordField password = new PasswordField("Contraseña");
        password.setRequired(true);
        password.setMinLength(8);
        password.setErrorMessage("La contraseña debe tener al menos 8 caracteres");

        // Limpia el estado de error al escribir
        firstName.addValueChangeListener(e -> firstName.setInvalid(false));
        lastName.addValueChangeListener(e -> lastName.setInvalid(false));
        email.addValueChangeListener(e -> email.setInvalid(false));
        password.addValueChangeListener(e -> password.setInvalid(false));

        FormLayout formLayout = new FormLayout();
        formLayout.add(firstName, lastName, email, password);
        formLayout.setResponsiveSteps(
                new FormLayout.ResponsiveStep("0", 1),
                new FormLayout.ResponsiveStep("500px", 2)
        );
        formLayout.setColspan(email, 2);
        formLayout.setColspan(password, 2);
        formLayout.setMaxWidth("600px");
        formLayout.getStyle()
                .set("padding", "20px")
                .set("border-radius", "8px")
                .set("background-color", "var(--lumo-base-color)")
                .set("box-shadow", "0 2px 10px var(--lumo-shade-10pct)");

        Button registerButton = new Button("Registrarse");
        registerButton.addThemeVariants(ButtonVariant.LUMO_PRIMARY);

        Button cancelButton = new Button("Cancelar",
                e -> UI.getCurrent().navigate("login"));
        cancelButton.addThemeVariants(ButtonVariant.LUMO_TERTIARY);

        HorizontalLayout buttonLayout = new HorizontalLayout(registerButton, cancelButton);
        buttonLayout.setWidthFull();
        buttonLayout.setJustifyContentMode(JustifyContentMode.CENTER);

        registerButton.addClickListener(event -> {
            if (validateForm(firstName, lastName, email, password)) {
                User user = new User(
                        firstName.getValue(), lastName.getValue(),
                        email.getValue(), password.getValue());

                if (auth0UserService.registerUser(user)) {
                    Notification success = Notification.show(
                            "Usuario registrado. Ya puedes iniciar sesión.",
                            5000, Notification.Position.TOP_CENTER);
                    success.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
                    UI.getCurrent().navigate("login");
                } else {
                    Notification error = Notification.show(
                            "No se pudo completar el registro. Intenta nuevamente.",
                            5000, Notification.Position.TOP_CENTER);
                    error.addThemeVariants(NotificationVariant.LUMO_ERROR);
                }
            }
        });

        H2 title = new H2("Registro de Usuario");
        title.getStyle().set("margin-bottom", "2em");

        add(title, formLayout, buttonLayout);
    }

    private boolean validateForm(TextField firstName, TextField lastName,
                                  EmailField email, PasswordField password) {
        boolean valid = true;

        if (firstName.isEmpty()) {
            firstName.setInvalid(true);
            firstName.setErrorMessage("El nombre es requerido");
            valid = false;
        }
        if (lastName.isEmpty()) {
            lastName.setInvalid(true);
            lastName.setErrorMessage("El apellido es requerido");
            valid = false;
        }
        if (email.isEmpty() || !email.getValue().matches(".+@.+\\..+")) {
            email.setInvalid(true);
            email.setErrorMessage("Ingresa un correo electrónico válido");
            valid = false;
        }
        if (password.isEmpty() || password.getValue().length() < 8) {
            password.setInvalid(true);
            valid = false;
        }

        return valid;
    }
}
```

## Vista de login

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

        Anchor loginLink = new Anchor("oauth2/authorization/auth0", "Iniciar sesión con Auth0");
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

El atributo `router-ignore` en el enlace de login es obligatorio. Sin él, Vaadin intercepta la navegación internamente antes de que Spring Security pueda iniciar el flujo OAuth y el redirect nunca llega a Auth0.

## Vista de perfil

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

            Button logoutButton = new Button("Cerrar sesión",
                    e -> getUI().ifPresent(ui -> ui.getPage().setLocation("/logout")));

            add(title, email, logoutButton);
        } else {
            H1 title = new H1("No has iniciado sesión");
            Button loginButton = new Button("Ir a login",
                    e -> getUI().ifPresent(ui -> ui.navigate("login")));
            add(title, loginButton);
        }
    }
}
```

## Configuración de seguridad

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
                    "/oauth2/authorization/auth0",
                    "/login/oauth2/code/auth0"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .defaultSuccessUrl("/profile", true)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
            );

        return http.build();
    }
}
```

Los paths `/oauth2/authorization/auth0` y `/login/oauth2/code/auth0` deben coincidir exactamente con la clave que usaste en `application.yaml` bajo `registration`. Si cambiaste el nombre de `auth0` por otro, los paths cambian también.

## Flujo completo

1. El usuario accede a cualquier ruta protegida
2. Spring Security redirige a `/login`
3. El usuario hace clic en "Iniciar sesión con Auth0"
4. Auth0 muestra su página de login
5. Tras autenticarse, Auth0 redirige a `/login/oauth2/code/auth0` con el código de autorización
6. Spring Security intercambia el código por tokens y construye el `OidcUser` en el contexto
7. El usuario llega a `/profile`

Para el registro, el flujo pasa por la vista `/register`, que llama directamente a la API de gestión de Auth0 con un token M2M. El usuario queda creado en Auth0 y puede hacer login en el siguiente paso.

## Repositorio del proyecto

Código fuente completo: [vaadin-auth0-app](https://github.com/geovannymcode/vaadin-auth0-app)

---

## Referencias

1. [Auth0 Management API - Create User](https://auth0.com/docs/api/management/v2/users/post-users)
2. [Spring Security OAuth2 Client](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/index.html)
3. [Vaadin Flow Documentation](https://vaadin.com/docs/latest)
4. [Auth0 Spring Boot Quickstart](https://auth0.com/docs/quickstart/webapp/java-spring-boot)