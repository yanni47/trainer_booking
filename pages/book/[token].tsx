import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase, type Booking, type BookingSlot, type Client } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import styles from '../../styles/Book.module.css';

type BookingWithDetails = Booking & {
  client: Client;
  booking_slots: BookingSlot[];
};

export default function BookingPage() {
  const router = useRouter();
  const { token } = router.query;

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [slotToConfirm, setSlotToConfirm] = useState<BookingSlot | null>(null);
  const [language, setLanguage] = useState<'en' | 'sk'>('en');

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
        setError('Booking not found');
        return;
      }

      if (data.status === 'confirmed') {
        setError('This booking has already been confirmed');
        setBooking(data as BookingWithDetails);
        return;
      }

      if (data.status === 'cancelled') {
        setError('This booking has been cancelled');
        return;
      }

      setBooking(data as BookingWithDetails);
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleSlotClick(slot: BookingSlot) {
    setSlotToConfirm(slot);
    setShowConfirmDialog(true);
  }

  async function confirmSlotSelection() {
    if (!booking || !slotToConfirm) return;

    try {
      setSelecting(true);
      setSelectedSlotId(slotToConfirm.id);
      setShowConfirmDialog(false);

      // 1. Mark slot as selected
      const { error: slotError } = await supabase
        .from('booking_slots')
        .update({ is_selected: true })
        .eq('id', slotToConfirm.id);

      if (slotError) {
        console.error('Slot update error:', slotError);
        setError('Failed to confirm booking. Please try again.');
        setSelectedSlotId(null);
        return;
      }

      // 2. Update booking status to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (bookingError) {
        console.error('Booking status update error:', bookingError);
      }

      // 3. Send push notification to trainer
      const confirmedTimeFormatted = format(
        parseISO(slotToConfirm.proposed_time),
        'EEE, MMM d \'at\' h:mm a'
      );

      const { data: trainerData } = await supabase
        .from('trainers')
        .select('push_token')
        .eq('id', booking.trainer_id)
        .single();

      console.log('🔔 Trainer data:', trainerData);
      console.log('🔔 Push token:', trainerData?.push_token);

      if (trainerData?.push_token) {
        console.log('🔔 Sending push notification...');
        const response = await fetch('/api/send-push', {  // ← zmeň URL
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: trainerData.push_token,
    title: '✅ Booking Confirmed!',
    body: `${booking.client?.name} confirmed: ${confirmedTimeFormatted}`,
  }),
});

        const result = await response.json();
        console.log('🔔 Push notification result:', result);
      } else {
        console.log('❌ No push token found for trainer');
      }

      // 4. Reload page
      if (token && typeof token === 'string') {
        await loadBooking(token);
      }

    } catch (err) {
      console.error('Exception in confirmSlotSelection:', err);
      setError('Something went wrong');
      setSelectedSlotId(null);
    } finally {
      setSelecting(false);
    }
  }

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        chooseTime: 'Choose Your Time',
        hi: 'Hi',
        session: 'Session',
        notesLabel: 'Notes from your trainer',
        loading: 'Loading...',
        confirmed: 'Booking Confirmed!',
        confirmedFor: 'Your session has been confirmed for:',
        allSet: "You're all set! See you then.",
        contactTrainer: 'Please contact your trainer if this is an error.',
        confirmTitle: 'Confirm This Time?',
        confirmButton: 'Confirm Booking',
        cancelButton: 'Go Back',
        confirmWarning: "Once confirmed, you won't be able to change your selection.",
      },
      sk: {
        chooseTime: 'Vyberte si čas',
        hi: 'Ahoj',
        session: 'Tréning',
        notesLabel: 'Poznámky od trénera',
        loading: 'Načítavam...',
        confirmed: 'Rezervácia potvrdená!',
        confirmedFor: 'Váš tréning bol potvrdený na:',
        allSet: 'Všetko je pripravené! Vidíme sa.',
        contactTrainer: 'Ak je to chyba, kontaktujte trénera.',
        confirmTitle: 'Potvrdiť tento čas?',
        confirmButton: 'Potvrdiť',
        cancelButton: 'Späť',
        confirmWarning: 'Po potvrdení nebude možné zmeniť výber.',
      },
    };
    return translations[language][key] || key;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div style={{ fontSize: '4rem' }}>⚠️</div>
          <h2 className={styles.errorTitle}>{error}</h2>
          <p className={styles.errorHint}>{t('contactTrainer')}</p>
        </div>
      </div>
    );
  }

  if (booking?.status === 'confirmed') {
    const confirmedSlot = booking.booking_slots.find((s) => s.is_selected);
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIconWrapper}>
            <div className={styles.logoIcon}>
              <span style={{ fontSize: '1.75rem' }}>💪</span>
            </div>
            <div className={styles.successCheck}>✓</div>
          </div>

          <h1 className={styles.successTitle}>{t('confirmed')}</h1>
          <p className={styles.successSubtitle}>
            {t('hi')} {booking?.client?.name}
          </p>

          {confirmedSlot && (
            <>
              <div className={styles.confirmedTimeCard}>
                <p className={styles.confirmedDate}>
                  {format(parseISO(confirmedSlot.proposed_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className={styles.confirmedTime}>
                  {format(parseISO(confirmedSlot.proposed_time), 'h:mm a')}
                </p>
              </div>

              {booking?.title && (
                <div className={styles.sessionType}>{booking.title}</div>
              )}
            </>
          )}

          <p className={styles.successNote}>{t('allSet')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoIcon}>
            <span style={{ fontSize: '2rem' }}>💪</span>
          </div>
          <div className={styles.langToggle}>
            <button
              className={language === 'en' ? styles.langActive : styles.langInactive}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={language === 'sk' ? styles.langActive : styles.langInactive}
              onClick={() => setLanguage('sk')}
            >
              SK
            </button>
          </div>
        </div>

        <h1 className={styles.title}>{t('chooseTime')}</h1>
        
        {booking?.client?.name && (
          <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '1rem' }}>
            {t('hi')} {booking.client.name}!
          </p>
        )}

        {booking?.title && (
          <div className={styles.sessionBadge}>
            {t('session')}: {booking.title}
          </div>
        )}

        <div className={styles.slotsList}>
          {booking?.booking_slots
            ?.sort((a, b) =>
              new Date(a.proposed_time).getTime() - new Date(b.proposed_time).getTime()
            )
            .map((slot, index) => (
              <button
                key={slot.id}
                className={styles.slotButton}
                onClick={() => handleSlotClick(slot)}
                disabled={selecting}
              >
                <div className={styles.slotContent}>
                  <div className={styles.slotLeft}>
                    <div className={styles.slotDate}>
                      {format(parseISO(slot.proposed_time), 'EEE, MMM d')}
                    </div>
                    <div className={styles.slotTime}>
                      {format(parseISO(slot.proposed_time), 'h:mm a')}
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
            <p className={styles.notesLabel}>{t('notesLabel')}:</p>
            <p className={styles.notesText}>{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && slotToConfirm && (
        <div className={styles.dialogOverlay} onClick={() => setShowConfirmDialog(false)}>
          <div className={styles.dialogCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>{t('confirmTitle')}</h2>
            </div>
            
            <div className={styles.dialogContent}>
              <div className={styles.dialogTimeBox}>
                <p className={styles.dialogDate}>
                  {format(parseISO(slotToConfirm.proposed_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className={styles.dialogTime}>
                  {format(parseISO(slotToConfirm.proposed_time), 'h:mm a')}
                </p>
              </div>

              {booking?.title && (
                <div className={styles.dialogSessionBadge}>
                  {booking.title}
                </div>
              )}

              <p className={styles.dialogWarning}>
                {t('confirmWarning')}
              </p>
            </div>

            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancelButton}
                onClick={() => setShowConfirmDialog(false)}
                disabled={selecting}
              >
                {t('cancelButton')}
              </button>
              <button
                className={styles.dialogConfirmButton}
                onClick={confirmSlotSelection}
                disabled={selecting}
              >
                {selecting ? (
                  <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div>
                ) : (
                  t('confirmButton')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
