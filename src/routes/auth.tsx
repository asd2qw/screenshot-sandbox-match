import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · Gestión de Obras" },
      { name: "description", content: "Acceso para el propietario y los trabajadores de la empresa." },
      { property: "og:title", content: "Iniciar sesión · Gestión de Obras" },
      { property: "og:description", content: "Acceso para el propietario y los trabajadores de la empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [canSignup, setCanSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/inicio", replace: true });
    });
    supabase.rpc("company_exists").then(({ data }) => setCanSignup(data === false));
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/banned/i.test(error.message) ? "Tu cuenta está desactivada." : "Correo o contraseña incorrectos.");
        navigate({ to: "/inicio", replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/inicio", data: { full_name: fullName } },
        });
        if (error) throw new Error("No se pudo crear la cuenta. El registro público puede estar cerrado.");
        if (data.session) navigate({ to: "/inicio", replace: true });
        else toast.success("Revisa tu correo para confirmar la cuenta.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw new Error("No se pudo enviar el correo.");
        toast.success("Si el correo existe, recibirás un enlace para restablecer la contraseña.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-sidebar">
      <div className="hazard-stripe h-2" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <HardHat className="size-6" />
            </div>
            <span className="font-display text-2xl font-bold text-sidebar-accent-foreground">Gestión de Obras</span>
          </div>
          <form onSubmit={submit} className="rounded-lg bg-card p-6 shadow-card">
            <h1 className="mb-1 text-xl font-bold">
              {mode === "login" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta de propietario" : "Recuperar contraseña"}
            </h1>
            <p className="mb-5 text-sm text-muted-foreground">
              {mode === "signup"
                ? "La primera cuenta será la del propietario de la empresa."
                : mode === "forgot"
                  ? "Te enviaremos un enlace por correo."
                  : "Los trabajadores reciben su acceso del propietario."}
            </p>
            <div className="grid gap-4">
              {mode === "signup" && (
                <div><Label htmlFor="name">Nombre y apellidos</Label><Input id="name" className="mt-1.5" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              )}
              <div><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" className="mt-1.5" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode !== "forgot" && (
                <div><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" className="mt-1.5" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              )}
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Un momento…" : mode === "login" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
              </Button>
            </div>
            <div className="mt-4 flex flex-col items-center gap-1 text-sm">
              {mode === "login" ? (
                <>
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode("forgot")}>¿Has olvidado tu contraseña?</button>
                  {canSignup && <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>Configurar la empresa (primer acceso)</button>}
                </>
              ) : (
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("login")}>Volver a iniciar sesión</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
