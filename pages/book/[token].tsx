import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase, type Booking, type BookingSlot, type Client } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import styles from '../../styles/Book.module.css';

type BookingWithDetails = Booking & {
  client: Client;
  booking_slots: BookingSlot[];
};

// Pošli push notifikáciu cez Expo Push API
async function sendPushNotification(
  pushToken: string,
  clientName: string,
  confirmedTime: string
) {
  const message = {
    to: pushToken,
    sound: 'default',
    title: '✅ Booking Confirmed!',
    body: `${clientName} confirmed: ${confirmedTime}`,
    data: { type: 'booking_confirmed' },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification result:', result);
  } catch (error) {
    // Notifikácia nie je kritická - booking je potvrdený aj bez nej
    console.error('Error sending push notification:', error);
  }
}

export default function BookingPage() {
  const router = useRouter();
  const { token } = router.query;

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
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

  async function selectSlot(slotId: string) {
    if (!booking) return;

    try {
      setSelecting(true);
      setSelectedSlotId(slotId);

      // 1. Označ slot ako vybraný
      const { error: slotError } = await supabase
        .from('booking_slots')
        .update({ is_selected: true })
        .eq('id', slotId);

      if (slotError) {
        console.error('Slot update error:', slotError);
        setError('Failed to confirm booking. Please try again.');
        setSelectedSlotId(null);
        return;
      }

      // 2. Zmeň status bookingu na confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (bookingError) {
        console.error('Booking status update error:', bookingError);
        // Slot je už označený, pokračujeme aj bez status update
      }

      // 3. Načítaj push token trénera a pošli notifikáciu
      const confirmedSlot = booking.booking_slots.find(s => s.id === slotId);

      if (confirmedSlot) {
        const confirmedTimeFormatted = format(
          parseISO(confirmedSlot.proposed_time),
          'EEE, MMM d \'at\' h:mm a'
        );

        const { data: trainerData } = await supabase
          .from('trainers')
          .select('push_token')
          .eq('id', booking.trainer_id)
          .single();

        if (trainerData?.push_token) {
          await sendPushNotification(
            trainerData.push_token,
            booking.client?.name || 'Client',
            confirmedTimeFormatted
          );
        }
      }

      // 4. Reload stránky
      if (token && typeof token === 'string') {
        await loadBooking(token);
      }

    } catch (err) {
      console.error('Exception in selectSlot:', err);
      setError('Something went wrong');
      setSelectedSlotId(null);
    } finally {
      setSelecting(false);
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
                onClick={() => selectSlot(slot.id)}
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
    </div>
  );
}
