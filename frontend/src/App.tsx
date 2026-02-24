import React from "react";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  InterwovenKitProvider,
  TESTNET,
  injectStyles,
} from "@initia/interwovenkit-react";
import LotteryApp from "./components/LotteryApp";

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

const queryClient = new QueryClient();

// InterwovenKit CSS fetch and inject
fetch("https://unpkg.com/@initia/interwovenkit-react@latest/dist/styles.css")
  .then((res) => res.text())
  .then((css) => injectStyles(css))
  .catch((err) => console.error("Failed to load InterwovenKit styles:", err));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <InterwovenKitProvider {...TESTNET} theme="light">
          <div className="app">
            <LotteryApp />
          </div>
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
