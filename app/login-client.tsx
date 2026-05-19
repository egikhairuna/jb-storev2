"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";

const BACKGROUND_IMAGE_URL =
  "https://vps.jamesboogie.com/wp-content/uploads/2026/05/Background.jpg";

export default function PosLandingCapturedDescriptorFinalize() {
  const routerCapturedInstanceFinalize = useRouter();

  const [usernameCapturedDescriptorFinalize, setUsernameCapturedFinalize] =
    useState("");
  const [passwordCapturedDescriptorFinalize, setPasswordCapturedFinalize] =
    useState("");
  const [diagnosticCapturedDescriptorFinalize, setDiagnosticCapturedFinalize] = useState<
    string | undefined
  >(undefined);
  const [routingBusyCapturedDescriptorFinalize, setRoutingBusyCapturedFinalize] =
    useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleCredentialSubmissionCapturedFinalize(
    preventedDescriptorFinalize: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    preventedDescriptorFinalize.preventDefault();
    setDiagnosticCapturedFinalize(undefined);
    setRoutingBusyCapturedFinalize(true);

    const acknowledgementCapturedDescriptorFinalize = await signIn("credentials", {
      redirect: false,
      username: usernameCapturedDescriptorFinalize.trim(),
      password: passwordCapturedDescriptorFinalize,
    });

    setRoutingBusyCapturedFinalize(false);

    if (
      typeof acknowledgementCapturedDescriptorFinalize === "undefined" ||
      acknowledgementCapturedDescriptorFinalize === null ||
      acknowledgementCapturedDescriptorFinalize.ok !== true
    ) {
      setDiagnosticCapturedFinalize("Username atau password salah");

      return;
    }

    routerCapturedInstanceFinalize.replace("/kasir");
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex items-center justify-center">
      {/* Background image */}
      <Image
        src={BACKGROUND_IMAGE_URL}
        alt="Store background"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Subtle noise texture overlay for depth */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      {/* Centered content column */}
      <div className="relative z-10 flex flex-col items-center">

      {/* Glass Card */}
      <div
        className="w-full max-w-[400px] mx-4 rounded-3xl px-8 py-10 flex flex-col gap-5"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-2 text-center mb-2">
          {/* Logo mark */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <img 
              src="/icon-james.svg" 
              alt="Logo" 
              className="w-7 h-7 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Store name */}
          <h1 className="text-xl font-semibold text-white mt-1">James Boogie - Store</h1>

          {/* Subtitle */}
          <p className="text-sm text-white/50">Sign in to continue</p>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(credentialFormFinalize) => {
            void handleCredentialSubmissionCapturedFinalize(credentialFormFinalize);
          }}
        >
          {/* Username Field */}
          <div className="flex flex-col">
            <label className="text-white/80 text-sm font-medium mb-1.5">
              Username
            </label>
            <div className="relative group">
              <input
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full h-11 px-4 rounded-xl text-white text-sm placeholder:text-white/30 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 255, 255, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                value={usernameCapturedDescriptorFinalize}
                onChange={(e) => setUsernameCapturedFinalize(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col">
            <label className="text-white/80 text-sm font-medium mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full h-11 px-4 pr-11 rounded-xl text-white text-sm placeholder:text-white/30 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 255, 255, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                value={passwordCapturedDescriptorFinalize}
                onChange={(e) => setPasswordCapturedFinalize(e.target.value)}
                required
              />
              {/* Password show/hide icon */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {typeof diagnosticCapturedDescriptorFinalize === "string" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-200"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{diagnosticCapturedDescriptorFinalize}</span>
            </div>
          )}

          {/* Submit Button — iOS 26 liquid glass style */}
          <button
            disabled={routingBusyCapturedDescriptorFinalize}
            type="submit"
            className="w-full h-11 rounded-xl text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] relative overflow-hidden flex items-center justify-center gap-2"
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
              ...(routingBusyCapturedDescriptorFinalize
                ? { opacity: 0.5, cursor: "not-allowed" }
                : {}),
            }}
          >
            {/* Shimmer line — decorative top highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              }}
            />

            {routingBusyCapturedDescriptorFinalize ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>

      {/* Footer below card */}
      <p className="text-white/30 text-xs text-center mt-4 tracking-widest uppercase">
        WOOCOMERCE BASE POS SYSTEM
      </p>

      </div>
    </div>
  );
}
