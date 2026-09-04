import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  Coffee,
  Droplets,
  ExternalLink,
  Filter,
  Heart,
  Leaf,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  Moon,
  MoveUpRight,
  NotebookPen,
  Play,
  PenLine,
  RotateCcw,
  Send,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';

import {
  getGetNotificationPreferencesQueryKey,
  getGetSessionQueryKey,
  getListChatMessagesQueryKey,
  getListEntriesQueryKey,
  useClearChatMessages,
  useCreateEntry,
  useCreateSession,
  useGetMoveRecommendation,
  useGetNotificationPreferences,
  useGetReadRecommendation,
  useGetSession,
  useHealthCheck,
  useListChatMessages,
  useListEntries,
  useListMoveVideos,
  useLogNotificationEngagement,
  useLogout,
  useSendChatMessage,
  useSendMagicLink,
  useUpdateNotificationPreferences,
  useVerifyMagicLink,
  type ChatMessage,
} from '@workspace/api-client-react';



import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

type EntryFormState = {
  bookName: string;
  pagesRead: string;
  steps: string;
  stretched: boolean;
  skincare: boolean;
  waterLiters: string;
  enjoyedMeal: boolean;
  note: string;
};

const emptyEntry: EntryFormState = {
  bookName: '',
  pagesRead: '',
  steps: '',
  stretched: false,
  skincare: false,
  waterLiters: '',
  enjoyedMeal: false,
  note: '',
};

const navItems = [
  { href: '/move', label: 'Move', icon: MoveUpRight, detail: 'a little motion' },
  { href: '/read', label: 'Read', icon: BookOpen, detail: 'a few pages' },
  { href: '/talk', label: 'Talk', icon: MessageCircle, detail: 'a soft landing' },
  { href: '/log', label: 'Log', icon: NotebookPen, detail: 'keep the thread' },
];

