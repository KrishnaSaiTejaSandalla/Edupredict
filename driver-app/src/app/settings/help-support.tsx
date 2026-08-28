import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Divider } from '@/components/ui/Divider';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/i18n/i18n-context';
import { post, get, del } from '@/api/client';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
  id: string;
  titleKey: 'faq_qr_title' | 'faq_gps_title' | 'faq_missing_title' | 'faq_trip_title' | 'faq_lang_title' | 'faq_offline_title';
  descKey: 'faq_qr_desc' | 'faq_gps_desc' | 'faq_missing_desc' | 'faq_trip_desc' | 'faq_lang_desc' | 'faq_offline_desc';
}

interface DriverTicket {
  id: number;
  ticketId: string;
  category: string;
  priority: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  replies: Array<{ sender: string; message: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

export default function HelpSupportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const isDark = theme.isDark;

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [issueCategory, setIssueCategory] = useState<string>('QR Scanner');
  const [bugDescription, setBugDescription] = useState<string>('');
  const [screenshotAttached, setScreenshotAttached] = useState<boolean>(false);
  const [submittingBug, setSubmittingBug] = useState<boolean>(false);

  // Tickets state
  const [tickets, setTickets] = useState<DriverTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const fetchTickets = React.useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await get<{ data: DriverTicket[] }>('/mobile/driver/tickets');
      if (res.success && Array.isArray(res.data)) {
        setTickets(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingTicketId(ticketId);
    try {
      const res = await del(`/mobile/driver/tickets?ticketId=${ticketId}`);
      if (res.success) {
        toast.success(`Ticket ${ticketId} deleted.`);
        await fetchTickets();
      } else {
        toast.error(res.message || 'Failed to delete ticket.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete ticket.');
    } finally {
      setDeletingTicketId(null);
    }
  };

  const faqs: FaqItem[] = [
    { id: 'faq-1', titleKey: 'faq_qr_title', descKey: 'faq_qr_desc' },
    { id: 'faq-2', titleKey: 'faq_gps_title', descKey: 'faq_gps_desc' },
    { id: 'faq-3', titleKey: 'faq_missing_title', descKey: 'faq_missing_desc' },
    { id: 'faq-4', titleKey: 'faq_trip_title', descKey: 'faq_trip_desc' },
    { id: 'faq-5', titleKey: 'faq_lang_title', descKey: 'faq_lang_desc' },
    { id: 'faq-6', titleKey: 'faq_offline_title', descKey: 'faq_offline_desc' },
  ];

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+9118001234567').catch(() => {
      toast.error('Unable to place support call.');
    });
  };

