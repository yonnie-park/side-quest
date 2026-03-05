import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

const DARK_STYLES = `
  :host {
    color: #f5f5f5;
    --gray-0: #f5f5f5;
    --gray-1: #d1d9e0;
    --gray-2: #a1a6aa;
    --gray-3: #757c82;
    --gray-4: #585f67;
    --gray-5: #383d42;
    --gray-6: #2f3337;
    --gray-7: #242629;
    --gray-8: #1b1c1d;
    --gray-9: #101010;
    --success-light: #77f893;
    --success: #55f678;
    --success-dark: #2b7b3c;
    --success-bg: #172a1b;
    --error-light: #f97676;
    --error: #f85454;
    --error-dark: #7c2a2a;
    --error-bg: #2a1515;
    --warning-light: #f9cf72;
    --warning: #f8c24f;
    --warning-dark: #7c6128;
    --warning-bg: #2b2416;
    --info-light: #74e3fc;
    --info: #51dcfb;
    --info-dark: #296e7e;
    --info-bg: #122327;
    --drawer-shadow: 0px 0px 10px 0px rgba(255,255,255,.15);
    --component-shadow: 0px 0px 10px 0px rgba(0,0,0,.2);
    --border: #242629;
    --button-bg: #f5f5f5;
    --button-bg-hover: #d1d9e0;
    --button-bg-disabled: #585f67;
    --button-text: #1b1c1d;
    --button-text-disabled: #1b1c1d;
    --button-small-border: #2f3337;
    --button-small-border-hover: #585f67;
    --input-border: #383d42;
    --input-border-focus: #757c82;
    --home-button-bg: rgba(81,220,251,.1);
    --home-button-bg-hover: rgba(81,220,251,.15);
    --home-border: #2f3337;
    --home-border-hover: #585f67;
    --dropdown-menu-bg: #1b1c1d;
    --dropdown-menu-hover: #242629;
    --logo-border: #242629;
    --bridge-meta-bg: #242629;
    --bridge-meta-button-bg: #2f3337;
    --bg: #101010;
    --dimmed: #757c82;
  }
`;

export function injectShadowTheme(theme: Theme) {
  const BASE_STYLES = `
  :host {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  }
  * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  }
`;
  const kit = document.querySelector("interwoven-kit");
  if (!kit?.shadowRoot) return;

  // kit의 data-theme을 네 앱 theme이랑 동기화
  kit.setAttribute("data-theme", theme);

  const existing = kit.shadowRoot.querySelector("#lotteria-theme-override");
  if (existing) existing.remove();
  if (theme !== "dark") return;
  const styleEl = document.createElement("style");
  styleEl.id = "lotteria-theme-override";
  styleEl.textContent = DARK_STYLES;
  kit.shadowRoot.appendChild(styleEl);
}

let observer: MutationObserver | null = null;

function setupObserver(theme: Theme) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  const kit = document.querySelector("interwoven-kit");
  if (!kit?.shadowRoot) return;
  injectShadowTheme(theme);
  observer = new MutationObserver(() => {
    const sr = kit.shadowRoot;
    if (!sr || sr.querySelector("#lotteria-theme-override")) return;
    if (theme === "dark") injectShadowTheme(theme);
  });
  observer.observe(kit.shadowRoot, { childList: true, subtree: false });
}

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: "light", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("lotteria-theme") as Theme) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lotteria-theme", theme);

    let attempts = 0;
    const trySetup = () => {
      const kit = document.querySelector("interwoven-kit");
      if (kit?.shadowRoot) {
        setupObserver(theme);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(trySetup, 200);
      }
    };
    trySetup();

    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