function ReminderSettingsModal({ onClose }: { onClose: () => void }) {
  const { data: prefs, isLoading } = useGetNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('19:00-21:00');
  const [customSlot, setCustomSlot] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (prefs) {
      setEnabled(prefs.enabled ?? true);
      if (prefs.preferredTimeSlot) {
        const presets = ['08:00-10:00', '12:00-14:00', '15:00-17:00', '19:00-21:00', '22:00-00:00'];
        if (presets.includes(prefs.preferredTimeSlot)) {
          setPreferredTimeSlot(prefs.preferredTimeSlot);
          setIsCustom(false);
        } else {
          setPreferredTimeSlot('custom');
          setCustomSlot(prefs.preferredTimeSlot);
          setIsCustom(true);
        }
      }
    }
  }, [prefs]);

  const handleSave = () => {
    const slotToSave = isCustom ? customSlot : preferredTimeSlot;
    updateMutation.mutate(
      {
        data: {
          enabled,
          preferredTimeSlot: slotToSave || '19:00-21:00',
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotificationPreferencesQueryKey() });
          setSavedSuccess(true);
          setTimeout(() => {
            setSavedSuccess(false);
            onClose();
          }, 1200);
        },
      }
    );
  };

  const presetOptions = [
    { value: '08:00-10:00', label: 'Morning reflection (8:00 AM – 10:00 AM)' },
    { value: '12:00-14:00', label: 'Mid-day breather (12:00 PM – 2:00 PM)' },
    { value: '15:00-17:00', label: 'Mid-afternoon slump (3:00 PM – 5:00 PM)' },
    { value: '19:00-21:00', label: 'Evening unwinding (7:00 PM – 9:00 PM)' },
    { value: '22:00-00:00', label: 'Late night thoughts (10:00 PM – 12:00 AM)' },
  ];

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-stone-50 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 text-stone-800 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          data-testid="button-close-reminder-settings"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Bell className="text-emerald-700" size={20} />
          <h2 className="text-lg font-serif font-medium text-emerald-900">Check-in Reminders</h2>
        </div>
        <p className="text-xs text-stone-600 mb-5 leading-relaxed">
          Pick a gentle window during your day when you&apos;d like a soft reminder to check in with yourself.
        </p>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-stone-500">Loading preferences...</div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 border-stone-300"
                data-testid="checkbox-reminder-enabled"
              />
              <span className="text-sm font-medium text-stone-700">Enable gentle in-app reminders</span>
            </label>

            {enabled && (
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block">
                  Preferred Time Slot
                </span>
                <div className="space-y-2">
                  {presetOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
                      <input
                        type="radio"
                        name="timeSlot"
                        value={opt.value}
                        checked={!isCustom && preferredTimeSlot === opt.value}
                        onChange={() => {
                          setIsCustom(false);
                          setPreferredTimeSlot(opt.value);
                        }}
                        className="text-emerald-700 focus:ring-emerald-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="radio"
                      name="timeSlot"
                      value="custom"
                      checked={isCustom}
                      onChange={() => {
                        setIsCustom(true);
                        setPreferredTimeSlot('custom');
                      }}
                      className="text-emerald-700 focus:ring-emerald-500"
                    />
                    <span>Custom time range (e.g. 18:00-20:00)</span>
                  </label>

                  {isCustom && (
                    <div className="pl-6 pt-1">
                      <input
                        type="text"
                        placeholder="HH:MM-HH:MM (e.g. 18:00-20:00)"
                        value={customSlot}
                        onChange={(e) => setCustomSlot(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-700 text-stone-50 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                data-testid="button-save-reminder-settings"
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} /> Saved
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * NOTE FOR FUTURE DEVELOPERS & DEPLOYMENT:
 * This in-app reminder system operates within the open browser tab session.
 * It periodically checks if the current time falls within the user's preferred time slot
 * and surfaces a soft, gentle banner if the user hasn't checked in today.
 *
 * It intentionally does NOT use Web Push (ServiceWorker PushManager / PushSubscription),
 * which requires service worker registration, push servers, VAPID keypair configuration,
 * and SSL domain origins (which are unavailable on standard localhost dev environments).
 * When moving to production with real push capabilities, backend background cron jobs
 * can consume the `softly_notification_preferences` table to send web push triggers.
 */
function InAppReminderBanner() {
  const { data: prefs } = useGetNotificationPreferences();
  const logEngagement = useLogNotificationEngagement();
  const [, setLocation] = useLocation();

  const [visible, setVisible] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [hasLoggedShown, setHasLoggedShown] = useState(false);

  useEffect(() => {
    if (!prefs || !prefs.enabled || prefs.checkedInToday || dismissedThisSession) {
      setVisible(false);
      return;
    }

    const checkTime = () => {
      const slot = prefs.preferredTimeSlot || '19:00-21:00';
      const parts = slot.split('-');
      if (parts.length !== 2) return;

      const [startStr, endStr] = parts;
      const startHour = parseInt(startStr.split(':')[0], 10);
      const endHour = parseInt(endStr.split(':')[0], 10);
      const currentHour = new Date().getHours();

      let inSlot = false;
      if (!isNaN(startHour) && !isNaN(endHour)) {
        if (startHour <= endHour) {
          inSlot = currentHour >= startHour && currentHour <= endHour;
        } else {
          // Handles overnight slots like 22:00-02:00
          inSlot = currentHour >= startHour || currentHour <= endHour;
        }
      }

      if (inSlot && !dismissedThisSession) {
        if (!visible) {
          setVisible(true);
          if (!hasLoggedShown) {
            setHasLoggedShown(true);
            logEngagement.mutate({
              data: {
                action: 'shown',
                timeSlot: slot,
              },
            });
          }
        }
      } else {
        setVisible(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [prefs, dismissedThisSession, visible, hasLoggedShown]);

  if (!visible) return null;

  const handleAction = (targetPath: string) => {
    setVisible(false);
    logEngagement.mutate({
      data: {
        action: 'engaged',
        timeSlot: prefs?.preferredTimeSlot,
      },
    });
    setLocation(targetPath);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissedThisSession(true);
    logEngagement.mutate({
      data: {
        action: 'dismissed',
        timeSlot: prefs?.preferredTimeSlot,
      },
    });
  };

  return (
    <div
      className="fixed bottom-5 right-5 max-w-sm w-[calc(100%-2.5rem)] bg-stone-900 text-stone-100 p-4 rounded-2xl shadow-2xl z-40 border border-stone-800 animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="banner-in-app-reminder"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock3 className="text-amber-300 shrink-0" size={18} />
          <span className="font-serif font-medium text-amber-100 text-sm">Soft-landing time</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer"
          title="Dismiss reminder"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-stone-300 leading-relaxed mb-3">
        This is your chosen check-in window. Would you like to take a moment for yourself today?
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleAction('/talk')}
          className="px-3 py-1.5 bg-amber-200 hover:bg-amber-100 text-stone-900 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          data-testid="button-reminder-talk"
        >
          Talk with Companion →
        </button>
        <button
          type="button"
          onClick={() => handleAction('/log')}
          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-medium rounded-lg transition-colors border border-stone-700 cursor-pointer"
          data-testid="button-reminder-log"
        >
          Log Entry →
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-2 py-1.5 text-xs text-stone-400 hover:text-stone-200 ml-auto cursor-pointer"
          data-testid="button-reminder-dismiss"
        >
          Not right now
        </button>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const { data: session, isLoading: sessionLoading } = useGetSession();
  const { data: health } = useHealthCheck();
  const logout = useLogout();
  const queryClientForAppShell = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClientForAppShell.setQueryData(getGetSessionQueryKey(), {
          sessionId: null,
          userId: null,
          email: null,
          username: null,
          isSignedIn: false,
          helpPreferences: [],
          checkInTime: null,
        });
      },
    });
  };

  return (
    <div className="softly-app min-h-[100dvh]">
      <header className="topbar">
        <Link href="/" className="brand-mark" data-testid="link-home-brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-symbol" aria-hidden="true"><Leaf size={16} strokeWidth={2.2} /></span>
          <span>softly</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${location === href ? 'nav-link-active' : ''}`}
              data-testid={`link-nav-${label.toLowerCase()}`}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="topbar-end">
          <div className="presence" data-testid="status-health">
            <span className={`presence-dot ${health?.status === 'ok' ? 'presence-dot-live' : ''}`} />
            <span className="hidden sm:inline">{health?.status === 'ok' ? 'here with you' : 'taking a breath'}</span>
          </div>

          <button
            type="button"
            className="p-1.5 text-stone-600 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-200/60 flex items-center justify-center cursor-pointer"
            onClick={() => setShowReminderSettings(true)}
            title="Check-in reminder settings"
            data-testid="button-reminder-settings"
          >
            <Bell size={18} />
          </button>

          {!sessionLoading && session?.isSignedIn && (
            <div className="flex items-center gap-2">
              <span className="user-chip" data-testid="text-username">
                {session.email || session.username}
              </span>
              <button
                type="button"
                className="text-xs text-stone-500 hover:text-stone-800 underline ml-1"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                sign out
              </button>
            </div>
          )}
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileOpen((open) => !open)}
            data-testid="button-toggle-navigation"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>


      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map(({ href, label, icon: Icon, detail }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-link ${location === href ? 'mobile-nav-link-active' : ''}`}
              onClick={() => setMobileOpen(false)}
              data-testid={`link-mobile-nav-${label.toLowerCase()}`}
            >
              <span className="mobile-nav-icon"><Icon size={18} /></span>
              <span><strong>{label}</strong><small>{detail}</small></span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </nav>
      )}

      <main className="page-frame">{children}</main>
      <footer className="site-footer">
        <span>small things count here</span>
        <span className="footer-rule" />
        <span>softly, one day at a time</span>
      </footer>

      {showReminderSettings && (
        <ReminderSettingsModal onClose={() => setShowReminderSettings(false)} />
      )}
      <InAppReminderBanner />
    </div>
  );
}

const SUPPORT_OPTIONS = [
  {
    id: "overwhelmed-food",
    label: "A quiet, non-judgmental ear when feeling overwhelmed or reaching for food",
  },
  {
    id: "gentle-reminders",
    label: "Gentle reminders to breathe, stretch, and drink water",
  },
  {
    id: "distracting-reads",
    label: "Distracting cozy reads & easy movement ideas when stressed",
  },
  {
    id: "safe-logging",
    label: "A safe space to notice small wins without scores or pressure",
  },
];

const TIME_SLOTS = [
  {
    id: "morning",
    title: "Morning reflection",
    sub: "8:00 AM – 10:00 AM",
    time: "09:00",
    icon: Sun,
  },
  {
    id: "afternoon",
    title: "Mid-afternoon slump",
    sub: "3:00 PM – 5:00 PM",
    time: "16:00",
    icon: Coffee,
  },
  {
    id: "evening",
    title: "Evening unwinding",
    sub: "7:00 PM – 9:00 PM",
    time: "20:00",
    icon: Moon,
  },
  {
    id: "night",
    title: "Late night thoughts",
    sub: "10:00 PM – 12:00 AM",
    time: "23:00",
    icon: Sparkles,
  },
];

function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return "8:00 PM";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const minute = m || "00";
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function Welcome() {
  const queryClientForSession = useQueryClient();
  const { data: session } = useGetSession();
  const createSession = useCreateSession();
  const sendMagicLink = useSendMagicLink();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState('');
  const [devMagicUrl, setDevMagicUrl] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    SUPPORT_OPTIONS[0].label,
    SUPPORT_OPTIONS[1].label,
  ]);
  const [selectedTime, setSelectedTime] = useState<string>('20:00');
  const [customTime, setCustomTime] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [signedInMessage, setSignedInMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (session?.isSignedIn) {
      if (session.username) setUsername(session.username);
      if (session.email) setEmail(session.email);
      if (session.helpPreferences && session.helpPreferences.length > 0) {
        setSelectedPreferences(session.helpPreferences);
      }
      if (session.checkInTime) {
        setSelectedTime(session.checkInTime);
      }
    }
  }, [session]);

  const togglePreference = (label: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSendEmailLink = (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    setValidationError('');

    const derivedName = username.trim() || trimmedEmail.split('@')[0] || 'friend';

    createSession.mutate({
      data: {
        username: derivedName,
        email: trimmedEmail,
        helpPreferences: selectedPreferences,
        checkInTime: customTime || selectedTime || '20:00',
      },
    });

    sendMagicLink.mutate(
      { data: { email: trimmedEmail } },
      {
        onSuccess: (res) => {
          setMagicLinkSent(`We've generated your magic link for ${trimmedEmail}.`);
          if (res.devMagicLink) {
            setDevMagicUrl(res.devMagicLink);
          }
        },
        onError: () => {
          setValidationError('Could not send magic link. Please check your email address.');
        },
      },
    );
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleFinalSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const derivedName = username.trim() || (trimmedEmail ? trimmedEmail.split('@')[0] : '') || 'friend';
    const finalCheckInTime = customTime || selectedTime || '20:00';

    if (trimmedEmail && trimmedEmail.includes('@') && !magicLinkSent) {
      sendMagicLink.mutate(
        { data: { email: trimmedEmail } },
        {
          onSuccess: (res) => {
            setMagicLinkSent(`We've generated your magic link for ${trimmedEmail}.`);
            if (res.devMagicLink) setDevMagicUrl(res.devMagicLink);
          },
        },
      );
    }

    createSession.mutate(
      {
        data: {
          username: derivedName,
          email: trimmedEmail || undefined,
          helpPreferences: selectedPreferences,
          checkInTime: finalCheckInTime,
        },
      },
      {
        onSuccess: (nextSession) => {
          queryClientForSession.setQueryData(getGetSessionQueryKey(), nextSession);
          setSignedInMessage(`Good to have you here, ${nextSession.username}.`);
          setIsEditing(false);
        },
      },
    );
  };

  return (
    <div className="welcome-page">
      <section className="welcome-hero">
        <div className="hero-copy softly-reveal">
          <p className="eyebrow"><span className="eyebrow-line" /> a quiet place to notice</p>
          <h1>Care doesn&apos;t<br /><em>need a score.</em></h1>
          <p className="hero-intro">
            Softly is a small notebook for the things you do to look after yourself.
            No streaks. No gold stars. Just a place to remember.
          </p>
          <div className="hero-actions">
            <Link href="/log" className="primary-button" data-testid="link-start-check-in">
              <NotebookPen size={17} />
              <span>Open today&apos;s page</span>
              <ArrowRight size={16} />
            </Link>
            {!session?.isSignedIn && (
              <a href="#begin" className="text-button" data-testid="link-begin-below">
                begin quietly <ArrowRight size={15} />
              </a>
            )}
          </div>
        </div>
        <div className="hero-art softly-reveal" aria-label="An abstract sunlit garden illustration">
          <div className="art-sun" />
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-stem art-stem-one"><span /></div>
          <div className="art-stem art-stem-two"><span /></div>
          <div className="art-stem art-stem-three"><span /></div>
          <div className="art-note">
            <span className="art-note-kicker">today, gently</span>
            <span className="art-note-line">I made room</span>
            <span className="art-note-line art-note-line-short">for myself.</span>
            <span className="art-note-sign">— you</span>
          </div>
          <span className="art-caption">a little room to breathe</span>
        </div>
      </section>

      <section className="welcome-band">
        <div className="band-label">the soft spots</div>
        <p>Four small doorways back to yourself.</p>
        <div className="doorway-grid">
          {navItems.map(({ href, label, icon: Icon, detail }, index) => (
            <Link
              href={href}
              key={href}
              className={`doorway doorway-${index + 1}`}
              data-testid={`card-doorway-${label.toLowerCase()}`}
            >
              <span className="doorway-number">0{index + 1}</span>
              <Icon className="doorway-icon" size={21} strokeWidth={1.65} />
              <span className="doorway-label">{label}</span>
              <span className="doorway-detail">{detail}</span>
              <ArrowRight className="doorway-arrow" size={17} />
            </Link>
          ))}
        </div>
      </section>

      {(!session?.isSignedIn || isEditing) && (
        <section className="onboarding-card" id="begin" data-testid="section-onboarding">
          <div className="onboarding-header">
            <div className="step-indicator">
              <span className={`step-dot ${step === 1 ? 'step-dot-active' : step > 1 ? 'step-dot-done' : ''}`}>1</span>
              <span className={`step-line ${step > 1 ? 'step-line-active' : ''}`} />
              <span className={`step-dot ${step === 2 ? 'step-dot-active' : step > 2 ? 'step-dot-done' : ''}`}>2</span>
              <span className={`step-line ${step > 2 ? 'step-line-active' : ''}`} />
              <span className={`step-dot ${step === 3 ? 'step-dot-active' : ''}`}>3</span>
            </div>
            {isEditing && (
              <button
                type="button"
                className="onboarding-btn-back"
                onClick={() => setIsEditing(false)}
              >
                cancel
              </button>
            )}
          </div>

          {step === 1 && (
            <div className="onboarding-body softly-reveal">
              <p className="eyebrow"><span className="eyebrow-line" /> step 1 of 3 — passwordless sign-in</p>
              <h2>Where can we<br /><em>reach you?</em></h2>
              <p className="onboarding-copy">Enter your email to receive your magic link and open your private space.</p>
              {magicLinkSent ? (
                <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-sm my-4 shadow-sm">
                  <p className="font-medium text-base mb-1 flex items-center gap-1.5 text-emerald-900">
                    <Check size={18} className="text-emerald-600 shrink-0" />
                    <span>{magicLinkSent}</span>
                  </p>
                  <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                    Local dev mode active (no external email service key set in <code>.env</code>). Click below to log in directly:
                  </p>
                  {devMagicUrl && (
                    <a
                      href={devMagicUrl}
                      className="primary-button w-full justify-center py-2.5 px-4 text-xs font-medium bg-emerald-800 text-white hover:bg-emerald-900 rounded-xl transition-colors inline-flex items-center gap-2"
                      data-testid="link-dev-magic-url"
                    >
                      <Sparkles size={14} />
                      <span>Click to log in as {email || 'user'} instantly →</span>
                    </a>
                  )}
                  <div className="mt-3 pt-2 text-right">
                    <button
                      type="button"
                      className="text-xs font-medium text-stone-600 underline hover:text-stone-900 cursor-pointer"
                      onClick={() => setStep(2)}
                    >
                      Continue setting preferences →
                    </button>
                  </div>
                </div>
              ) : (
                <form className="name-form space-y-3" onSubmit={handleSendEmailLink}>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-stone-600 mb-1">your email</label>
                    <div className="name-input-row">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (validationError) setValidationError('');
                        }}
                        placeholder="email address (e.g. alex@example.com)"
                        data-testid="input-email"
                        required
                        autoFocus
                      />
                      <button type="submit" className="circle-submit" disabled={sendMagicLink.isPending} data-testid="button-send-magic-link" title="Send magic link">
                        {sendMagicLink.isPending ? <span className="button-dots">...</span> : <ArrowRight size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-xs font-medium text-stone-600 mb-1">what should we call you? (optional)</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="your name or nickname (e.g. Alex)"
                      className="w-full text-xs px-3 py-2 border-b border-stone-300 bg-transparent focus:outline-none focus:border-emerald-700"
                      data-testid="input-name-optional"
                    />
                  </div>
                  {validationError && <p className="form-error" data-testid="status-session-error">{validationError}</p>}
                  {sendMagicLink.isError && <p className="form-error" data-testid="status-session-error">Could not send magic link. Please check your email address.</p>}
                </form>
              )}
              <div className="onboarding-actions mt-4">
                <span />
                <button type="button" className="onboarding-btn-next" onClick={() => setStep(2)} data-testid="button-next-step-1">
                  <span>continue to preferences</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}


          {step === 2 && (
            <div className="onboarding-body softly-reveal">
              <p className="eyebrow"><span className="eyebrow-line" /> step 2 of 3 — support</p>
              <h2>How can we best<br /><em>support you?</em></h2>
              <p className="onboarding-copy">Select whatever resonates right now. There are no wrong answers.</p>
              <div className="options-grid">
                {SUPPORT_OPTIONS.map((opt) => {
                  const isSelected = selectedPreferences.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`option-card ${isSelected ? 'option-card-selected' : ''}`}
                      onClick={() => togglePreference(opt.label)}
                      data-testid={`card-pref-${opt.id}`}
                    >
                      <span className="option-checkbox">
                        {isSelected && <Check size={14} strokeWidth={2.5} />}
                      </span>
                      <span className="option-text">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="onboarding-actions">
                <button type="button" className="onboarding-btn-back" onClick={() => setStep(1)} data-testid="button-back-step-2">
                  <ArrowLeft size={15} />
                  <span>back</span>
                </button>
                <button type="button" className="onboarding-btn-next" onClick={handleStep2Next} data-testid="button-next-step-2">
                  <span>continue</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-body softly-reveal">
              <p className="eyebrow"><span className="eyebrow-line" /> step 3 of 3 — timing & check-in</p>
              <h2>When do you usually<br /><em>feel overwhelmed?</em></h2>
              <p className="onboarding-copy">
                Tell us when you could most use a gentle companion. We&apos;ll schedule a supportive check-in notification around this time.
              </p>
              <form onSubmit={handleFinalSubmit}>
                <div className="time-grid">
                  {TIME_SLOTS.map((slot) => {
                    const Icon = slot.icon;
                    const isSelected = selectedTime === slot.time && !customTime;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`time-slot-card ${isSelected ? 'time-slot-selected' : ''}`}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setCustomTime('');
                        }}
                        data-testid={`card-time-${slot.id}`}
                      >
                        <span className="time-slot-icon"><Icon size={17} /></span>
                        <div>
                          <strong className="time-slot-title">{slot.title}</strong>
                          <span className="time-slot-sub">{slot.sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="custom-time-row">
                  <label htmlFor="custom-check-in-time">or pick your exact time:</label>
                  <input
                    id="custom-check-in-time"
                    type="time"
                    value={customTime || (selectedTime && selectedTime.includes(':') ? selectedTime : '20:00')}
                    onChange={(e) => {
                      setCustomTime(e.target.value);
                      setSelectedTime(e.target.value);
                    }}
                    data-testid="input-custom-time"
                  />
                </div>

                {createSession.isError && (
                  <p className="form-error" data-testid="status-session-error">
                    Could not save your preferences. Please try again.
                  </p>
                )}

                <div className="onboarding-actions">
                  <button type="button" className="onboarding-btn-back" onClick={() => setStep(2)} data-testid="button-back-step-3">
                    <ArrowLeft size={15} />
                    <span>back</span>
                  </button>
                  <button type="submit" className="onboarding-btn-next" disabled={createSession.isPending} data-testid="button-save-all">
                    <span>{createSession.isPending ? 'saving gently...' : 'save my space'}</span>
                    {createSession.isPending ? <span className="button-dots">...</span> : <ArrowRight size={15} />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {session?.isSignedIn && !isEditing && (
        <section className="signed-in-note softly-reveal" data-testid="status-signed-in">
          <div className="signed-in-header">
            <span className="user-badge">
              <Sparkles size={17} />
              <strong>Welcome, {session.username}.</strong>
            </span>
            <button
              type="button"
              className="edit-pref-btn"
              onClick={() => {
                setIsEditing(true);
                setStep(1);
              }}
              data-testid="button-edit-preferences"
              title="Change your check-in time or support goals"
            >
              <span>preferences</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="signed-in-summary">
            <span className="notification-pill">
              <Bell size={13} />
              <span>Daily check-in: {formatTimeDisplay(session.checkInTime)}</span>
            </span>
            {session.helpPreferences && session.helpPreferences.length > 0 && (
              <div className="pref-tag-list">
                {session.helpPreferences.map((pref, i) => (
                  <span key={i} className="pref-tag">{pref}</span>
                ))}
              </div>
            )}
          </div>

          <div className="signed-in-actions">
            <Link href="/talk" data-testid="link-signed-in-talk">talk with companion <ArrowRight size={14} /></Link>
            <Link href="/log" data-testid="link-signed-in-log">open today&apos;s log <ArrowRight size={14} /></Link>
          </div>
        </section>
      )}
    </div>
  );
}


function LogPage() {
  const queryClientForEntries = useQueryClient();
  const { data: session } = useGetSession();
  const { data: entries, isLoading, isError, refetch } = useListEntries();
  const createEntry = useCreateEntry();
  const [form, setForm] = useState<EntryFormState>(emptyEntry);
  const [savedMessage, setSavedMessage] = useState('');


  const updateForm = <K extends keyof EntryFormState>(key: K, value: EntryFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedMessage('');
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedMessage('');
    createEntry.mutate(
      {
        data: {
          bookName: form.bookName.trim(),
          pagesRead: Number(form.pagesRead) || 0,
          steps: Number(form.steps) || 0,
          stretched: form.stretched,
          skincare: form.skincare,
          waterLiters: Number(form.waterLiters) || 0,
          enjoyedMeal: form.enjoyedMeal,
          note: form.note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          queryClientForEntries.invalidateQueries({ queryKey: getListEntriesQueryKey() });
          setForm(emptyEntry);
          setSavedMessage('Saved for today. That was enough.');
        },
      },
    );
  };

  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="log-page">
      <section className="log-heading softly-reveal">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> {todayLabel}</p>
          <h1>Your daily<br /><em>check-in.</em></h1>
        </div>
        <div className="heading-note">
          <Heart size={17} />
          <span>No need to do<br />every little thing.</span>
        </div>
      </section>

      <div className="log-layout">
        <section className="checkin-paper softly-reveal">
          <div className="paper-topline">
            <span>today&apos;s page</span>
            {session?.isSignedIn && <span className="paper-name">{session.username}&apos;s notes</span>}
          </div>
          <form onSubmit={handleSave} className="checkin-form">
            <fieldset className="form-group">
              <legend><span className="form-number">01</span> a few quiet wins</legend>
              <div className="care-grid">
                <CareToggle label="I stretched" active={form.stretched} onChange={(value) => updateForm('stretched', value)} testId="stretched" />
                <CareToggle label="I cared for my skin" active={form.skincare} onChange={(value) => updateForm('skincare', value)} testId="skincare" />
                <CareToggle label="I enjoyed a meal" active={form.enjoyedMeal} onChange={(value) => updateForm('enjoyedMeal', value)} testId="enjoyed-meal" />
              </div>
            </fieldset>

            <fieldset className="form-group">
              <legend><span className="form-number">02</span> what found its way in?</legend>
              <div className="metric-grid">
                <label className="metric-field">
                  <span>pages read</span>
                  <input type="number" min="0" value={form.pagesRead} onChange={(event) => updateForm('pagesRead', event.target.value)} placeholder="0" data-testid="input-pages-read" />
                  <small>pages</small>
                </label>
                <label className="metric-field">
                  <span>steps taken</span>
                  <input type="number" min="0" value={form.steps} onChange={(event) => updateForm('steps', event.target.value)} placeholder="0" data-testid="input-steps" />
                  <small>steps</small>
                </label>
                <label className="metric-field">
                  <span>water</span>
                  <input type="number" min="0" step="0.1" value={form.waterLiters} onChange={(event) => updateForm('waterLiters', event.target.value)} placeholder="0" data-testid="input-water-liters" />
                  <small>litres</small>
                </label>
              </div>
              <label className="book-field">
                <span>book on the nightstand</span>
                <input type="text" maxLength={120} value={form.bookName} onChange={(event) => updateForm('bookName', event.target.value)} placeholder="or a podcast, or nothing at all" data-testid="input-book-name" />
              </label>
            </fieldset>

            <fieldset className="form-group">
              <legend><span className="form-number">03</span> leave a small note</legend>
              <label className="note-field">
                <span className="sr-only">Today&apos;s note</span>
                <textarea maxLength={200} value={form.note} onChange={(event) => updateForm('note', event.target.value)} placeholder="What would you like to remember about today?" data-testid="input-note" />
                <small>{form.note.length}/200</small>
              </label>
            </fieldset>

            {createEntry.isError && <p className="form-error form-error-wide" data-testid="status-entry-error">That page didn&apos;t save. Take a breath and try once more.</p>}
            {savedMessage && <p className="form-success form-success-wide" data-testid="status-entry-success"><Check size={15} /> {savedMessage}</p>}
            <button type="submit" className="save-button" disabled={createEntry.isPending} data-testid="button-save-entry">
              <span>{createEntry.isPending ? 'saving gently...' : 'save today’s page'}</span>
              {createEntry.isPending ? <span className="button-dots">...</span> : <ArrowRight size={17} />}
            </button>
          </form>
        </section>

        <section className="history-section">
          <div className="history-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> the thread</p>
              <h2>Recent<br /><em>pages.</em></h2>
            </div>
            <span className="history-count" data-testid="text-entry-count">{(Array.isArray(entries) ? entries.length : 0)} saved</span>
          </div>
          {isLoading && <HistorySkeleton />}
          {isError && (
            <div className="state-card" data-testid="status-history-error">
              <p>We couldn&apos;t find your pages.</p>
              <button type="button" onClick={() => refetch()} data-testid="button-retry-history">try again <ArrowRight size={15} /></button>
            </div>
          )}
          {!isLoading && !isError && (!Array.isArray(entries) || entries.length === 0) && (
            <div className="empty-history" data-testid="status-history-empty">
              <NotebookPen size={25} strokeWidth={1.4} />
              <p>Your saved pages will gather here.</p>
              <span>There is no right first entry.</span>
            </div>
          )}
          {!isLoading && !isError && Array.isArray(entries) && entries.length > 0 && (
            <div className="entry-list">
              {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
            </div>
          )}
        </section>
      </div>
    </div>

  );
}

function CareToggle({ label, active, onChange, testId }: { label: string; active: boolean; onChange: (value: boolean) => void; testId: string }) {
  return (
    <button
      type="button"
      className={`care-toggle ${active ? 'care-toggle-active' : ''}`}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      data-testid={`button-care-${testId}`}
    >
      <span className="care-check">{active && <Check size={13} strokeWidth={2.4} />}</span>
      <span>{label}</span>
    </button>
  );
}

function EntryCard({ entry }: { entry: { id: number; entryDate: string; bookName: string; pagesRead: number; steps: number; stretched: boolean; skincare: boolean; waterLiters: number; enjoyedMeal: boolean; note: string | null } }) {
  const date = new Date(`${entry.entryDate}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime()) ? entry.entryDate : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  const careCount = [entry.stretched, entry.skincare, entry.enjoyedMeal].filter(Boolean).length;
  return (
    <article className="entry-card" data-testid={`card-entry-${entry.id}`}>
      <div className="entry-date">
        <span>{dateLabel}</span>
        <span className="entry-dot" />
      </div>
      <div className="entry-summary">
        <div className="entry-stats">
          <span>{careCount} {careCount === 1 ? 'care' : 'cares'}</span>
          {entry.pagesRead > 0 && <span>{entry.pagesRead} pages</span>}
          {entry.steps > 0 && <span>{entry.steps.toLocaleString()} steps</span>}
          {entry.waterLiters > 0 && <span>{entry.waterLiters}L water</span>}
        </div>
        {entry.bookName && <p className="entry-book"><BookOpen size={14} /> {entry.bookName}</p>}
        {entry.note && <p className="entry-note">“{entry.note}”</p>}
      </div>
    </article>
  );
}

function HistorySkeleton() {
  return (
    <div className="history-skeleton" data-testid="status-history-loading">
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-line skeleton-long" />
      <div className="skeleton-line skeleton-medium" />
    </div>
  );
}

type BookRecommendation = {
  title: string;
  author: string;
  description: string;
  summary: string;
  mood: string;
};

const bookRecommendations: BookRecommendation[] = [
  {
    title: "Bridget Jones's Diary",
    author: 'Helen Fielding',
    description: 'Chaotic, funny, and painfully relatable diary entries.',
    summary: 'A hilarious, lighthearted diary chronicling the chaotic life, romantic misadventures, and career hurdles of a thirty-something woman in London. Packed with witty observations, it offers an affectionate reminder that no one has it all figured out.',
    mood: 'cozy',
  },
  {
    title: 'Good Omens',
    author: 'Terry Pratchett & Neil Gaiman',
    description: 'An angel and demon team up to stop the apocalypse, played entirely for laughs.',
    summary: 'When the end of the world is scheduled for next Saturday, an overly polite angel and a fast-living demon who have grown fond of Earth decide to stop it. A delightfully absurd, laugh-out-loud masterpiece of British comedy and cosmic chaos.',
    mood: 'distracting',
  },
  {
    title: 'Bossypants',
    author: 'Tina Fey',
    description: 'Sharp, self-deprecating essays on comedy and career.',
    summary: 'Tina Fey shares her journey from a nerdy girl in Pennsylvania to head writer on SNL and creator of 30 Rock. Sharp, witty, and fiercely honest, it provides short bite-sized chapters that deliver non-stop laughter and empowering career wisdom.',
    mood: 'short read',
  },
  {
    title: 'Becoming',
    author: 'Michelle Obama',
    description: 'A grounded, personal account of power, identity, and public life.',
    summary: 'An intimate, powerful memoir tracing Michelle Obama’s path from the South Side of Chicago to the White House. Rich with warmth, wisdom, and quiet grace, it inspires readers to embrace their own evolving journey.',
    mood: 'inspiring',
  },
  {
    title: 'The Palace Papers',
    author: 'Tina Brown',
    description: 'Sharp reporting on power dynamics inside the British monarchy.',
    summary: 'Veteran journalist Tina Brown pulls back the curtain on modern royal scandals, power struggles, and reinventions. High-stakes, gripping, and filled with sharp insider observations that read like top-tier fiction.',
    mood: 'juicy',
  },
  {
    title: 'She Said',
    author: 'Jodi Kantor & Megan Twohey',
    description: "The reporters' account of breaking the Weinstein story - women confronting institutional power directly.",
    summary: 'The thrilling behind-the-scenes story of the Pulitzer Prize–winning investigation that ignited a global movement. A testament to investigative rigor, survivor bravery, and the quiet power of speaking truth.',
    mood: 'gripping',
  },
  {
    title: 'Fascism: A Warning',
    author: 'Madeleine Albright',
    description: 'Clear-eyed, accessible framing of how democracies erode.',
    summary: 'Former Secretary of State Madeleine Albright draws on her personal background and diplomatic history to examine how authoritarianism takes root. A thoughtful, lucid, and necessary guide to protecting freedom.',
    mood: 'sobering',
  },
  {
    title: 'What Happened',
    author: 'Hillary Clinton',
    description: 'A personal, candid post-mortem on a national campaign.',
    summary: 'An extraordinarily candid, first-person reflection on resilience after a historic political loss. Clinton candidly explores sexism, public scrutiny, and what it takes to keep standing when everything falls apart.',
    mood: 'reflective',
  },
  {
    title: "The Dictator's Handbook",
    author: 'Bruce Bueno de Mesquita & Alastair Smith',
    description: 'A darkly logical breakdown of how power actually works.',
    summary: 'A provocative political science book that dissects how leaders attain, hold, and lose political control across autocracies and democracies. Darkly humorous and illuminating for anyone curious about power.',
    mood: 'eye-opening',
  },
  {
    title: 'Convenience Store Woman',
    author: 'Sayaka Murata',
    description: 'Short, quietly strange novel about not fitting the mold society expects.',
    summary: 'A charming, eccentric Japanese novella about Keiko, a 36-year-old woman who finds peace working at a neighborhood convenience store. A poignant celebration of finding joy outside conventional expectations.',
    mood: 'short read',
  },
  {
    title: 'Kitchen',
    author: 'Banana Yoshimoto',
    description: 'Gentle, melancholic novella about grief and healing.',
    summary: 'A quiet, luminous Japanese story of a young woman coping with bereavement who finds solace in culinary comfort and unexpected friendships. Gentle, poetic, and deeply soothing for sad or quiet days.',
    mood: 'cozy',
  },
  {
    title: 'Norwegian Wood',
    author: 'Haruki Murakami',
    description: 'Nostalgic, atmospheric coming-of-age novel.',
    summary: 'Set in 1960s Tokyo, this nostalgic masterpiece explores memory, young love, and loss through the eyes of student Toru Watanabe. Atmospheric and tender, perfect for rainy evenings and quiet reflection.',
    mood: 'reflective',
  },
];

const alternativeRecommendations = [
  {
    type: 'article',
    title: 'The Art of Doing Nothing',
    author: 'Substack Essay',
    description: 'A gentle permission slip to rest, pause your endless to-do list, and sit quietly without guilt.',
    href: 'https://substack.com/search/doing-nothing',
  },
  {
    type: 'video',
    title: 'A 5-Minute Reset for an Overwhelmed Mind',
    author: 'YouTube Video',
    description: 'Calming visual breathwork and gentle audio guidance to help lower your heart rate and quiet anxiety.',
    href: 'https://www.youtube.com/watch?v=inpok4MKVLM',
  },
  {
    type: 'article',
    title: 'On Being Kind to Yourself Today',
    author: 'Substack Essay',
    description: 'Short, comforting thoughts on slowing down when work, news, and expectations feel too loud.',
    href: 'https://substack.com/search/gentle-mindfulness',
  },
  {
    type: 'video',
    title: '10 Minutes of Cozy Ambient Rain & Tea',
    author: 'YouTube Video',
    description: 'Soft background ambiance and gentle rain soundscapes for focus, quiet reading, or gentle rest.',
    href: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
  },
];

function getAmazonSearchUrl(title: string, author: string): string {
  const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
  const cleanAuthor = author.replace(/[^\w\s]/gi, '').trim();
  return `https://www.amazon.in/s?k=${encodeURIComponent(`${cleanTitle} ${cleanAuthor} book`)}`;
}

function getFlipkartSearchUrl(title: string, author: string): string {
  const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
  const cleanAuthor = author.replace(/[^\w\s]/gi, '').trim();
  return `https://www.flipkart.com/search?q=${encodeURIComponent(`${cleanTitle} ${cleanAuthor} book`)}`;
}

const movementOptions = [
  { title: "10 Min Walk in Place Workout", duration: "10 min", description: "An easy, low-impact indoor walk to get your steps in without leaving the room.", href: "https://www.youtube.com/watch?v=ml6cT4AZdqI", thumbnail: "https://i.ytimg.com/vi/ml6cT4AZdqI/hqdefault.jpg" },
  { title: "15 Min Fun Upbeat Zumba Dance Workout", duration: "15 min", description: "High-energy, joyful Latin dance moves and Zumba rhythm to boost your mood.", href: "https://www.youtube.com/watch?v=mZeFvXF_mE8", thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80" },
  { title: "10 Min Easy Latin Zumba Dance Break", duration: "10 min", description: "Quick, energetic Zumba dance break to shake off stress and fatigue.", href: "https://www.youtube.com/watch?v=8DZktowZo_k", thumbnail: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&w=600&q=80" },
  { title: "10 Min Full Body Gentle Stretch", duration: "10 min", description: "A slow, relaxing stretch for shoulders, neck, back, and hips.", href: "https://www.youtube.com/watch?v=g_tea8ZNk5A", thumbnail: "https://i.ytimg.com/vi/g_tea8ZNk5A/hqdefault.jpg" },
  { title: "15 Min Beginner Yoga Flow", duration: "15 min", description: "A calm, grounding yoga flow with plenty of breathing space.", href: "https://www.youtube.com/watch?v=v7AYKMP6rOE", thumbnail: "https://i.ytimg.com/vi/v7AYKMP6rOE/hqdefault.jpg" },
  { title: "8 Min Desk-Side Mobility", duration: "8 min", description: "Friendly mobility movements for long sitting days at your desk.", href: "https://www.youtube.com/watch?v=SedzswEwpPw", thumbnail: "https://i.ytimg.com/vi/SedzswEwpPw/hqdefault.jpg" },
  { title: "10 Min Gentle Bed Morning Stretch", duration: "10 min", description: "A soft wake-up stretch sequence you can do right in bed.", href: "https://www.youtube.com/watch?v=2L2lnxIou00", thumbnail: "https://i.ytimg.com/vi/2L2lnxIou00/hqdefault.jpg" },
  { title: "12 Min Low Impact Cardio for Energy", duration: "12 min", description: "Gentle, no-jumping movement to boost your mood without burnout.", href: "https://www.youtube.com/watch?v=gC_L9qAHVJ8", thumbnail: "https://i.ytimg.com/vi/gC_L9qAHVJ8/hqdefault.jpg" },
  { title: "10 Min Slow Neck & Shoulder Relief", duration: "10 min", description: "Soothing tension release for upper body stiffness and computer posture.", href: "https://www.youtube.com/watch?v=X3-gKFu0CHw", thumbnail: "https://i.ytimg.com/vi/X3-gKFu0CHw/hqdefault.jpg" },
  { title: "15 Min Gentle Evening Unwind Stretch", duration: "15 min", description: "Relaxing bedtime stretch to calm your nervous system for sleep.", href: "https://www.youtube.com/watch?v=sTANio_2E0Q", thumbnail: "https://i.ytimg.com/vi/sTANio_2E0Q/hqdefault.jpg" },
  { title: "8 Min Quiet Standing Stretch", duration: "8 min", description: "Zero-equipment standing posture release for quick workday breaks.", href: "https://www.youtube.com/watch?v=EN0z5-S_s_8", thumbnail: "https://i.ytimg.com/vi/EN0z5-S_s_8/hqdefault.jpg" },
  { title: "10 Min Calm Beginner Pilates", duration: "10 min", description: "Gentle core & posture alignment at a soft, manageable pace.", href: "https://www.youtube.com/watch?v=K-PpD8z_L8s", thumbnail: "https://i.ytimg.com/vi/K-PpD8z_L8s/hqdefault.jpg" },
  { title: "12 Min Soft Walking for Stress Relief", duration: "12 min", description: "Mindful rhythm walk to release mental tension and clear your head.", href: "https://www.youtube.com/watch?v=Q2cMMybpP_w", thumbnail: "https://i.ytimg.com/vi/Q2cMMybpP_w/hqdefault.jpg" },
  { title: "15 Min Deep Relaxation Stretch", duration: "15 min", description: "Restorative floor stretches for quiet evenings and deep relaxation.", href: "https://www.youtube.com/watch?v=COp7BR_Dvps", thumbnail: "https://i.ytimg.com/vi/COp7BR_Dvps/hqdefault.jpg" }
];

function MovePage() {
  const { data: moveVideosData, isLoading } = useListMoveVideos();
  const getMoveRecommendation = useGetMoveRecommendation();
  const [moodInput, setMoodInput] = useState('');
  const [recommendationResult, setRecommendationResult] = useState<{
    recommendedTitle: string;
    reason: string;
    isCached?: boolean;
  } | null>(null);

  const videos = moveVideosData?.videos && moveVideosData.videos.length > 0
    ? moveVideosData.videos
    : movementOptions.map((opt, i) => ({ ...opt, id: `fallback-${i}` }));

  const handleMoodSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = moodInput.trim();
    if (!trimmed) return;

    getMoveRecommendation.mutate(
      {
        data: {
          mood: trimmed,
        },
      },
      {
        onSuccess: (res) => {
          setRecommendationResult({
            recommendedTitle: res.recommendedTitle,
            reason: res.reason,
            isCached: res.isCached,
          });
        },
      },
    );
  };

  return (
    <div className="resource-page move-page">
      <section className="resource-heading softly-reveal">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> a little motion</p>
          <h1>Make space<br /><em>to move.</em></h1>
        </div>
        <p className="resource-intro">Nothing to prove here. Just a few gentle ways to let your body change rooms.</p>
      </section>

      {/* Mood-Based Movement AI Recommendation Input */}
      <section className="softly-reveal mb-8">
        <div className="onboarding-card p-6 border border-emerald-100 bg-emerald-50/40 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-900 font-serif text-lg mb-1">
            <Sparkles size={20} className="text-emerald-700" />
            <h2>How do you feel like moving right now?</h2>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Share how your body feels (e.g. &quot;stiff neck from long sitting&quot;, &quot;exhausted and want to stretch in bed&quot;, &quot;need a light walk to clear my head&quot;), and our companion will match you with today&apos;s best exercise.
          </p>

          <form onSubmit={handleMoodSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="Tell us how your body feels right now..."
              className="flex-1 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
              data-testid="input-move-mood-recommendation"
            />
            <button
              type="submit"
              disabled={!moodInput.trim() || getMoveRecommendation.isPending}
              className="primary-button px-5 py-2.5 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              data-testid="button-submit-move-mood"
            >
              {getMoveRecommendation.isPending ? 'Matching exercise...' : 'Find my movement'}
              <ArrowRight size={15} />
            </button>
          </form>

          {recommendationResult && (
            <div className="mt-5 pt-5 border-t border-emerald-200/60 softly-reveal">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Check size={14} className="text-emerald-600" /> AI Recommended Movement for You
                </span>
              </div>
              <p className="text-sm text-stone-800 font-serif italic mb-4">
                &quot;{recommendationResult.reason}&quot;
              </p>

              {(() => {
                const recTitleLower = recommendationResult.recommendedTitle.toLowerCase();
                const matchedVid =
                  videos.find((v) => v.title.toLowerCase() === recTitleLower) ||
                  movementOptions.find((v) => v.title.toLowerCase() === recTitleLower) || {
                    title: recommendationResult.recommendedTitle,
                    duration: '10 min',
                    description: 'Matched specifically to your current physical feeling.',
                    href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recommendationResult.recommendedTitle} workout`)}`,
                    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
                  };

                return (
                  <div className="p-4 bg-white rounded-xl border-2 border-emerald-600 shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-44 h-28 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                      <img src={matchedVid.thumbnail} alt="" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                        <Play size={24} fill="currentColor" />
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-stone-900/80 text-stone-100 px-1.5 py-0.5 rounded font-mono">
                        {matchedVid.duration}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-emerald-800 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles size={11} /> Matched Video
                        </span>
                      </div>
                      <h3 className="text-base font-serif font-semibold text-emerald-950 mb-1">{matchedVid.title}</h3>
                      <p className="text-xs text-stone-600 mb-3">{matchedVid.description}</p>
                      <a
                        href={matchedVid.href}
                        target="_blank"
                        rel="noreferrer"
                        className="primary-button inline-flex items-center gap-2 text-xs px-4 py-2 cursor-pointer"
                        data-testid="link-recommended-youtube-video"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Watch on YouTube</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Today&apos;s Fresh Daily Rotation
        </span>
        <span className="text-xs text-stone-400 italic">prioritizing unseen videos</span>
      </div>

      <section className="movement-grid" aria-label="Gentle movement videos">
        {videos.map((option, index) => {
          const isRecommended = recommendationResult?.recommendedTitle === option.title;
          return (
            <a
              className={`movement-card softly-reveal relative ${
                isRecommended ? 'ring-2 ring-emerald-600 border-emerald-500 shadow-md' : ''
              }`}
              style={{ animationDelay: `${index * 70}ms` }}
              href={option.href}
              target="_blank"
              rel="noreferrer"
              key={option.title}
              data-testid={`link-movement-${index + 1}`}
            >
              <div className="movement-thumbnail">
                <img src={option.thumbnail} alt="" />
                <span className="play-button"><Play size={16} fill="currentColor" /></span>
                {isRecommended && (
                  <span className="absolute top-2 right-2 text-xs bg-emerald-800 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
                    <Sparkles size={11} /> AI Match
                  </span>
                )}
              </div>
              <div className="movement-card-body">
                <div className="card-kicker"><Clock3 size={13} /> {option.duration}</div>
                <h2>{option.title}</h2>
                <p>{option.description}</p>
                <span className="card-link">watch on YouTube <ExternalLink size={13} /></span>
              </div>
            </a>
          );
        })}
      </section>
    </div>
  );
}


function ReadPage() {
  const [selectedMood, setSelectedMood] = useState('all');
  const [readerMode, setReaderMode] = useState<'books' | 'alternatives'>('books');
  const [moodInput, setMoodInput] = useState('');
  const [recommendationResult, setRecommendationResult] = useState<{
    recommendedTitles: string[];
    reason: string;
    isCached?: boolean;
  } | null>(null);

  const getRecommendation = useGetReadRecommendation();

  const moods = ['all', ...Array.from(new Set(bookRecommendations.map((book) => book.mood)))];
  const visibleBooks = selectedMood === 'all' ? bookRecommendations : bookRecommendations.filter((book) => book.mood === selectedMood);

  const handleMoodSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = moodInput.trim();
    if (!trimmed) return;

    getRecommendation.mutate(
      {
        data: {
          mood: trimmed,
          mode: readerMode,
        },
      },
      {
        onSuccess: (res) => {
          setRecommendationResult({
            recommendedTitles: res.recommendedTitles,
            reason: res.reason,
            isCached: res.isCached,
          });
        },
      },
    );
  };

  return (
    <div className="resource-page read-page">
      <section className="resource-heading softly-reveal">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> bookshelf corner</p>
          <h1>Follow a<br /><em>thread.</em></h1>
        </div>
        <p className="resource-intro">For the days when a story sounds like good company, whatever shape that takes.</p>
      </section>

      {/* Mood-Based AI Recommendation Input */}
      <section className="softly-reveal mb-8">
        <div className="onboarding-card p-6 border border-emerald-100 bg-emerald-50/40 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-900 font-serif text-lg mb-1">
            <Sparkles size={20} className="text-emerald-700" />
            <h2>What&apos;s on your mind right now?</h2>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Type how you&apos;re feeling (e.g. &quot;overwhelmed by work&quot;, &quot;need a cozy laugh&quot;, &quot;quiet and sad&quot;), and our companion will find a gentle recommendation for your mood.
          </p>

          <form onSubmit={handleMoodSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="Tell us what you're feeling right now..."
              className="flex-1 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
              data-testid="input-mood-recommendation"
            />
            <button
              type="submit"
              disabled={!moodInput.trim() || getRecommendation.isPending}
              className="primary-button px-5 py-2.5 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              data-testid="button-submit-mood"
            >
              {getRecommendation.isPending ? 'Finding recommendations...' : 'Find my read'}
              <ArrowRight size={15} />
            </button>
          </form>

          {recommendationResult && (
            <div className="mt-5 pt-5 border-t border-emerald-200/60 softly-reveal space-y-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Check size={14} className="text-emerald-600" /> AI Recommendation Rationale
                </span>
              </div>
              <p className="text-sm text-stone-800 font-serif italic mb-4">
                &quot;{recommendationResult.reason}&quot;
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendationResult.recommendedTitles.map((title, idx) => {
                  if (readerMode === 'books') {
                    const matchedBook = bookRecommendations.find(
                      (b) => b.title.toLowerCase() === title.toLowerCase()
                    ) || {
                      title: title,
                      author: 'Recommended Author',
                      description: 'A gentle recommendation for your mood.',
                      summary: 'This title was selected to give you good company and comfort right now.',
                      mood: 'matched',
                    };

                    const amazonUrl = getAmazonSearchUrl(matchedBook.title, matchedBook.author);
                    const flipkartUrl = getFlipkartSearchUrl(matchedBook.title, matchedBook.author);

                    return (
                      <div
                        key={title}
                        className="p-5 bg-white rounded-2xl border-2 border-emerald-600 shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {matchedBook.mood}
                            </span>
                            <span className="text-xs bg-emerald-700 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles size={11} /> AI Match
                            </span>
                          </div>
                          <h3 className="text-lg font-serif font-semibold text-emerald-950 mb-0.5">{matchedBook.title}</h3>
                          <p className="text-xs text-stone-500 mb-2 font-medium">by {matchedBook.author}</p>
                          <p className="text-xs text-stone-600 italic mb-2">{matchedBook.description}</p>
                          <p className="text-xs text-stone-700 leading-relaxed mb-4">{matchedBook.summary}</p>
                        </div>

                        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                          <a
                            href={amazonUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                            data-testid={`link-rec-amazon-${idx + 1}`}
                          >
                            <span>Buy on Amazon</span>
                            <ExternalLink size={11} />
                          </a>
                          <a
                            href={flipkartUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                            data-testid={`link-rec-flipkart-${idx + 1}`}
                          >
                            <span>Buy on Flipkart</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    );
                  } else {
                    const matchedAlt = alternativeRecommendations.find(
                      (alt) => alt.title.toLowerCase() === title.toLowerCase()
                    ) || {
                      title: title,
                      author: 'Short Read',
                      description: 'A gentle quick reset for your mind.',
                      href: '#',
                      type: 'Article / Video',
                    };

                    return (
                      <div
                        key={title}
                        className="p-5 bg-white rounded-2xl border-2 border-emerald-600 shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {matchedAlt.type}
                            </span>
                            <span className="text-xs bg-emerald-700 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles size={11} /> AI Match
                            </span>
                          </div>
                          <h3 className="text-lg font-serif font-semibold text-emerald-950 mb-0.5">{matchedAlt.title}</h3>
                          <p className="text-xs text-stone-500 mb-2">{matchedAlt.author}</p>
                          <p className="text-xs text-stone-700 leading-relaxed mb-4">{matchedAlt.description}</p>
                        </div>

                        <div className="pt-3 border-t border-stone-100">
                          <a
                            href={matchedAlt.href}
                            target="_blank"
                            rel="noreferrer"
                            className="primary-button text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Open short content</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="read-controls softly-reveal">
        <div className="reader-choice" role="group" aria-label="Choose what to browse">
          <button
            type="button"
            className={readerMode === 'books' ? 'choice-active' : ''}
            onClick={() => {
              setReaderMode('books');
              setRecommendationResult(null);
            }}
            data-testid="button-books"
          >
            books
          </button>
          <button
            type="button"
            className={readerMode === 'alternatives' ? 'choice-active' : ''}
            onClick={() => {
              setReaderMode('alternatives');
              setRecommendationResult(null);
            }}
            data-testid="button-not-a-reader"
          >
            not really a reader
          </button>
        </div>
        {readerMode === 'books' && (
          <div className="mood-filter">
            <Filter size={14} aria-hidden="true" />
            <label htmlFor="mood">mood</label>
            <select
              id="mood"
              value={selectedMood}
              onChange={(event) => setSelectedMood(event.target.value)}
              data-testid="select-mood"
            >
              {moods.map((mood) => (
                <option value={mood} key={mood}>{mood}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {readerMode === 'books' ? (
        <section className="book-grid" aria-label="Book recommendations">
          {visibleBooks.map((book, index) => {
            const isRecommended = recommendationResult?.recommendedTitles?.includes(book.title);
            return <BookCard book={book} index={index} key={book.title} isRecommended={isRecommended} />;
          })}
        </section>
      ) : (
        <section className="book-grid" aria-label="Alternative recommendations">
          {alternativeRecommendations.map((recommendation, index) => {
            const isRecommended = recommendationResult?.recommendedTitles?.includes(recommendation.title);
            return (
              <div
                className={`book-card alternative-card softly-reveal flex flex-col justify-between p-6 rounded-2xl bg-white border ${
                  isRecommended ? 'ring-2 ring-emerald-600 border-emerald-500 shadow-md' : 'border-stone-200'
                }`}
                style={{ animationDelay: `${index * 70}ms` }}
                key={recommendation.title}
                data-testid={`link-alternative-${index + 1}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="book-mood">{recommendation.type}</span>
                    {isRecommended && (
                      <span className="text-xs bg-emerald-700 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles size={11} /> AI Match
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-serif text-emerald-950 mb-1">{recommendation.title}</h2>
                  <p className="text-xs text-stone-500 mb-3">{recommendation.author}</p>
                  <p className="text-sm text-stone-700 mb-4">{recommendation.description}</p>
                </div>
                <a
                  href={recommendation.href}
                  target="_blank"
                  rel="noreferrer"
                  className="card-link inline-flex items-center gap-1.5 text-xs text-emerald-800 font-medium hover:underline"
                >
                  <span>Open short content</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function BookCard({
  book,
  index,
  isRecommended,
}: {
  book: BookRecommendation;
  index: number;
  isRecommended?: boolean;
}) {
  const amazonUrl = getAmazonSearchUrl(book.title, book.author);
  const flipkartUrl = getFlipkartSearchUrl(book.title, book.author);

  return (
    <article
      className={`book-card softly-reveal flex flex-col justify-between p-6 rounded-2xl bg-white border ${
        isRecommended ? 'ring-2 ring-emerald-600 border-emerald-500 shadow-md' : 'border-stone-200'
      }`}
      style={{ animationDelay: `${index * 45}ms` }}
      data-testid={`card-book-${index + 1}`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="book-mood">{book.mood}</span>
          {isRecommended && (
            <span className="text-xs bg-emerald-700 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={11} /> AI Match
            </span>
          )}
        </div>
        <h2 className="text-xl font-serif text-emerald-950 mb-1">{book.title}</h2>
        <p className="text-xs text-stone-500 mb-3 font-medium">by {book.author}</p>
        <p className="text-xs text-stone-600 italic mb-2">{book.description}</p>
        <p className="text-sm text-stone-700 leading-relaxed mb-4">{book.summary}</p>
      </div>

      <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
        <a
          href={amazonUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium inline-flex items-center gap-1"
          data-testid={`link-amazon-${index + 1}`}
        >
          <span>Buy on Amazon</span>
          <ExternalLink size={11} />
        </a>
        <a
          href={flipkartUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium inline-flex items-center gap-1"
          data-testid={`link-flipkart-${index + 1}`}
        >
          <span>Buy on Flipkart</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </article>
  );
}


function TalkPage() {
  const queryClientForChat = useQueryClient();
  const { data: session } = useGetSession();
  const { data: initialMessages, isLoading } = useListChatMessages();
  const sendChatMessage = useSendChatMessage();
  const clearChatMessages = useClearChatMessages();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingNote, setRecordingNote] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);


  useEffect(() => {
    if (Array.isArray(initialMessages)) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendChatMessage.isPending]);

  const messageList = Array.isArray(messages) ? messages : [];


  const startVoiceInput = () => {
    setRecordingNote(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecordingNote('Speech recording is not supported in this browser. You can type freely below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
        });
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error !== 'no-speech') {
          setRecordingNote(`Microphone note: ${event.error}. You can still type directly.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      setRecordingNote('Could not start microphone. Please type your message.');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? inputMessage).trim();
    if (!text || sendChatMessage.isPending) return;

    if (isRecording) {
      stopVoiceInput();
    }

    setInputMessage('');
    setRecordingNote(null);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: session?.sessionId || 'guest',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    sendChatMessage.mutate(
      { data: { message: text } },
      {
        onSuccess: (data) => {
          queryClientForChat.invalidateQueries({ queryKey: getListChatMessagesQueryKey() });
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
            return [...filtered, data.userMessage, data.botMessage];
          });
        },
        onError: () => {
          const fallbackBotMsg: ChatMessage = {
            id: `err-${Date.now()}`,
            sessionId: session?.sessionId || 'guest',
            role: 'assistant',
            content: "I'm right here with you. Take a soft breath — you don't have to carry anything alone.",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, fallbackBotMsg]);
        },
      },
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearChatMessages.mutate(undefined, {
      onSuccess: () => {
        queryClientForChat.invalidateQueries({ queryKey: getListChatMessagesQueryKey() });
        setMessages([]);
      },
    });
  };

  const promptSuggestions = [
    "I'm feeling a bit overwhelmed today.",
    "Reaching for food when I'm bored or stressed.",
    "Just need a quiet moment to breathe.",
    "Everything feels a bit too loud right now.",
  ];

  return (
    <div className="resource-page talk-page">
      <section className="resource-heading softly-reveal">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> a soft landing</p>
          <h1>Say it out<br /><em>loud.</em></h1>
        </div>
        <p className="resource-intro">
          A warm, quiet companion for when things feel heavy, tangled, or simply need a soft place to land.
        </p>
      </section>

      <div className="chat-container softly-reveal">
        <div className="chat-header">
          <div className="chat-companion-badge">
            <span className="companion-avatar"><Leaf size={14} /></span>
            <div>
              <strong>softly companion</strong>
              <small>{session?.isSignedIn ? `here with ${session.username}` : 'a private space for you'}</small>
            </div>
          </div>
          {messageList.length > 0 && (
            <button
              type="button"
              className="chat-clear-btn"
              onClick={handleClear}
              disabled={clearChatMessages.isPending}
              data-testid="button-clear-chat"
              title="Start a fresh conversation"
            >
              <RotateCcw size={13} />
              <span>start fresh</span>
            </button>
          )}
        </div>

        <div className="chat-thread" aria-label="Conversation messages" tabIndex={0}>
          {isLoading && (
            <div className="chat-loading" data-testid="status-chat-loading">
              <span className="chat-loading-dot" />
              <span className="chat-loading-dot" />
              <span className="chat-loading-dot" />
            </div>
          )}

          {!isLoading && messageList.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-flower"><Sparkles size={22} strokeWidth={1.8} /></div>
              <h3>How are you feeling right now?</h3>
              <p>
                There are no grades, diets, or right answers here. You can type or tap the microphone to speak what&apos;s on your mind.
              </p>
              <div className="prompt-suggestions">
                <span className="prompt-suggestions-label">gentle places to begin:</span>
                <div className="prompt-chips">
                  {promptSuggestions.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSend(prompt)}
                      data-testid="button-prompt-suggestion"
                    >
                      “{prompt}”
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messageList.map((msg) => {
            const isUser = msg.role === 'user';
            const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(msg.createdAt));
            return (
              <div
                key={msg.id}
                className={`chat-bubble-row ${isUser ? 'chat-bubble-user-row' : 'chat-bubble-bot-row'}`}
                data-testid={`chat-message-${msg.role}`}
              >
                {!isUser && <span className="bubble-avatar" aria-hidden="true"><Leaf size={13} /></span>}
                <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                  <p className="bubble-text">{msg.content}</p>
                  <span className="bubble-time">{timeLabel}</span>
                </div>
              </div>
            );
          })}


          {sendChatMessage.isPending && (
            <div className="chat-bubble-row chat-bubble-bot-row softly-reveal" data-testid="status-bot-typing">
              <span className="bubble-avatar" aria-hidden="true"><Leaf size={13} /></span>
              <div className="chat-bubble chat-bubble-bot chat-bubble-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <small className="typing-label">softly listening...</small>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {recordingNote && (
          <div className="recording-note" data-testid="status-recording-note">
            <span>{recordingNote}</span>
            <button type="button" onClick={() => setRecordingNote(null)}>dismiss</button>
          </div>
        )}

        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="input-box-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening softly... speak your mind' : 'Tell me what you are feeling...'}
              rows={1}
              maxLength={2000}
              disabled={sendChatMessage.isPending}
              data-testid="input-chat-message"
            />
            <button
              type="button"
              className={`mic-button ${isRecording ? 'mic-button-active' : ''}`}
              onClick={toggleRecording}
              aria-label={isRecording ? 'Stop recording voice' : 'Record voice note'}
              title={isRecording ? 'Stop recording' : 'Speak your thoughts'}
              data-testid="button-voice-record"
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || sendChatMessage.isPending}
            aria-label="Send message"
            data-testid="button-send-chat"
          >
            <Send size={16} />
          </button>
        </form>

        <p className="talk-disclaimer" data-testid="text-talk-disclaimer">
          This is a supportive space, not a substitute for professional care. If you&apos;re in crisis, please reach out to a helpline or someone you trust.
        </p>
      </div>
    </div>
  );
}

function AuthRequiredCard({ title, subtitle }: { title: string; subtitle: string }) {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [devLink, setDevLink] = useState('');
  const sendMagicLink = useSendMagicLink();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    sendMagicLink.mutate(
      { data: { email: trimmed } },
      {
        onSuccess: (res) => {
          setSentMessage(`Check your inbox! We sent a magic link to ${trimmed}.`);
          if (res.devMagicLink) {
            setDevLink(res.devMagicLink);
          }
        },
      },
    );
  };

  return (
    <div className="welcome-page p-6 softly-reveal min-h-[60vh] flex items-center justify-center">
      <div className="onboarding-card max-w-lg w-full p-8 text-center">
        <p className="eyebrow"><span className="eyebrow-line" /> a quiet corner</p>
        <h2 className="text-2xl font-serif text-emerald-950 mb-2">{title}</h2>
        <p className="onboarding-copy mb-6">{subtitle}</p>

        {sentMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
            <p className="font-medium mb-1"><Check size={16} className="inline mr-1 text-emerald-600" /> {sentMessage}</p>
            <p className="text-xs text-stone-600 mb-3">Click the link in your email to open your space.</p>
            {devLink && (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800 block mb-1">Local Dev Quick Verify:</span>
                <a href={devLink} className="text-xs underline text-emerald-700 hover:text-emerald-900 font-mono break-all" data-testid="link-dev-magic-verify">
                  Click here to verify magic link →
                </a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="name-form max-w-md mx-auto">
            <label htmlFor="auth-email-card">your email</label>
            <div className="name-input-row">
              <input
                id="auth-email-card"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                data-testid="input-auth-email"
              />
              <button type="submit" className="circle-submit" disabled={sendMagicLink.isPending} data-testid="button-send-auth-email">
                {sendMagicLink.isPending ? '...' : <ArrowRight size={18} />}
              </button>
            </div>
            {sendMagicLink.isError && (
              <p className="form-error mt-2">Could not send magic link. Please check your email address.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function VerifyMagicLink() {
  const queryClientForVerify = useQueryClient();
  const [, setLocation] = useLocation();
  const verifyMutation = useVerifyMagicLink();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setErrorMsg('No magic link token provided.');
      return;
    }

    verifyMutation.mutate(
      { data: { token } },
      {
        onSuccess: (nextSession) => {
          queryClientForVerify.setQueryData(getGetSessionQueryKey(), nextSession);
          setSuccessMsg(`Welcome back! Opening your space...`);
          setTimeout(() => {
            setLocation('/log');
          }, 1200);
        },
        onError: (err: any) => {
          setErrorMsg(err?.data?.error || 'This magic link has expired or has already been used.');
        },
      },
    );
  }, []);

  return (
    <div className="welcome-page softly-reveal flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="onboarding-card max-w-md w-full p-8 text-center">
        <Sparkles className="mx-auto mb-4 text-emerald-700 animate-pulse" size={32} />
        {verifyMutation.isPending && (
          <div>
            <h2 className="text-xl font-serif text-emerald-900 mb-2">Entering your space...</h2>
            <p className="text-sm text-stone-600">Verifying your magic link token gently.</p>
          </div>
        )}
        {successMsg && (
          <div>
            <Check className="mx-auto mb-2 text-emerald-600" size={28} />
            <h2 className="text-xl font-serif text-emerald-900 mb-2">{successMsg}</h2>
          </div>
        )}
        {errorMsg && (
          <div>
            <h2 className="text-xl font-serif text-rose-800 mb-2">Link Expired or Invalid</h2>
            <p className="text-sm text-stone-600 mb-6">{errorMsg}</p>
            <Link href="/" className="primary-button inline-flex items-center gap-2">
              <span>Request a fresh magic link</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Welcome} />
          <Route path="/auth/verify" component={VerifyMagicLink} />
          <Route path="/log" component={LogPage} />
          <Route path="/move" component={MovePage} />
          <Route path="/read" component={ReadPage} />
          <Route path="/talk" component={TalkPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;