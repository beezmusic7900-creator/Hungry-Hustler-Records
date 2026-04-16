/**
 * RevenueCat Subscription Context
 *
 * Provides subscription management for Expo + React Native apps.
 * Reads API keys from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via RevenueCat SDK
 * - Web preview via RevenueCat REST API (read-only pricing display)
 * - Expo Go: graceful fallback (no crash) with mock purchase support
 *
 * SETUP:
 * 1. Wrap your app with <SubscriptionProvider> inside <AuthProvider>
 * 2. Run: pnpm install react-native-purchases && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Import auth hook for user syncing (validated at setup time)
import { useAuth } from "./AuthContext";

// Lazily-imported RevenueCat types (only used in native builds)
type PurchasesOfferings = import("react-native-purchases").PurchasesOfferings;
type PurchasesOffering = import("react-native-purchases").PurchasesOffering;
type PurchasesPackage = import("react-native-purchases").PurchasesPackage;

// Read API keys from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const IOS_API_KEY = extra.revenueCatApiKeyIos || "test_wEkIGlvWCRgUmodYuYUmFtROJxN";
const ANDROID_API_KEY = extra.revenueCatApiKeyAndroid || "test_wEkIGlvWCRgUmodYuYUmFtROJxN";
const TEST_IOS_API_KEY = extra.revenueCatTestApiKeyIos || "test_wEkIGlvWCRgUmodYuYUmFtROJxN";
const TEST_ANDROID_API_KEY = extra.revenueCatTestApiKeyAndroid || "test_wEkIGlvWCRgUmodYuYUmFtROJxN";
const ENTITLEMENT_ID = extra.revenueCatEntitlementId || "pro";

// Warn loudly if still using the placeholder key — purchases and entitlement checks will fail
const _activeKey = Platform.OS === "android" ? ANDROID_API_KEY : IOS_API_KEY;
if (_activeKey === "test_wEkIGlvWCRgUmodYuYUmFtROJxN") {
  console.warn(
    "[RevenueCat] ⚠️  API key is the Specular placeholder — this is NOT a real RevenueCat key. " +
    "Go to https://app.revenuecat.com → Project Settings → API Keys, copy your Public SDK keys, " +
    "and set revenueCatApiKeyIos / revenueCatApiKeyAndroid in app.json extra."
  );
}

// Check if running on web
const isWeb = Platform.OS === "web";
// Expo Go does not include the RevenueCat native module — attempting to initialize
// it there throws "Invalid API key" because the native runtime is absent.
// Constants.appOwnership === 'expo' reliably identifies Expo Go.
const isExpoGo = Constants.appOwnership === "expo";
const _PROJECT_SCOPE = Constants.expoConfig?.extra?.nativelyProjectId || Constants.expoConfig?.slug || "app";
const MOCK_PURCHASE_KEY = `rc_mock_purchased_${_PROJECT_SCOPE}`;
const MOCK_NATIVE_KEY = `rc_dev_native_${_PROJECT_SCOPE}`;
const NATIVE_PURCHASE_KEY = `rc_subscribed_${_PROJECT_SCOPE}`;

if (isExpoGo) {
  console.log(
    "[RevenueCat] Running in Expo Go — RevenueCat initialization skipped. " +
    "Use a development build (npx expo run:ios / run:android) to test purchases."
  );
}

// ─── Dynamic RC loader ────────────────────────────────────────────────────────
// react-native-purchases requires a native module that is NOT present in Expo Go.
// We skip loading entirely in Expo Go to avoid "Invalid API key" / native crash.

let _rcModule: typeof import("react-native-purchases") | null = null;
let _rcAvailable: boolean | null = null;

async function getRCModule(): Promise<typeof import("react-native-purchases") | null> {
  // Hard-skip in Expo Go — native module is not linked, any call throws
  if (isExpoGo) return null;
  if (_rcAvailable === false) return null;
  if (_rcModule) return _rcModule;
  try {
    const mod = await import("react-native-purchases");
    // Verify the native module is actually linked
    if (typeof mod.default?.configure !== "function") {
      console.warn(
        "[RevenueCat] react-native-purchases native module not available. " +
        "Purchases require a custom dev build or production build, not standard Expo Go."
      );
      _rcAvailable = false;
      return null;
    }
    _rcModule = mod;
    _rcAvailable = true;
    return mod;
  } catch (e) {
    console.warn("[RevenueCat] Failed to load react-native-purchases:", e);
    _rcAvailable = false;
    return null;
  }
}

// ─── Context types ────────────────────────────────────────────────────────────

interface SubscriptionContextType {
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** All offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** The current/default offering */
  currentOffering: PurchasesOffering | null;
  /** Available packages in the current offering */
  packages: PurchasesPackage[];
  /** Loading state during initialization */
  loading: boolean;
  /** Whether running on web (purchases not available) */
  isWeb: boolean;
  /** Whether RevenueCat native module is available (false in Expo Go) */
  isNativeAvailable: boolean;
  /** Purchase a package - returns true if successful */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases - returns true if subscription found */
  restorePurchases: () => Promise<boolean>;
  /** Manually re-check subscription status */
  checkSubscription: () => Promise<void>;
  /** Mock a successful purchase on web (preview only) - sets isSubscribed to true */
  mockWebPurchase: () => void;
  /** Dev-only: simulate a purchase in Expo Go — persists across reloads via expo-secure-store */
  mockNativePurchase: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const auth = useAuth() as Record<string, unknown> | null;
  const session = auth?.session as Record<string, unknown> | undefined;
  const user = (auth?.user ?? session?.user ?? null) as { id?: string } | null;
  const authLoading = (auth?.loading ?? false) as boolean;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);

  // Fetch offerings via REST API mock for web platform
  const fetchOfferingsViaRest = async () => {
    const mockPackage = {
      identifier: "$rc_monthly",
      product: {
        title: "Premium",
        priceString: "$2.99/month",
        description: "Unlock all premium features",
      },
    };
    setPackages([mockPackage] as PurchasesPackage[]);
    console.log("[RevenueCat] Web preview: showing mock prices");
  };

  // Initialize RevenueCat on mount
  useEffect(() => {
    let customerInfoListener: { remove: () => void } | null = null;

    const initRevenueCat = async () => {
      try {
        // Web platform: SDK doesn't work, use mock for basic display
        if (isWeb) {
          await fetchOfferingsViaRest();
          if (typeof window !== "undefined" && localStorage.getItem(MOCK_PURCHASE_KEY) === "true") {
            setIsSubscribed(true);
          }
          setLoading(false);
          return;
        }

        // Dynamically load the native module — returns null in Expo Go
        const RC = await getRCModule();
        if (!RC) {
          // Native module not available (Expo Go) — restore any simulated state
          setIsNativeAvailable(false);
          if (__DEV__) {
            const mockState = await SecureStore.getItemAsync(MOCK_NATIVE_KEY).catch(() => null);
            if (mockState === "true") {
              setIsSubscribed(true);
              console.log("[RevenueCat] Expo Go: restored mock subscription state");
            } else {
              console.log("[RevenueCat] Expo Go: purchases not available — use mockNativePurchase() to simulate");
            }
          }
          setLoading(false);
          return;
        }

        setIsNativeAvailable(true);
        const Purchases = RC.default;
        const LOG_LEVEL = RC.LOG_LEVEL;

        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

        const testKey = TEST_IOS_API_KEY || TEST_ANDROID_API_KEY;
        const productionKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
        const apiKey = __DEV__ && testKey ? testKey : productionKey;

        if (!apiKey) {
          console.warn(
            "[RevenueCat] API key not provided for this platform. " +
            "Please add revenueCatApiKeyIos/revenueCatApiKeyAndroid to app.json extra."
          );
          setLoading(false);
          return;
        }

        if (__DEV__) {
          console.log("[RevenueCat] Initializing in DEV mode with key:", apiKey.substring(0, 10) + "...");
          const cached = await SecureStore.getItemAsync(NATIVE_PURCHASE_KEY).catch(() => null);
          if (cached === "true") {
            setIsSubscribed(true);
          }
        }

        await Purchases.configure({ apiKey });
        setIsConfigured(true);

        customerInfoListener = Purchases.addCustomerInfoUpdateListener(
          (customerInfo) => {
            const hasEntitlement =
              typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
            if (hasEntitlement || !__DEV__) {
              setIsSubscribed(hasEntitlement);
            }
          }
        );

        // Fetch offerings
        try {
          const fetchedOfferings = await Purchases.getOfferings();
          setOfferings(fetchedOfferings);
          if (fetchedOfferings.current) {
            setCurrentOffering(fetchedOfferings.current);
            setPackages(fetchedOfferings.current.availablePackages);
          }
        } catch (error) {
          console.error("[RevenueCat] Failed to fetch offerings:", error);
        }

        // Check initial subscription status
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const hasEntitlement =
            typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
          if (hasEntitlement || !__DEV__) {
            setIsSubscribed(hasEntitlement);
          }
          if (hasEntitlement) {
            await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
          } else if (!__DEV__) {
            await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "false").catch(() => {});
          }
        } catch (error) {
          console.error("[RevenueCat] Failed to check subscription:", error);
        }
      } catch (error) {
        console.error("[RevenueCat] Failed to initialize:", error);
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();

    return () => {
      if (customerInfoListener) {
        customerInfoListener.remove();
      }
    };
  }, []);

  // Sync RevenueCat user ID with authenticated user
  useEffect(() => {
    if (!isConfigured || isWeb) return;
    if (authLoading) return;

    const updateUser = async () => {
      const RC = await getRCModule();
      if (!RC) return;
      const Purchases = RC.default;
      try {
        if (user?.id) {
          await Purchases.logIn(user.id);
        } else {
          await Purchases.logOut();
        }
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to update user:", error);
      }
    };

    updateUser();
  }, [user?.id, isConfigured, authLoading]);

  const checkSubscription = async () => {
    if (isWeb) return;
    const RC = await getRCModule();
    if (!RC) return;
    const Purchases = RC.default;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      if (hasEntitlement || !__DEV__) {
        setIsSubscribed(hasEntitlement);
      }
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      } else if (!__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "false").catch(() => {});
      }
    } catch (error) {
      console.error("[RevenueCat] Failed to check subscription:", error);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Purchases not available on web");
      return false;
    }
    const RC = await getRCModule();
    if (!RC) {
      console.warn("[RevenueCat] Purchases not available in Expo Go — use a custom dev build");
      return false;
    }
    const Purchases = RC.default;
    try {
      console.log("[RevenueCat] purchasePackage pressed:", pkg.identifier);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      }
      return hasEntitlement;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("[RevenueCat] Purchase failed:", error);
        throw error;
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Restore not available on web");
      return false;
    }
    const RC = await getRCModule();
    if (!RC) {
      console.warn("[RevenueCat] Restore not available in Expo Go — use a custom dev build");
      return false;
    }
    const Purchases = RC.default;
    try {
      console.log("[RevenueCat] restorePurchases pressed");
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement || !__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, hasEntitlement ? "true" : "false").catch(() => {});
      }
      return hasEntitlement;
    } catch (error) {
      console.error("[RevenueCat] Restore failed:", error);
      throw error;
    }
  };

  const mockWebPurchase = () => {
    if (!isWeb) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_PURCHASE_KEY, "true");
    }
    setIsSubscribed(true);
  };

  const mockNativePurchase = async (): Promise<void> => {
    if (!__DEV__ || isWeb) return;
    await SecureStore.setItemAsync(MOCK_NATIVE_KEY, "true").catch(() => {});
    setIsSubscribed(true);
    console.log("[RevenueCat] mockNativePurchase: subscription simulated");
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        offerings,
        currentOffering,
        packages,
        loading,
        isWeb,
        isNativeAvailable,
        purchasePackage,
        restorePurchases,
        checkSubscription,
        mockWebPurchase,
        mockNativePurchase,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription state and methods.
 *
 * @example
 * const { isSubscribed, purchasePackage, packages, isWeb, isNativeAvailable } = useSubscription();
 *
 * if (!isSubscribed) {
 *   return <Button onPress={() => router.push("/paywall")}>Upgrade</Button>;
 * }
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider"
    );
  }
  return context;
}
