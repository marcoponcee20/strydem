// Maps backend errors to safe Spanish user-facing messages
// without leaking schema/policy details.
type MaybeErr = { code?: string; message?: string } | null | undefined;

export function toUserMessage(err: MaybeErr): string {
  if (!err) return "Ha ocurrido un error, inténtalo de nuevo.";
  // Log raw error for debugging (dev console only).
  console.error("[error]", err);

  const code = err.code;
  switch (code) {
    case "23505":
      return "Ese valor ya está en uso.";
    case "23503":
      return "Falta información relacionada para completar la acción.";
    case "23502":
      return "Faltan datos obligatorios.";
    case "23514":
      return "Algunos datos no son válidos.";
    case "42501":
    case "PGRST301":
      return "No tienes permisos para hacer esto.";
    case "PGRST116":
      return "No se ha encontrado el recurso.";
  }

  const msg = (err.message ?? "").toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (msg.includes("email") && msg.includes("confirm")) {
    return "Confirma tu email antes de iniciar sesión.";
  }
  if (msg.includes("already registered") || msg.includes("user already")) {
    return "Ya existe una cuenta con ese email.";
  }
  if (msg.includes("password")) {
    return "La contraseña no es válida.";
  }
  if (msg.includes("row-level security") || msg.includes("violates")) {
    return "No tienes permisos para realizar esta acción.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Problema de conexión. Inténtalo de nuevo.";
  }

  return "Ha ocurrido un error, inténtalo de nuevo.";
}