  const handleWhatsappSupport = () => {
    Linking.openURL('https://wa.me/919876543210?text=Hello%20EduPredict%20Support').catch(() => {
      toast.info('WhatsApp Support: +91 98765 43210');
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@edupredict.ai?subject=Driver%20Partner%20Support').catch(() => {
      toast.info('Email Support: support@edupredict.ai');
    });
  };

  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) {
      toast.error('Please describe the issue before submitting.');
      return;
    }
    setSubmittingBug(true);
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
      };

      const res = await post<{ ticketId: string }>('/mobile/driver/tickets', {
        category: issueCategory,
        priority: 'HIGH',
        message: bugDescription.trim(),
        deviceInfo,
      });

      setBugDescription('');
      setScreenshotAttached(false);
      toast.success(`Bug report ${res.data?.ticketId ? `(${res.data.ticketId})` : ''} submitted successfully!`);
      await fetchTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit support ticket.');
    } finally {
      setSubmittingBug(false);
    }
  };

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <Header title={t('help_title')} showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* FAQ ACCORDION GROUP */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('section_faq')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <React.Fragment key={faq.id}>
                  {idx > 0 && <Divider color={theme.colors.borderSubtle} />}
                  <TouchableOpacity onPress={() => toggleFaq(faq.id)} style={styles.faqHeader}>
                    <View style={styles.faqTitleRow}>
                      <Ionicons
                        name="help-circle-outline"
                        size={18}
                        color={isExpanded ? (isDark ? '#38BDF8' : '#2563EB') : theme.colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.faqTitle,
                          {
                            fontFamily: isExpanded ? theme.fonts.bold : theme.fonts.medium,
                            color: isExpanded ? theme.colors.textPrimary : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {t(faq.titleKey)}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <Text style={[styles.faqDesc, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                        {t(faq.descKey)}
                      </Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* CONTACT SUPPORT BUTTONS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('section_contact')}
          </Text>
          <View style={styles.contactRow}>
            <TouchableOpacity
              onPress={handleCallSupport}
              style={[
                styles.contactBtn,
                { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BFDBFE' },
              ]}
            >
              <Ionicons name="call" size={18} color={isDark ? '#38BDF8' : '#2563EB'} />
              <Text style={[styles.contactBtnText, { fontFamily: theme.fonts.bold, color: isDark ? '#38BDF8' : '#2563EB' }]}>
                {t('btn_call_support')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsappSupport}
              style={[
                styles.contactBtn,
                { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0' },
              ]}
            >
              <Ionicons name="logo-whatsapp" size={18} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.contactBtnText, { fontFamily: theme.fonts.bold, color: isDark ? '#34D399' : '#059669' }]}>
                {t('btn_whatsapp_support')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailSupport}
              style={[
                styles.contactBtn,
                { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F3E8FF', borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : '#DDD6FE' },
              ]}
            >
              <Ionicons name="mail" size={18} color={isDark ? '#A78BFA' : '#7C3AED'} />
              <Text style={[styles.contactBtnText, { fontFamily: theme.fonts.bold, color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                {t('btn_email_support')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* REPORT BUG FORM */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('section_report_bug')}
          </Text>
          <View style={[styles.card, styles.formPadding, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: theme.fonts.bold, color: theme.colors.textSecondary }]}>
              {t('label_issue_category')}
            </Text>
            <View style={styles.categoryChipsRow}>
              {['QR Scanner', 'GPS Track', 'Attendance', 'Other'].map((cat) => {
                const selected = issueCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setIssueCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#3E6BFF')
                          : (isDark ? '#202544' : '#F3F4F6'),
                        borderColor: selected ? (isDark ? '#38BDF8' : '#2563EB') : theme.colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          fontFamily: theme.fonts.bold,
                          color: selected ? '#FFFFFF' : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, marginTop: 14 }]}>
              {t('label_description')}
            </Text>
            <TextInput
              value={bugDescription}
              onChangeText={setBugDescription}
              placeholder={t('placeholder_desc')}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={true}
              numberOfLines={4}
              style={[
                styles.textArea,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                  fontFamily: theme.fonts.regular,
                },
              ]}
            />

            <View style={styles.formActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  setScreenshotAttached(!screenshotAttached);
                  toast.info(screenshotAttached ? 'Screenshot detached' : 'Screenshot attached');
                }}
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: screenshotAttached
                      ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5')
                      : (isDark ? '#202544' : '#F3F4F6'),
                    borderColor: screenshotAttached ? (isDark ? '#34D399' : '#059669') : theme.colors.borderSubtle,
                  },
                ]}
              >
                <Ionicons
                  name={screenshotAttached ? 'checkmark-circle' : 'attach-outline'}
                  size={16}
                  color={screenshotAttached ? (isDark ? '#34D399' : '#059669') : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.attachBtnText,
                    {
                      fontFamily: theme.fonts.medium,
                      color: screenshotAttached ? (isDark ? '#34D399' : '#059669') : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {screenshotAttached ? 'Attached' : t('btn_attach_screenshot')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={submittingBug}
                onPress={handleSubmitBugReport}
                style={[styles.submitBtn, { backgroundColor: '#38BDF8' }]}
              >
                <Text style={[styles.submitBtnText, { fontFamily: theme.fonts.bold, color: '#090B14' }]}>
                  {submittingBug ? 'Submitting...' : t('btn_submit_ticket')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MY SUBMITTED TICKETS SECTION */}
        {tickets.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
              MY SUBMITTED TICKETS ({tickets.length})
            </Text>
            <View style={{ gap: 12 }}>
              {tickets.map((ticket) => {
                const statusBg =
                  ticket.status === 'RESOLVED'
                    ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7')
                    : ticket.status === 'IN_PROGRESS'
                    ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#DBEAFE')
                    : ticket.status === 'CLOSED'
                    ? (isDark ? 'rgba(156, 163, 175, 0.15)' : '#F3F4F6')
                    : (isDark ? 'rgba(251, 191, 36, 0.15)' : '#FEF3C7');

                const statusColor =
                  ticket.status === 'RESOLVED'
                    ? (isDark ? '#34D399' : '#166534')
                    : ticket.status === 'IN_PROGRESS'
                    ? (isDark ? '#38BDF8' : '#1E40AF')
                    : ticket.status === 'CLOSED'
                    ? (isDark ? '#9CA3AF' : '#4B5563')
                    : (isDark ? '#FBBF24' : '#92400E');

                return (
                  <View
                    key={ticket.id}
                    style={[
                      styles.card,
                      styles.formPadding,
                      { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, gap: 10 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14, color: theme.colors.textPrimary }}>
                          {ticket.ticketId}
                        </Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: isDark ? '#202544' : '#F3F4F6' }}>
                          <Text style={{ fontSize: 11, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
                            {ticket.category}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: statusBg }}>
                          <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: statusColor }}>
                            {ticket.status}
                          </Text>
                        </View>

                        <TouchableOpacity
                          disabled={deletingTicketId === ticket.ticketId}
                          onPress={() => handleDeleteTicket(ticket.ticketId)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.danger || '#EF4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                      {ticket.message}
                    </Text>

                    {ticket.replies && ticket.replies.length > 0 && (
                      <View style={{ backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF', padding: 10, borderRadius: 12, gap: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: isDark ? '#38BDF8' : '#0284C7' }}>
                          ADMIN REPLIES ({ticket.replies.length}):
                        </Text>
                        {ticket.replies.map((rep, idx) => (
                          <Text key={idx} style={{ fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textPrimary }}>
                            <Text style={{ fontFamily: theme.fonts.bold }}>{rep.sender}: </Text>
                            {rep.message}
                          </Text>
                        ))}
                      </View>
                    )}

                    <Text style={{ fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.textTertiary }}>
                      Created: {new Date(ticket.createdAt).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* FOOTER VERSION BUILD INFORMATION */}
        <View style={styles.footer}>
          <Text style={[styles.footerTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
            {t('footer_partner')}
          </Text>
          <Text style={[styles.footerText, { fontFamily: theme.fonts.mono, color: theme.colors.textSecondary }]}>
            {t('footer_version')}
          </Text>
          <Text style={[styles.footerSub, { fontFamily: theme.fonts.regular, color: theme.colors.textTertiary }]}>
            {t('footer_last_update')}
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  faqTitle: {
    fontSize: 14,
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingLeft: 44,
  },
  faqDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  contactBtnText: {
    fontSize: 12,
  },
  formPadding: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  textArea: {
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  formActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  attachBtnText: {
    fontSize: 12,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 3,
  },
  footerTitle: {
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
  },
  footerSub: {
    fontSize: 11,
  },
});
