/*
"use client";

export function SignInButtons() {
  return (
    <div className="grid">
      <a className="btn" href="/api/auth/signin/google">Continue with Google</a>
      <button className="btn secondary" type="button" onClick={() => alert("Passkey/biometric can be added after Google sign-in.")}>Biometric login scaffold</button>
    </div>
  );
}
*/
"use client";

import { signIn } from "next-auth/react";

export function SignInButtons() {
  return (
    <div className="grid">
      <button
        className="btn"
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      >
        Continue with Google
      </button>

      <button
        className="btn secondary"
        type="button"
        onClick={() => alert("Passkey/biometric can be added after Google sign-in.")}
      >
        Biometric login scaffold
      </button>
    </div>
  );
}