import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Check,
  Droplets,
  Heart,
  Leaf,
  Menu,
  MessageCircle,
  MoveUpRight,
  NotebookPen,
  PenLine,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  getGetSessionQueryKey,
  getListEntriesQueryKey,
  useCreateEntry,
  useCreateSession,
  useGetSession,
  useHealthCheck,
  useListEntries,
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

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, isLoading: sessionLoading } = useGetSession();
  const { data: health } = useHealthCheck();

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
          {!sessionLoading && session?.isSignedIn && (
            <span className="user-chip" data-testid="text-username">{session.username}</span>
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
    </div>
  );
}

function Welcome() {
  const queryClientForSession = useQueryClient();
  const { data: session } = useGetSession();
  const [username, setUsername] = useState('');
  const [signedInMessage, setSignedInMessage] = useState('');
  const createSession = useCreateSession();

  const handleStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;
    createSession.mutate(
      { data: { username: trimmedUsername } },
      {
        onSuccess: (nextSession) => {
          queryClientForSession.setQueryData(getGetSessionQueryKey(), nextSession);
          setSignedInMessage(`Good to have you here, ${nextSession.username}.`);
          setUsername('');
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

      {!session?.isSignedIn && (
        <section className="begin-section" id="begin">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> your corner of the internet</p>
            <h2>What should we<br /><em>call you?</em></h2>
            <p className="section-copy">A name makes this little place yours. Nothing else is required.</p>
          </div>
          <form className="name-form" onSubmit={handleStart}>
            <label htmlFor="username">your name</label>
            <div className="name-input-row">
              <input
                id="username"
                type="text"
                maxLength={40}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="just first name is lovely"
                data-testid="input-username"
              />
              <button type="submit" className="circle-submit" disabled={createSession.isPending} data-testid="button-save-username">
                {createSession.isPending ? <span className="button-dots">...</span> : <ArrowRight size={18} />}
              </button>
            </div>
            {createSession.isError && <p className="form-error" data-testid="status-session-error">Could not save that just now. Please try again.</p>}
            {signedInMessage && <p className="form-success" data-testid="status-session-success"><Check size={15} /> {signedInMessage}</p>}
          </form>
        </section>
      )}

      {session?.isSignedIn && (
        <section className="signed-in-note" data-testid="status-signed-in">
          <Sparkles size={17} />
          <span>{signedInMessage || `Welcome back, ${session.username}. Your page is waiting.`}</span>
          <Link href="/log" data-testid="link-signed-in-log">see your notes <ArrowRight size={15} /></Link>
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
            <span className="history-count" data-testid="text-entry-count">{entries?.length ?? 0} saved</span>
          </div>
          {isLoading && <HistorySkeleton />}
          {isError && (
            <div className="state-card" data-testid="status-history-error">
              <p>We couldn&apos;t find your pages.</p>
              <button type="button" onClick={() => refetch()} data-testid="button-retry-history">try again <ArrowRight size={15} /></button>
            </div>
          )}
          {!isLoading && !isError && (!entries || entries.length === 0) && (
            <div className="empty-history" data-testid="status-history-empty">
              <NotebookPen size={25} strokeWidth={1.4} />
              <p>Your saved pages will gather here.</p>
              <span>There is no right first entry.</span>
            </div>
          )}
          {!isLoading && !isError && entries && entries.length > 0 && (
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

function ComingSoon({ kind, icon: Icon, title, description, accent }: { kind: string; icon: typeof MoveUpRight; title: string; description: string; accent: string }) {
  return (
    <div className="coming-page">
      <div className={`coming-orb coming-orb-${accent}`} />
      <section className="coming-content softly-reveal">
        <div className="coming-icon"><Icon size={26} strokeWidth={1.5} /></div>
        <p className="eyebrow"><span className="eyebrow-line" /> {kind}</p>
        <h1>{title}<br /><em>coming softly.</em></h1>
        <p className="coming-description">{description}</p>
        <Link href="/log" className="primary-button" data-testid={`link-coming-${kind.toLowerCase()}-log`}>
          <NotebookPen size={17} /> <span>visit your log</span> <ArrowRight size={16} />
        </Link>
      </section>
      <div className="coming-footnote"><Sun size={15} /> good things take their time</div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Welcome} />
          <Route path="/log" component={LogPage} />
          <Route path="/move">
            <ComingSoon kind="a little motion" icon={MoveUpRight} title="Make space to" description="A gentle place for walks, stretches, and the kind of movement that leaves you feeling more like yourself. We’re making room." accent="peach" />
          </Route>
          <Route path="/read">
            <ComingSoon kind="a few pages" icon={BookOpen} title="Follow a thread" description="A home for the stories, sentences, and small pieces of wonder that keep you company. This page is still finding its shape." accent="yellow" />
          </Route>
          <Route path="/talk">
            <ComingSoon kind="a soft landing" icon={MessageCircle} title="Say it out loud" description="A quiet corner for checking in with someone, asking for what you need, or simply not holding it all by yourself." accent="blue" />
          </Route>
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