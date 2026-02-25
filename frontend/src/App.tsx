import React from "react";
import "./App.css";
import "./theme.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  InterwovenKitProvider,
  TESTNET,
  injectStyles,
} from "@initia/interwovenkit-react";
import LotteryApp from "./components/LotteryApp";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

const queryClient = new QueryClient();

fetch("https://unpkg.com/@initia/interwovenkit-react@latest/dist/styles.css")
  .then((res) => res.text())
  .then((css) => injectStyles(css))
  .catch((err) => console.error("Failed to load InterwovenKit styles:", err));

function AppInner() {
  const { theme } = useTheme();
  return (
    <InterwovenKitProvider {...TESTNET} theme={theme}>
      <div className="app">
        <LotteryApp />
      </div>
    </InterwovenKitProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
