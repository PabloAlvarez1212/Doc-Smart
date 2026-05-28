
```
DocSmart
├─ backend
│  ├─ .env
│  ├─ catalogos
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_estado_lugar_medio.py
│  │  │  ├─ 0003_historialclinico.py
│  │  │  ├─ 0004_delete_historialclinico.py
│  │  │  ├─ 0005_ciudad_departamento_delete_lugar_ciudad_departamento.py
│  │  │  ├─ 0006_ciudad_api_id_departamento_api_id.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ scripts
│  │  │  └─ load_colombia_data.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ chatbot
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_chat_mensaje_delete_chatbot.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ citas
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_remove_cita_creada_en_remove_cita_estado_and_more.py
│  │  │  ├─ 0003_alter_cita_id_estado_alter_cita_id_lugar_and_more.py
│  │  │  ├─ 0004_remove_cita_id_lugar.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ core
│  │  ├─ asgi.py
│  │  ├─ serializers.py
│  │  ├─ settings.py
│  │  ├─ urls.py
│  │  ├─ wsgi.py
│  │  └─ __init__.py
│  ├─ db.sqlite3
│  ├─ historial_medico
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_remove_historialclinico_cedula_and_more.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ manage.py
│  ├─ medicos
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_medico_token_reset_medico_token_reset_expira.py
│  │  │  ├─ 0003_medico_ultimo_envio.py
│  │  │  ├─ 0004_medico_ciudad_medico_direccion.py
│  │  │  ├─ 0005_rename_ciudad_medico_id_ciudad.py
│  │  │  ├─ 0006_alter_medico_id_ciudad.py
│  │  │  ├─ 0007_remove_medico_id_ciudad_medico_ciudad.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ test_medico.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ requirements.txt
│  ├─ templates
│  │  └─ emails
│  │     └─ reset_password.html
│  ├─ users
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_usuario_token_reset_usuario_token_reset_expira.py
│  │  │  ├─ 0003_usuario_ultimo_envio.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  └─ utils.py
└─ frontend
   ├─ components
   │  ├─ doctor
   │  │  ├─ appointments
   │  │  ├─ home
   │  │  ├─ layout
   │  │  │  └─ Header
   │  │  │     ├─ Header.js
   │  │  │     └─ Header.module.css
   │  │  ├─ my-chats
   │  │  ├─ my-notifications
   │  │  └─ my-profile
   │  ├─ forms
   │  │  ├─ forgotPasswordForm
   │  │  │  ├─ forgotPassword.module.css
   │  │  │  ├─ forgotPasswordForm.js
   │  │  │  └─ useForgotPasswordForm.js
   │  │  ├─ loginForm
   │  │  │  ├─ loginForm.js
   │  │  │  ├─ loginForm.module.css
   │  │  │  └─ useLogin.js
   │  │  ├─ registerForm
   │  │  │  ├─ RegisterForm.js
   │  │  │  ├─ RegisterForm.module.css
   │  │  │  └─ UseRegister.js
   │  │  └─ resetPasswordForm
   │  │     ├─ resetPasswordForm.js
   │  │     ├─ resetPasswordForm.module.css
   │  │     └─ useResetPasswordForm.js
   │  ├─ patient
   │  │  └─ layout
   │  │     └─ Header
   │  │        ├─ Header.js
   │  │        └─ Header.module.css
   │  └─ ui
   │     ├─ Button
   │     │  ├─ Button.js
   │     │  └─ Button.module.css
   │     ├─ Card
   │     │  ├─ card.module.css
   │     │  └─ Cards.js
   │     ├─ Input
   │     │  ├─ Input.js
   │     │  └─ Input.module.css
   │     ├─ ParticlesBackground.js
   │     └─ Rol
   │        ├─ RolSelector.js
   │        └─ RolSelector.module.css
   ├─ jsconfig.json
   ├─ next.config.mjs
   ├─ package-lock.json
   ├─ package.json
   ├─ pnpm-lock.yaml
   ├─ pnpm-workspace.yaml
   ├─ postcss.config.mjs
   ├─ public
   │  ├─ file.svg
   │  ├─ globe.svg
   │  ├─ icons
   │  │  ├─ cara_bymax.png
   │  │  ├─ chat.png
   │  │  ├─ cita_medica.png
   │  │  └─ paciente.png
   │  ├─ images
   │  │  ├─ gitfhero.png
   │  │  ├─ logo-seguridad.png
   │  │  ├─ logo.png
   │  │  ├─ logo3.png
   │  │  ├─ logoCara.png
   │  │  ├─ Logos.jpg
   │  │  ├─ logoSentado.png
   │  │  └─ messias.jpg
   │  ├─ next.svg
   │  ├─ vercel.svg
   │  └─ window.svg
   ├─ README.md
   └─ src
      ├─ app
      │  ├─ (auth)
      │  │  ├─ forgot-password
      │  │  │  ├─ forgotPassword.module.css
      │  │  │  └─ page.js
      │  │  ├─ layout.js
      │  │  ├─ layout.module.css
      │  │  ├─ login
      │  │  │  ├─ login.module.css
      │  │  │  └─ page.js
      │  │  ├─ register
      │  │  │  ├─ page.js
      │  │  │  └─ page.module.css
      │  │  ├─ register-doctor
      │  │  ├─ register-patient
      │  │  ├─ reset-password
      │  │  │  ├─ page.js
      │  │  │  └─ resetPassword.module.css
      │  │  ├─ rol
      │  │  │  ├─ page.js
      │  │  │  └─ page.module.css
      │  │  └─ services
      │  │     └─ authService.js
      │  ├─ about
      │  ├─ admin
      │  │  ├─ cities
      │  │  │  └─ page.js
      │  │  ├─ departments
      │  │  │  └─ page.js
      │  │  ├─ doctors
      │  │  │  └─ page.js
      │  │  ├─ home
      │  │  │  └─ page.js
      │  │  ├─ layout.js
      │  │  └─ patients
      │  ├─ doctor
      │  │  ├─ appointments
      │  │  ├─ home
      │  │  │  └─ page.js
      │  │  ├─ layout.js
      │  │  ├─ my-chats
      │  │  ├─ my-notifications
      │  │  ├─ my-profile
      │  │  └─ services
      │  ├─ favicon.ico
      │  ├─ globals.css
      │  ├─ layout.js
      │  ├─ page.css
      │  ├─ page.js
      │  ├─ patient
      │  │  ├─ chatbot
      │  │  ├─ home
      │  │  │  └─ page.js
      │  │  ├─ layout.js
      │  │  ├─ my- appointments
      │  │  ├─ my-chats
      │  │  ├─ my-history
      │  │  ├─ my-profile
      │  │  └─ services
      │  ├─ services
      │  │  └─ authService.js
      │  ├─ utils
      │  │  └─ errrorUtils.js
      │  ├─ validations
      │  │  ├─ forgotPasswordValidate.js
      │  │  ├─ loginvalidate.js
      │  │  ├─ registerValidate.js
      │  │  └─ resetPasswordValidate.js
      │  ├─ variables.css
      │  └─ _componentsHome
      │     ├─ Features
      │     │  ├─ Features.js
      │     │  └─ Features.module.css
      │     ├─ Footer
      │     │  ├─ Footer.js
      │     │  └─ Footer.module.css
      │     ├─ Header
      │     │  ├─ Header.js
      │     │  └─ Header.module.css
      │     └─ Hero
      │        ├─ Hero.js
      │        └─ Hero.module.css
      └─ middleware.js

```
```
DocSmart
├─ backend
│  ├─ .env
│  ├─ catalogos
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_estado_lugar_medio.py
│  │  │  ├─ 0003_historialclinico.py
│  │  │  ├─ 0004_delete_historialclinico.py
│  │  │  ├─ 0005_ciudad_departamento_delete_lugar_ciudad_departamento.py
│  │  │  ├─ 0006_ciudad_api_id_departamento_api_id.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ scripts
│  │  │  └─ load_colombia_data.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ chatbot
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_chat_mensaje_delete_chatbot.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ citas
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_remove_cita_creada_en_remove_cita_estado_and_more.py
│  │  │  ├─ 0003_alter_cita_id_estado_alter_cita_id_lugar_and_more.py
│  │  │  ├─ 0004_remove_cita_id_lugar.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ core
│  │  ├─ asgi.py
│  │  ├─ serializers.py
│  │  ├─ settings.py
│  │  ├─ urls.py
│  │  ├─ wsgi.py
│  │  └─ __init__.py
│  ├─ db.sqlite3
│  ├─ historial_medico
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_remove_historialclinico_cedula_and_more.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ manage.py
│  ├─ medicos
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_medico_token_reset_medico_token_reset_expira.py
│  │  │  ├─ 0003_medico_ultimo_envio.py
│  │  │  ├─ 0004_medico_ciudad_medico_direccion.py
│  │  │  ├─ 0005_rename_ciudad_medico_id_ciudad.py
│  │  │  ├─ 0006_alter_medico_id_ciudad.py
│  │  │  ├─ 0007_remove_medico_id_ciudad_medico_ciudad.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ test_medico.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  ├─ requirements.txt
│  ├─ templates
│  │  └─ emails
│  │     └─ reset_password.html
│  ├─ users
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ migrations
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_usuario_token_reset_usuario_token_reset_expira.py
│  │  │  ├─ 0003_usuario_ultimo_envio.py
│  │  │  └─ __init__.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ __init__.py
│  └─ utils.py
├─ frontend
│  ├─ components
│  │  ├─ doctor
│  │  │  ├─ appointments
│  │  │  ├─ home
│  │  │  ├─ layout
│  │  │  │  └─ Header
│  │  │  │     ├─ Header.js
│  │  │  │     └─ Header.module.css
│  │  │  ├─ my-chats
│  │  │  ├─ my-notifications
│  │  │  └─ my-profile
│  │  ├─ forms
│  │  │  ├─ forgotPasswordForm
│  │  │  │  ├─ forgotPassword.module.css
│  │  │  │  ├─ forgotPasswordForm.js
│  │  │  │  └─ useForgotPasswordForm.js
│  │  │  ├─ loginForm
│  │  │  │  ├─ loginForm.js
│  │  │  │  ├─ loginForm.module.css
│  │  │  │  └─ useLogin.js
│  │  │  ├─ registerForm
│  │  │  │  ├─ RegisterForm.js
│  │  │  │  ├─ RegisterForm.module.css
│  │  │  │  └─ UseRegister.js
│  │  │  └─ resetPasswordForm
│  │  │     ├─ resetPasswordForm.js
│  │  │     ├─ resetPasswordForm.module.css
│  │  │     └─ useResetPasswordForm.js
│  │  ├─ patient
│  │  │  └─ layout
│  │  │     └─ Header
│  │  │        ├─ Header.js
│  │  │        └─ Header.module.css
│  │  └─ ui
│  │     ├─ Button
│  │     │  ├─ Button.js
│  │     │  └─ Button.module.css
│  │     ├─ Card
│  │     │  ├─ card.module.css
│  │     │  └─ Cards.js
│  │     ├─ Input
│  │     │  ├─ Input.js
│  │     │  └─ Input.module.css
│  │     ├─ ParticlesBackground.js
│  │     └─ Rol
│  │        ├─ RolSelector.js
│  │        └─ RolSelector.module.css
│  ├─ jsconfig.json
│  ├─ next.config.mjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ pnpm-workspace.yaml
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ icons
│  │  │  ├─ cara_bymax.png
│  │  │  ├─ chat.png
│  │  │  ├─ cita_medica.png
│  │  │  └─ paciente.png
│  │  ├─ images
│  │  │  ├─ gitfhero.png
│  │  │  ├─ logo-seguridad.png
│  │  │  ├─ logo.png
│  │  │  ├─ logo3.png
│  │  │  ├─ logoCara.png
│  │  │  ├─ Logos.jpg
│  │  │  ├─ logoSentado.png
│  │  │  └─ messias.jpg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  ├─ README.md
│  └─ src
│     ├─ app
│     │  ├─ (auth)
│     │  │  ├─ forgot-password
│     │  │  │  ├─ forgotPassword.module.css
│     │  │  │  └─ page.js
│     │  │  ├─ layout.js
│     │  │  ├─ layout.module.css
│     │  │  ├─ login
│     │  │  │  ├─ login.module.css
│     │  │  │  └─ page.js
│     │  │  ├─ register
│     │  │  │  ├─ page.js
│     │  │  │  └─ page.module.css
│     │  │  ├─ register-doctor
│     │  │  ├─ register-patient
│     │  │  ├─ reset-password
│     │  │  │  ├─ page.js
│     │  │  │  └─ resetPassword.module.css
│     │  │  ├─ rol
│     │  │  │  ├─ page.js
│     │  │  │  └─ page.module.css
│     │  │  └─ services
│     │  │     └─ authService.js
│     │  ├─ about
│     │  ├─ admin
│     │  │  ├─ cities
│     │  │  │  └─ page.js
│     │  │  ├─ departments
│     │  │  │  └─ page.js
│     │  │  ├─ doctors
│     │  │  │  └─ page.js
│     │  │  ├─ home
│     │  │  │  └─ page.js
│     │  │  ├─ layout.js
│     │  │  └─ patients
│     │  ├─ doctor
│     │  │  ├─ appointments
│     │  │  ├─ home
│     │  │  │  └─ page.js
│     │  │  ├─ layout.js
│     │  │  ├─ my-chats
│     │  │  ├─ my-notifications
│     │  │  ├─ my-profile
│     │  │  └─ services
│     │  ├─ favicon.ico
│     │  ├─ globals.css
│     │  ├─ layout.js
│     │  ├─ page.css
│     │  ├─ page.js
│     │  ├─ patient
│     │  │  ├─ chatbot
│     │  │  ├─ home
│     │  │  │  └─ page.js
│     │  │  ├─ layout.js
│     │  │  ├─ my- appointments
│     │  │  ├─ my-chats
│     │  │  ├─ my-history
│     │  │  ├─ my-profile
│     │  │  └─ services
│     │  ├─ services
│     │  │  └─ authService.js
│     │  ├─ utils
│     │  │  └─ errrorUtils.js
│     │  ├─ validations
│     │  │  ├─ forgotPasswordValidate.js
│     │  │  ├─ loginvalidate.js
│     │  │  ├─ registerValidate.js
│     │  │  └─ resetPasswordValidate.js
│     │  ├─ variables.css
│     │  └─ _componentsHome
│     │     ├─ Features
│     │     │  ├─ Features.js
│     │     │  └─ Features.module.css
│     │     ├─ Footer
│     │     │  ├─ Footer.js
│     │     │  └─ Footer.module.css
│     │     ├─ Header
│     │     │  ├─ Header.js
│     │     │  └─ Header.module.css
│     │     └─ Hero
│     │        ├─ Hero.js
│     │        └─ Hero.module.css
│     └─ middleware.js
└─ README.md

```