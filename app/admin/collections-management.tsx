import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, Pencil, X, Package } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  badge_label: string | null;
  reward_points: number | null;
  is_active: boolean;
  display_order: number;
  item_count?: number;
}

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  badge_label: '',
  reward_points: '',
  display_order: '0',
};

export default function CollectionsManagementScreen() {
  const insets = useSafeAreaInsets();
  useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadCollections = useCallback(async () => {
    try {
      console.log('[CollectionsManagement] Loading collections');
      const { data, error } = await db
        .from('collections')
        .select('id, name, description, image_url, badge_label, reward_points, is_active, display_order')
        .order('display_order', { ascending: true });

      if (error) { console.error('[CollectionsManagement] Load error:', error.message); return; }

      const cols = (data ?? []) as Collection[];
      const colIds = cols.map((c) => c.id);

      if (colIds.length > 0) {
        const { data: itemData } = await db
          .from('collection_items')
          .select('collection_id')
          .in('collection_id', colIds);

        const countMap: Record<string, number> = {};
        ((itemData ?? []) as { collection_id: string }[]).forEach((i) => {
          countMap[i.collection_id] = (countMap[i.collection_id] ?? 0) + 1;
        });

        setCollections(cols.map((c) => ({ ...c, item_count: countMap[c.id] ?? 0 })));
      } else {
        setCollections([]);
      }
      console.log('[CollectionsManagement] Loaded', cols.length, 'collections');
    } catch (err) {
      console.error('[CollectionsManagement] loadCollections error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const handleToggleActive = async (col: Collection) => {
    console.log('[CollectionsManagement] Toggle active:', col.id, '→', !col.is_active);
    setToggling(col.id);
    try {
      const { error } = await db.from('collections').update({ is_active: !col.is_active }).eq('id', col.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setCollections((prev) => prev.map((c) => c.id === col.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      console.error('[CollectionsManagement] handleToggleActive error:', err);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Collection', 'Delete this collection and all its items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log('[CollectionsManagement] Delete collection:', id);
          try {
            await db.from('collection_items').delete().eq('collection_id', id);
            await db.from('collections').delete().eq('id', id);
            setCollections((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            console.error('[CollectionsManagement] handleDelete error:', err);
            Alert.alert('Error', 'Could not delete collection.');
          }
        },
      },
    ]);
  };

  const handleEdit = (col: Collection) => {
    console.log('[CollectionsManagement] Edit collection:', col.id);
    setForm({
      name: col.name,
      description: col.description ?? '',
      image_url: col.image_url ?? '',
      badge_label: col.badge_label ?? '',
      reward_points: col.reward_points ? String(col.reward_points) : '',
      display_order: String(col.display_order),
    });
    setEditingId(col.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    console.log('[CollectionsManagement] Submit collection — editing:', editingId);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        badge_label: form.badge_label.trim() || null,
        reward_points: form.reward_points ? parseInt(form.reward_points, 10) : null,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: true,
      };

      if (editingId) {
        const { error } = await db.from('collections').update(payload).eq('id', editingId);
        if (error) { Alert.alert('Error', error.message); return; }
      } else {
        const { error } = await db.from('collections').insert(payload);
        if (error) { Alert.alert('Error', error.message); return; }
      }

      console.log('[CollectionsManagement] Collection saved');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadCollections();
    } catch (err) {
      console.error('[CollectionsManagement] handleSubmit error:', err);
      Alert.alert('Error', 'Could not save collection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700' }}>Collections</Text>
          <AnimatedPressable onPress={() => {
            console.log('[CollectionsManagement] Create collection pressed');
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}>
            <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={COLORS.background} />
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>Create</Text>
            </View>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
                <SkeletonLine width="60%" height={16} />
                <SkeletonLine width="40%" height={12} />
              </View>
            ))}
          </View>
        ) : collections.length === 0 ? (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Package size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 }}>No collections yet</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {collections.map((col) => {
              const isToggling = toggling === col.id;
              return (
                <View key={col.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{col.name}</Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 2 }}>
                        {String(col.item_count ?? 0)}
                        {' items'}
                        {col.reward_points ? ` · ${String(col.reward_points)} pts reward` : ''}
                        {col.badge_label ? ` · ${col.badge_label}` : ''}
                      </Text>
                      {col.description && (
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{col.description}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Switch
                        value={col.is_active}
                        onValueChange={() => handleToggleActive(col)}
                        disabled={isToggling}
                        trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                        thumbColor={col.is_active ? COLORS.primary : COLORS.textTertiary}
                      />
                      <AnimatedPressable onPress={() => handleEdit(col)}>
                        <Pencil size={16} color={COLORS.primary} />
                      </AnimatedPressable>
                      <AnimatedPressable onPress={() => handleDelete(col.id)}>
                        <Trash2 size={16} color={COLORS.danger} />
                      </AnimatedPressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Form modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '90%', borderWidth: 1, borderColor: COLORS.border }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>{editingId ? 'Edit Collection' : 'Create Collection'}</Text>
                <AnimatedPressable onPress={() => setShowForm(false)}>
                  <X size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
              </View>

              {[
                { key: 'name', label: 'Name *', placeholder: 'e.g. Summer 2025 Collection' },
                { key: 'description', label: 'Description', placeholder: 'Describe this collection...' },
                { key: 'image_url', label: 'Image URL', placeholder: 'https://...' },
                { key: 'badge_label', label: 'Badge label', placeholder: 'e.g. Limited Edition' },
                { key: 'reward_points', label: 'Reward points', placeholder: '100', keyboardType: 'numeric' as const },
                { key: 'display_order', label: 'Display order', placeholder: '0', keyboardType: 'numeric' as const },
              ].map(({ key, label, placeholder, keyboardType }) => (
                <View key={key} style={{ marginBottom: 14 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>{label}</Text>
                  <TextInput
                    value={form[key as keyof typeof form]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType={keyboardType}
                    style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border }}
                  />
                </View>
              ))}

              <AnimatedPressable onPress={handleSubmit} disabled={submitting}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                  {submitting && <ActivityIndicator size="small" color={COLORS.background} />}
                  <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>{submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Collection')}</Text>
                </View>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
