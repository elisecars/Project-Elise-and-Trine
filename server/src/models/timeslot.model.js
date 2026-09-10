class Booking {
  constructor(
    time,
    assistant,
    booked = 0, // 0 = ledig, 1 = bokad, 2 = reserverad
    booked_by = null,
    place,
    date,
    bookingStart = null,
    bookingEnd = null,
    postBookingDate = null,
    examination = null,
    cancelled = 0,
    cancelled_by = null,
    cancellationDeadline = null,
  ) {
    // Initierar en bokning med all nödvändig information
    this.time = time;
    this.assistant = assistant;
    this.booked = booked;
    this.booked_by = booked_by;
    this.place = place;
    this.date = date;
    this.bookingStart = bookingStart;
    this.bookingEnd = bookingEnd;
    this.postBookingDate = postBookingDate;
    this.examination = examination;
    this.cancelled = cancelled;
    this.cancelled_by = cancelled_by;
    this.cancellationDeadline = cancellationDeadline;
  }

  // Försöker reservera en ledig tid (ändra status till 2 = reserverad)
  reserve() {
    if (this.booked !== 0) return false; // Endast lediga tider kan reserveras
    this.booked = 2;
    return true;
  }

  //Om tidsluckan är reserverad (booked === 2), kan en student boka den genom att ange sitt namn
  book(username) {
    if (this.booked !== 2) return false;
    this.booked = 1; // Markera tidsluckan som bokad
    this.booked_by = username; // Sätt studentens namn som bokaren
    return true;
  }

  // Avbokar en tid (endast om den är bokad)
  cancelBooking(username) {
    if (this.booked !== 1) return false; // Endast bokade tider kan avbokas

    this.cancelled = 1;
    this.cancelled_by = username;
    this.booked = 0;
    this.booked_by = null;
    return true;
  }

  // Avbryter reservationen för tidsluckan om den är reserverad (booked === 2)
  cancelReservation() {
    if (this.booked !== 2) return false; // Om tidsluckan inte är reserverad kan reservationen inte avbrytas
    this.booked = 0; // Gör tidsluckan ledig igen
    this.booked_by = null; // Ta bort information om vem som reserverade
    return true;
  }

  // Kollar om aktuell tid ligger inom bokningsperioden
  isWithinBookingPeriod(today = new Date()) {
    const start = new Date(this.bookingStart);
    const end = new Date(this.bookingEnd);
    return today >= start && today <= end;
  }

  // Kollar om tiden är ledig på ett specifikt datum
  dateAvailable(date) {
    const slotDate = new Date(this.date);
    const requestedDate = new Date(date);
    // Jämför datumen (utan tid) och returnerar true om bokningen är ledig
    return (
      slotDate.toISOString().split("T")[0] ===
        requestedDate.toISOString().split("T")[0] && this.booked === 0
    );
  }
}

export default Booking;
