"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({ name, autoComplete, minLength, required = true }: { name: string; autoComplete: string; minLength?: number; required?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><input required={required} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} /><button className="password-toggle" type="button" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>;
}
