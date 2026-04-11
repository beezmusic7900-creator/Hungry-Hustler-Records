import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// ExtensionStorage is iOS-only — only import on iOS to avoid crashes on
// Android/web where the native module does not exist.
// We use a lazy getter so Metro doesn't evaluate the module on other platforms.
function getExtensionStorage(): any {
  if (Platform.OS !== "ios") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@bacons/apple-targets").ExtensionStorage;
  } catch (e) {
    console.warn("[WidgetContext] @bacons/apple-targets not available:", e);
    return null;
  }
}

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const ES = getExtensionStorage();
    if (ES) {
      try {
        ES.reloadWidget();
      } catch (e) {
        console.warn("[WidgetContext] reloadWidget error:", e);
      }
    }
  }, []);

  const refreshWidget = useCallback(() => {
    const ES = getExtensionStorage();
    if (ES) {
      try {
        ES.reloadWidget();
      } catch (e) {
        console.warn("[WidgetContext] refreshWidget error:", e);
      }
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
