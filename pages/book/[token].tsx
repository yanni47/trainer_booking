import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase, type Booking, type BookingSlot, type Client } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { sk, enUS } from 'date-fns/locale';
import styles from '../../styles/Book.module.css';

type BookingWithDetails = Booking & {
  client: Client;
  booking_slots: BookingSlot[];
};

const translations = {
  en: {
    pickTime: 'Pick Your Time',
    loading: 'Loading...',
    notAvailable: 'Booking Not Available',
    contactTrainer: 'If you believe this is a mistake, please contact your trainer.',
    allSet: "You're All Set!",
    sessionConfirmed: 'Your session is confirmed',
    seeYou: 'See you then!',
    noteFromTrainer: 'Note from trainer',
    confirmTime: 'Confirm This Time?',
    lockIn: 'This will lock in your session time',
    goBack: 'Go Back',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    unableToLoad: 'Unable to load booking',
    unableToConfirm: 'Unable to confirm booking. Please try again.',
    bookingCancelled: 'This booking has been cancelled',
  },
  sk: {
    pickTime: 'Vyberte si čas',
    loading: 'Načítavam...',
    notAvailable: 'Rezervácia nedostupná',
    contactTrainer: 'Ak si myslíte, že je to chyba, kontaktujte svojho trénera.',
    allSet: 'Máte hotovo!',
    sessionConfirmed: 'Váš tréning je potvrdený',
    seeYou: 'Vidíme sa!',
    noteFromTrainer: 'Poznámka od trénera',
    confirmTime: 'Potvrdiť tento čas?',
    lockIn: 'Týmto potvrdíte čas tréningu',
    goBack: 'Späť',
    confirm: 'Potvrdiť',
    confirming: 'Potvrdzujem...',
    unableToLoad: 'Nepodarilo sa načítať rezerváciu',
    unableToConfirm: 'Nepodarilo sa potvrdiť rezerváciu. Skúste prosím znova.',
    bookingCancelled: 'Táto rezervácia bola zrušená',
  },
};

