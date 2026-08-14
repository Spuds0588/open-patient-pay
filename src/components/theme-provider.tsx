import { config } from "@/lib/config";

/**
 * Applies the provider's white-label theme: sets the accent color as CSS
 * variables (consumed by the Tailwind palette) and exposes the clinic name.
 * A practice changes APP_NAME / APP_ACCENT (see .env.example) to brand the
 * whole portal — patient checkout and admin alike.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="theme-provider min-h-screen"
      style={
        {
          "--primary": config.appAccent,
          "--ring": config.appAccent,
          "--accent": config.appAccentSoft,
          "--secondary": config.appAccentSoft,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function useBrand() {
  return { name: config.appName, shortName: config.appShortName };
}
