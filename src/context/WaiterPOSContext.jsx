import React, { createContext, useContext, useState } from 'react';

const WaiterPOSContext = createContext(null);

export function WaiterPOSProvider({ children }) {
  // Injected by WaiterPOS when ordering screen is active
  const [navSlot, setNavSlot] = useState(null);
  return (
    <WaiterPOSContext.Provider value={{ navSlot, setNavSlot }}>
      {children}
    </WaiterPOSContext.Provider>
  );
}

export function useWaiterPOS() {
  return useContext(WaiterPOSContext);
}
