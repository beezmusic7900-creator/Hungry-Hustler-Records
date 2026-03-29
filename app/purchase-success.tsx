
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Music } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    session_id?: string;
    song_id?: string;
    client_reference_id?: string;
  }>();

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    verifyPurchase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyPurchase = async () => {
    console.log('[purchase-success] Verifying purchase, params:', JSON.stringify(params));
    try {
      let songId = params.song_id ?? '';
      const sessionId = params.session_id ?? `manual_${Date.now()}`;

      // Parse song_id from client_reference_id if not provided directly (format: userId_songId)
      if (!songId && params.client_reference_id) {
        const parts = params.client_reference_id.split('_');
        if (parts.length >= 2) {
          songId = parts.slice(1).join('_');
        }
      }

      console.log('[purchase-success] Resolved songId:', songId, 'sessionId:', sessionId);

      if (!songId) {
        console.log('[purchase-success] No song_id found — showing generic success');
        if (isMounted.current) {
          setVerified(true);
          setVerifying(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[purchase-success] No auth session — skipping verification');
        if (isMounted.current) {
          setVerified(true);
          setVerifying(false);
        }
        return;
      }

      console.log('[purchase-success] Calling verify-purchase endpoint');
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ song_id: songId, stripe_session_id: sessionId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[purchase-success] verify-purchase returned non-ok:', res.status, errText);
        // Still show success — don't block user on backend errors
        if (isMounted.current) {
          setVerified(true);
          setVerifying(false);
        }
        return;
      }

      const data = await res.json();
      console.log('[purchase-success] Verification response:', JSON.stringify(data));
      if (isMounted.current) {
        setVerified(data.success !== false);
        setSongTitle(data.song_title ?? '');
        setVerifying(false);
      }
    } catch (e: any) {
      console.error('[purchase-success] verifyPurchase error:', e);
      if (isMounted.current) {
        setVerified(true); // Show success UI — don't block user
        setVerifying(false);
      }
    }
  };

  const handleGoToMusic = () => {
    console.log('[purchase-success] Navigating to music tab');
    router.replace('/(tabs)/music');
  };

  const handleGoHome = () => {
    console.log('[purchase-success] Navigating to home tab');
    router.replace('/(tabs)/');
  };

  const subtitleText = songTitle
    ? `"${songTitle}" is now unlocked.`
    : 'Your exclusive track is now unlocked.';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {verifying ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.verifyingText}>Confirming your purchase...</Text>
        </View>
      ) : (
        <View style={styles.centered}>
          <CheckCircle size={72} color={colors.primary} />
          <Text style={styles.title}>Purchase Complete!</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
          <Text style={styles.body}>
            You can now stream and download your purchased track from the Music tab.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={handleGoToMusic}>
            <Music size={18} color={colors.background} />
            <Text style={styles.btnText}>Go to Music</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleGoHome}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  verifyingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background,
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
