"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-provider";

export function FormularioCuenta() {
  const { iniciarSesion, registrarse } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState<"ingresar" | "registrar">("ingresar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);

    const mensajeError =
      modo === "ingresar" ? await iniciarSesion(email, password) : await registrarse(email, password);

    setEnviando(false);

    if (mensajeError) {
      setError(mensajeError);
      return;
    }

    if (modo === "registrar") {
      setAviso("Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja antes de entrar.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setModo("ingresar")}
          className={`rounded-md px-3 py-1.5 ${modo === "ingresar" ? "bg-acento text-white" : "border border-[var(--borde)]"}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setModo("registrar")}
          className={`rounded-md px-3 py-1.5 ${modo === "registrar" ? "bg-acento text-white" : "border border-[var(--borde)]"}`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-gris-500">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--borde)] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-gris-500">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--borde)] bg-transparent px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-alerta">{error}</p>}
        {aviso && <p className="text-xs text-exito">{aviso}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-acento px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {modo === "ingresar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-xs text-gris-400">
        Sin cuenta, tu progreso se guarda solo en este navegador. Con cuenta, se sincroniza y lo
        conservas aunque cambies de dispositivo.
      </p>
    </div>
  );
}
