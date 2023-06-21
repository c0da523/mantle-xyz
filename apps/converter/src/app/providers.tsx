import { WagmiProvider } from "@providers/wagmiContext";
import { StateProvider } from "@providers/stateContext";

import { ToastContainer } from "@components/Toast";

export default async function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider>
      <StateProvider>
        <ToastContainer>{children}</ToastContainer>
      </StateProvider>
    </WagmiProvider>
  );
}