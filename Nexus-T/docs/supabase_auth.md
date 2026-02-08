Supabase Auth – Password & Email Workflows (Markdown Reference)
📌 Índice

Enviar solicitud de restablecer contraseña

Actualizar la contraseña (después de link)

Reenviar correos (confirmación, email change, OTP)

Generar link manualmente (admin)

Consideraciones y notas importantes

🛠️ 1) 🔑 Reset Password – Enviar correo

Función: envía un correo con un link para que el usuario restablezca su password.
No cambia la contraseña directamente.

JavaScript
const { data, error } = await supabase.auth.resetPasswordForEmail(
  email,
  {
    redirectTo: 'https://example.com/update-password'
  }
)


envía el email con el enlace de recuperación.

redirectTo es donde el usuario será redirigido luego de abrir el link.

Python
response = supabase.auth.reset_password_for_email(
  email,
  {"redirect_to": "https://example.com/update-password"}
)


idéntico flujo al JavaScript.

🛠️ 2) ✍️ Actualizar la contraseña (tras reset)

Una vez que el usuario hace click en el link de recuperación:

JavaScript
const { data, error } = await supabase.auth.updateUser({
  password: "new_password"
})


después de que el usuario es redirigido desde el email.

🔁 3) 📧 Reenviar emails (confirmación, cambios, OTP)

Supabase sí soporta reenviar varios tipos de correos con auth.resend (lo agregó después del issue #3526).

Suspabase JavaScript – General
const { error } = await supabase.auth.resend({
  type: 'signup',          // 'signup', 'email_change', 'phone_change'
  email: 'email@example.com',
  options: {
    emailRedirectTo: 'https://example.com/after-confirm'
  }
})


📌 Tipos de correo:

Type	Qué reenvía
signup	Verificación de email al registrarse
email_change	Confirmación para cambio de email
phone_change	OTP para cambio de teléfono
sms	OTP por SMS

Puedes especificar emailRedirectTo para indicar dónde debe redirigir el link.

En otros lenguajes

Swift: supabase.auth.resend(type: .signup, email: "...")

Dart / Flutter: supabase.auth.resend(type: OtpType.signup, email: "...")

Kotlin: supabase.auth.resendEmail(OtpType.Email.SIGNUP, "...")

Python: igual sintaxis con auth.resend({ type: "...", email: ... })

¿Y si el usuario nunca verificó el correo?

La restricción original del issue #3526 señalaba que no había forma nativa de reenviar el correo de confirmación solo con el SDK, porque inicialmente solo existía el link generado pero no la acción de envío.

Hoy sí hay auth.resend que lo hace.
Pero si necesitas reenviarlo como admin desde el servidor (sin que el usuario esté logueado), tienes estas opciones 👇

👨‍💻 4) 🔐 Generar links manualmente (admin)

Estos métodos no envían el correo por sí mismos — solo generan el link. Luego tú puedes enviar el email usando tu servicio SMTP preferido.

JavaScript (admin - service role key)
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'signup',     // 'signup' o 'recovery'
  email: 'user@example.com'
})


devuelve un action_link con el token.

luego debes enviar tu propio email con ese link.

📌 5) Consideraciones & notas
✔ Configuración de email

Ve a Authentication → Settings → Email y asegúrate de que tus plantillas de correo estén activas y el SMTP esté configurado.

✔ Email reenvío y expiración

El link de confirmación / reset expira según la configuración del proyecto.

Si el usuario intenta usar un link viejo → dará error. Nada lo actualizará automáticamente salvo enviar un nuevo link con auth.resend o generar uno nuevo con admin.generateLink.

❗ Problemas conocidos

Pueden haber confusiones si el usuario no tiene acceso a su email y no puede iniciar sesión por falta de verificación. La documentación antigua no cubría esto hasta introducir auth.resend.

Asegúrate de tener una estrategia de reenvío clara para UX (botón “reenviar confirmación” en tu app).

📄 Ejemplo de flujos
🔹 Usuario olvidó su contraseña

resetPasswordForEmail(email) → email enviado

usuario abre el link

updateUser({ password })

🔹 Usuario quiere reenviar confirmación

auth.resend({ type: 'signup', email })

nuevo email con link de confirmación

🔹 Admin envía manual (sin depender del usuario)

admin.generateLink({ type:'signup', email })

toma el link en action_link

envía email con tu SMTP