export default function BookingPage() {
  const router = useRouter();
  const { token } = router.query;

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [slotToConfirm, setSlotToConfirm] = useState<BookingSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [lang, setLang] = useState<'en' | 'sk'>('en');
  
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('sk')) {
      setLang('sk');
    }
  }, []);

  const t = translations[lang];
  const dateLocale = lang === 'sk' ? sk : enUS;

  useEffect(() => {
    if (!token || typeof token !== 'string') return;
    loadBooking(token);
  }, [token]);

  async function loadBooking(bookingToken: string) {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          client:clients(*),
          booking_slots(*)
        `)
        .eq('token', bookingToken)
        .single();

      if (fetchError || !data) {
        setError(t.notAvailable);
        return;
      }

      if (data.status === 'confirmed') {
        setBooking(data as BookingWithDetails);
        return;
      }

      if (data.status === 'cancelled') {
        setError(t.bookingCancelled);
        return;
      }

      setBooking(data as BookingWithDetails);
    } catch (err) {
      setError(t.unableToLoad);
    } finally {
      setLoading(false);
    }
  }

  function handleSlotClick(slot: BookingSlot) {
    setSlotToConfirm(slot);
    setShowConfirmDialog(true);
  }

  function handleCancelConfirm() {
    setShowConfirmDialog(false);
    setSlotToConfirm(null);
  }

  async function handleConfirmBooking() {
    if (!slotToConfirm || !booking) return;

    try {
      setSelecting(true);
      setSelectedSlotId(slotToConfirm.id);
      setShowConfirmDialog(false);

      const { error: updateError } = await supabase
        .from('booking_slots')
        .update({ is_selected: true })
        .eq('id', slotToConfirm.id);

      if (updateError) {
        setError(t.unableToConfirm);
        setSelectedSlotId(null);
        return;
      }

      if (token && typeof token === 'string') {
        await loadBooking(token);
      }
    } catch (err) {
      setError(t.unableToConfirm);
      setSelectedSlotId(null);
    } finally {
      setSelecting(false);
      setSlotToConfirm(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className={styles.spinner}></div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h1 className={styles.errorTitle}>{error}</h1>
          <p className={styles.errorHint}>{t.contactTrainer}</p>
        </div>
      </div>
    );
  }

   // Success state - booking already confirmed
  if (booking?.status === 'confirmed') {
    const confirmedSlot = booking.booking_slots.find((s) => s.is_selected);
    
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIconWrapper}>
            <div className={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className={styles.successCheck}>✓</div>
          </div>

          <h1 className={styles.successTitle}>{t.allSet}</h1>
          <p className={styles.successSubtitle}>{t.sessionConfirmed}</p>
          
          {confirmedSlot && (
            <div className={styles.confirmedTimeCard}>
              <div className={styles.confirmedDate}>
                {format(parseISO(confirmedSlot.proposed_time), 'EEEE, d. MMMM yyyy', { locale: dateLocale })}
              </div>
              <div className={styles.confirmedTime}>
                {format(parseISO(confirmedSlot.proposed_time), 'HH:mm')}
              </div>
            </div>
          )}

          {booking.title && (
            <div className={styles.sessionType}>{booking.title}</div>
          )}

          <p className={styles.successNote}>{t.seeYou}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          
          <div className={styles.langToggle}>
            <button
              className={lang === 'en' ? styles.langActive : styles.langInactive}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              className={lang === 'sk' ? styles.langActive : styles.langInactive}
              onClick={() => setLang('sk')}
            >
              SK
            </button>
          </div>
        </div>

        <h1 className={styles.title}>{t.pickTime}</h1>
        
        {booking?.title && (
          <div className={styles.sessionBadge}>{booking.title}</div>
        )}

        <div className={styles.slotsList}>
          {booking?.booking_slots
            ?.sort((a, b) => 
              new Date(a.proposed_time).getTime() - new Date(b.proposed_time).getTime()
            )
            .map((slot) => (
              <button
                key={slot.id}
                className={styles.slotButton}
                onClick={() => handleSlotClick(slot)}
                disabled={selecting}
              >
                <div className={styles.slotContent}>
                  <div className={styles.slotLeft}>
                    <div className={styles.slotDate}>
                      {format(parseISO(slot.proposed_time), 'EEE, d. MMM', { locale: dateLocale })}
                    </div>
                    <div className={styles.slotTime}>
                      {format(parseISO(slot.proposed_time), 'HH:mm')}
                    </div>
                  </div>
                  <div className={styles.slotArrow}>→</div>
                </div>
                
                {selecting && selectedSlotId === slot.id && (
                  <div className={styles.slotLoading}>
                    <div className={styles.spinner}></div>
                  </div>
                )}
              </button>
            ))}
        </div>

        {booking?.notes && (
          <div className={styles.notesCard}>
            <div className={styles.notesLabel}>{t.noteFromTrainer}</div>
            <div className={styles.notesText}>{booking.notes}</div>
          </div>
        )}
      </div>

      {showConfirmDialog && slotToConfirm && (
        <div className={styles.dialogOverlay} onClick={handleCancelConfirm}>
          <div className={styles.dialogCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>{t.confirmTime}</h2>
            </div>
            
            <div className={styles.dialogContent}>
              <div className={styles.dialogTimeBox}>
                <div className={styles.dialogDate}>
                  {format(parseISO(slotToConfirm.proposed_time), 'EEEE, d. MMMM', { locale: dateLocale })}
                </div>
                <div className={styles.dialogTime}>
                  {format(parseISO(slotToConfirm.proposed_time), 'HH:mm')}
                </div>
              </div>

              {booking?.title && (
                <div className={styles.dialogSessionBadge}>{booking.title}</div>
              )}

              <p className={styles.dialogWarning}>{t.lockIn}</p>
            </div>

            <div className={styles.dialogActions}>
              <button 
                className={styles.dialogCancelButton}
                onClick={handleCancelConfirm}
                disabled={selecting}
              >
                {t.goBack}
              </button>
              <button 
                className={styles.dialogConfirmButton}
                onClick={handleConfirmBooking}
                disabled={selecting}
              >
                {selecting ? t.confirming : t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
