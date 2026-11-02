"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

export function Toaster() {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans", title: "font-medium" } }}
    />
  );
}
