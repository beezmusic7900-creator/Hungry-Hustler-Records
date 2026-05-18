import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Newspaper, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface NewsArticleItem {
  id: string;
  title: string;
  body: string | null;
  article_date: string | null;
  is_published: boolean;
}

function formatArticleDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function NewsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = useCallback(async () => {
    try {
      console.log('[AdminNewsList] Loading news_articles');
      const { data, error } = await db
        .from('news_articles')
        .select('id, title, body, article_date, is_published')
        .order('article_date', { ascending: false });

      if (error) {
        console.error('[AdminNewsList] Error:', error.message);
        return;
      }
      setArticles((data ?? []) as unknown as NewsArticleItem[]);
      console.log('[AdminNewsList] Loaded', data?.length ?? 0, 'articles');
    } catch (err) {
      console.error('[AdminNewsList] Failed:', err);
    }
  }, []);

  useEffect(() => {
    loadArticles().finally(() => setLoading(false));
  }, [loadArticles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleDelete = (article: NewsArticleItem) => {
    console.log('[AdminNewsList] Delete pressed for:', article.id);
    Alert.alert(
      'Delete Article',
      `Are you sure you want to delete "${article.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[AdminNewsList] Confirming delete:', article.id);
            const { error } = await db.from('news_articles').delete().eq('id', article.id);
            if (error) {
              console.error('[AdminNewsList] Delete error:', error.message);
            } else {
              console.log('[AdminNewsList] Deleted article:', article.id);
              setArticles((prev) => prev.filter((a) => a.id !== article.id));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                <SkeletonLine width="60%" height={16} />
                <SkeletonLine width="85%" height={13} />
                <SkeletonLine width="35%" height={12} />
              </View>
            ))}
          </View>
        ) : articles.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Newspaper size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginTop: 16 }}>
              No news articles yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {articles.map((article) => {
              const dateText = formatArticleDate(article.article_date);
              const bodyText = article.body ?? '';
              return (
                <View
                  key={article.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}
                        numberOfLines={1}
                      >
                        {article.title}
                      </Text>
                      {article.is_published ? (
                        <View
                          style={{
                            backgroundColor: 'rgba(0, 255, 102, 0.12)',
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 255, 102, 0.3)',
                          }}
                        >
                          <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '600' }}>
                            LIVE
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: COLORS.textTertiary, fontSize: 10, fontWeight: '600' }}>
                            DRAFT
                          </Text>
                        </View>
                      )}
                    </View>
                    {bodyText ? (
                      <Text
                        style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 3 }}
                        numberOfLines={1}
                      >
                        {bodyText}
                      </Text>
                    ) : null}
                    <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 3 }}>
                      {dateText}
                    </Text>
                  </View>

                  {/* Edit */}
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[AdminNewsList] Edit article:', article.id);
                      router.push(`/admin/news-form?id=${article.id}`);
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      }}
                    >
                      <Pencil size={16} color={COLORS.primary} />
                    </View>
                  </AnimatedPressable>

                  {/* Delete */}
                  <AnimatedPressable onPress={() => handleDelete(article)}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 68, 68, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 68, 68, 0.3)',
                      }}
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                    </View>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={() => {
          console.log('[AdminNewsList] Add new article');
          router.push('/admin/news-form');
        }}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 20,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={26} color={COLORS.background} />
        </View>
      </AnimatedPressable>
    </View>
  );
}
