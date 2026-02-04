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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [slotToConfirm, setSlotToConfirm] = useState<BookingSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    // Show confirmation dialog
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

      console.log('🔵 Confirming slot:', slotToConfirm.id);

      const { error: updateError } = await supabase
        .from('booking_slots')
        .update({ is_selected: true })
        .eq('id', slotToConfirm.id);

      if (updateError) {
        console.error('🔴 Error updating slot:', updateError);
        setError('Failed to confirm booking. Please try again.');
        setSelectedSlotId(null);
        return;
      }

      console.log('✅ Slot confirmed successfully!');

      // Reload booking
      if (token && typeof token === 'string') {
        await loadBooking(token);
      }
    } catch (err) {
      console.error('🔴 Exception:', err);
      setError('Something went wrong');
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
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>{error}</h2>
          <p>Please contact your trainer if this is an error.</p>
        </div>
      </div>
    );
  }

  if (booking?.status === 'confirmed') {
    const confirmedSlot = booking.booking_slots.find((s) => s.is_selected);
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <h1>Booking Confirmed!</h1>
          <p className={styles.clientName}>Hi {booking?.client?.name},</p>
          <p>Your session has been confirmed for:</p>
          {confirmedSlot && (
            <div className={styles.confirmedTime}>
              <p className={styles.confirmedDate}>
                {format(parseISO(confirmedSlot.proposed_time), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className={styles.confirmedHour}>
                {format(parseISO(confirmedSlot.proposed_time), 'h:mm a')}
              </p>
            </div>
          )}
          {booking?.title && (
            <p className={styles.sessionTitle}>{booking?.title}</p>
          )}
          <p className={styles.successNote}>You're all set! See you then.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose Your Time</h1>
          <p className={styles.subtitle}>Hi {booking?.client?.name}!</p>
          {booking?.title && (
            <p className={styles.sessionInfo}>Session: {booking?.title}</p>
          )}
        </div>

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
                <div className={styles.slotNumber}>Option {index + 1}</div>
                <div className={styles.slotDate}>
                  {format(parseISO(slot.proposed_time), 'EEEE, MMMM d')}
                </div>
                <div className={styles.slotTime}>
                  {format(parseISO(slot.proposed_time), 'h:mm a')}
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
          <div className={styles.notes}>
            <p className={styles.notesLabel}>Notes from your trainer:</p>
            <p className={styles.notesText}>{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && slotToConfirm && (
        <div className={styles.dialogOverlay} onClick={handleCancelConfirm}>
          <div className={styles.dialogCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>Confirm Your Booking</h2>
            </div>
            
            <div className={styles.dialogContent}>
              <p className={styles.dialogText}>
                You're about to confirm your session for:
              </p>
              
              <div className={styles.dialogTimeBox}>
                <div className={styles.dialogDate}>
                  {format(parseISO(slotToConfirm.proposed_time), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className={styles.dialogTime}>
                  {format(parseISO(slotToConfirm.proposed_time), 'h:mm a')}
                </div>
              </div>

              {booking?.title && (
                <p className={styles.dialogSessionTitle}>
                  Session: {booking.title}
                </p>
              )}

              <p className={styles.dialogWarning}>
                Once confirmed, this booking cannot be changed.
              </p>
            </div>

            <div className={styles.dialogActions}>
              <button 
                className={styles.dialogCancelButton}
                onClick={handleCancelConfirm}
                disabled={selecting}
              >
                Cancel
              </button>
              <button 
                className={styles.dialogConfirmButton}
                onClick={handleConfirmBooking}
                disabled={selecting}
              >
                {selecting ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
