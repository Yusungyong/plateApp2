import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppLayout from '../../components/layout/AppLayout';
import { LEGAL_FALLBACK_DOCUMENTS } from '../../content/legalDocuments';
import {
  getLegalUrl,
  LEGAL_DOCUMENT_META,
  type LegalDocumentType,
} from '../../config/legal';
import { useTheme } from '../../styles/theme';
import { openLegalLink } from '../../utils/legalLinks';

type LegalDocumentScreenProps = {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      documentType: LegalDocumentType;
    };
  };
};

const normalizeHtmlToText = (html: string) =>
  decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|header|footer|main|h[1-6]|ul|ol|li|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { documentType } = route.params;
  const metadata = LEGAL_DOCUMENT_META[documentType];
  const fallback = LEGAL_FALLBACK_DOCUMENTS[documentType];
  const documentUrl = getLegalUrl(documentType);
  const [loading, setLoading] = useState(Boolean(documentUrl));
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const loadDocument = useCallback(async () => {
    if (!documentUrl) {
      setContent('');
      setError('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(documentUrl);

      if (!response.ok) {
        throw new Error(`문서 응답 오류 (${response.status})`);
      }

      const raw = await response.text();
      const normalized = normalizeHtmlToText(raw);

      if (!normalized) {
        throw new Error('문서 본문이 비어 있습니다.');
      }

      setContent(normalized);
    } catch {
      setContent('');
      setError('문서를 앱 안에서 바로 표시하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [documentUrl]);

  useEffect(() => {
    loadDocument().catch(() => {});
  }, [loadDocument]);

  return (
    <AppLayout
      title={metadata.title}
      showBack={true}
      showNotification={false}
      footer={null}
      onPressBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>LEGAL DOCUMENT</Text>
          <Text style={styles.heroTitle}>{metadata.shortLabel}</Text>
          <Text style={styles.heroDescription}>
            회원가입과 마이페이지에서 동일한 문서를 확인할 수 있도록 내부 화면으로 연결된 상태입니다.
          </Text>
        </View>

        {loading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.statusText}>문서를 불러오는 중…</Text>
          </View>
        ) : content ? (
          <View style={styles.documentCard}>
            <Text selectable={true} style={styles.documentText}>
              {content}
            </Text>
          </View>
        ) : (
          <View style={styles.documentCard}>
            <Text style={styles.fallbackIntro}>{fallback.intro}</Text>
            {fallback.sections.map(section => (
              <View key={section.title} style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>문서를 직접 렌더링하지 못했어요</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {documentUrl ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  loadDocument().catch(() => {});
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>다시 불러오기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  openLegalLink(documentType).catch(() => {});
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>원문 열기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>문서 URL이 아직 연결되지 않았습니다.</Text>
              <Text style={styles.infoText}>
                환경변수 <Text style={styles.infoCode}>{metadata.urlEnvKey}</Text> 값을
                추가하면 이 화면 안에서 실제 본문을 읽을 수 있습니다.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 16,
    },
    heroCard: {
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 20,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      color: colors.brandPrimary,
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    heroDescription: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    statusCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      borderRadius: 18,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      gap: 10,
    },
    statusText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    documentCard: {
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 18,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    documentText: {
      fontSize: 14,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    fallbackIntro: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textPrimary,
      marginBottom: 18,
    },
    sectionBlock: {
      marginTop: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    sectionBody: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    errorCard: {
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: '#E4B1B1',
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    errorText: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    actionRow: {
      gap: 12,
    },
    primaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      minHeight: 48,
      backgroundColor: colors.brandPrimary,
      paddingHorizontal: 18,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      minHeight: 48,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    infoCard: {
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    infoText: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    infoCode: {
      color: colors.brandPrimary,
      fontWeight: '700',
    },
  });

export default LegalDocumentScreen;
