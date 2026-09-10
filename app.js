/* ==========================================================================
   THE STER FARMHOUSE — INTERACTIVE LOGIC & RESERVATION ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Reveal on scroll animations
  const revealElements = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // 2. Mobile Menu Drawer Toggle
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burgerBtn && mobileMenu) {
    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-menu a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && e.target !== burgerBtn) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // 3. Pricing Configuration
  const PRICE_PER_NIGHT = 15000; // KES
  const WHATSAPP_NUMBER = '254702753299'; // Default host line

  // 4. Booking State
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  let checkInDate = tomorrow;
  let checkOutDate = dayAfter;
  let guestsCount = 4;

  const formatDateLabel = (d) => {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 5. DOM References
  const checkInHeroLabel = document.getElementById('checkInHeroLabel');
  const checkOutHeroLabel = document.getElementById('checkOutHeroLabel');
  const checkInInput = document.getElementById('calcCheckIn');
  const checkOutInput = document.getElementById('calcCheckOut');
  const guestsSelect = document.getElementById('guestsSelect');
  const heroGuestsSelect = document.getElementById('heroGuestsSelect');

  const nightsCountSpan = document.getElementById('nightsCount');
  const rateBreakdownSpan = document.getElementById('rateBreakdown');
  const subtotalSpan = document.getElementById('subtotalVal');
  const depositSpan = document.getElementById('depositVal');
  const totalSpan = document.getElementById('totalVal');
  const whatsappBookBtn = document.getElementById('whatsappBookBtn');

  const updateCalculations = () => {
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;

    const total = nights * PRICE_PER_NIGHT;
    const deposit = Math.round(total * 0.5);

    // Update labels
    if (checkInHeroLabel) checkInHeroLabel.textContent = formatDateLabel(checkInDate);
    if (checkOutHeroLabel) checkOutHeroLabel.textContent = formatDateLabel(checkOutDate);

    if (checkInInput) checkInInput.value = formatDateISO(checkInDate);
    if (checkOutInput) checkOutInput.value = formatDateISO(checkOutDate);

    if (nightsCountSpan) nightsCountSpan.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
    if (rateBreakdownSpan) rateBreakdownSpan.textContent = `KES ${PRICE_PER_NIGHT.toLocaleString()} × ${nights}`;
    if (subtotalSpan) subtotalSpan.textContent = `KES ${total.toLocaleString()}`;
    if (depositSpan) depositSpan.textContent = `KES ${deposit.toLocaleString()} (50%)`;
    if (totalSpan) totalSpan.textContent = `KES ${total.toLocaleString()}`;

    // Update WhatsApp pre-filled message
    const guestNameInput = document.getElementById('guestName');
    const specialReqInput = document.getElementById('specialRequests');

    const guestName = guestNameInput && guestNameInput.value ? guestNameInput.value.trim() : 'Guest';
    const notes = specialReqInput && specialReqInput.value ? `Special notes: ${specialReqInput.value.trim()}` : '';

    const message = `Hello STER Farmhouse! I would like to request a reservation:
- Guest Name: ${guestName}
- Dates: ${formatDateLabel(checkInDate)} to ${formatDateLabel(checkOutDate)} (${nights} night${nights > 1 ? 's' : ''})
- Guests: ${guestsCount} guests
- Total: KES ${total.toLocaleString()} (50% deposit: KES ${deposit.toLocaleString()})
${notes ? notes + '\n' : ''}Please confirm date availability!`;

    const encodedMsg = encodeURIComponent(message);
    if (whatsappBookBtn) {
      whatsappBookBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`;
    }
  };

  // Sync inputs
  if (checkInInput) {
    checkInInput.min = formatDateISO(today);
    checkInInput.addEventListener('change', (e) => {
      const selected = new Date(e.target.value + 'T00:00:00');
      if (!isNaN(selected.getTime())) {
        checkInDate = selected;
        if (checkOutDate <= checkInDate) {
          checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + 1);
        }
        updateCalculations();
      }
    });
  }

  if (checkOutInput) {
    checkOutInput.min = formatDateISO(tomorrow);
    checkOutInput.addEventListener('change', (e) => {
      const selected = new Date(e.target.value + 'T00:00:00');
      if (!isNaN(selected.getTime())) {
        if (selected > checkInDate) {
          checkOutDate = selected;
          updateCalculations();
        } else {
          alert('Check-out date must be after check-in date.');
          checkOutInput.value = formatDateISO(checkOutDate);
        }
      }
    });
  }

  if (heroGuestsSelect) {
    heroGuestsSelect.addEventListener('change', (e) => {
      guestsCount = parseInt(e.target.value, 10);
      if (guestsSelect) guestsSelect.value = guestsCount;
      updateCalculations();
    });
  }

  if (guestsSelect) {
    guestsSelect.addEventListener('change', (e) => {
      guestsCount = parseInt(e.target.value, 10);
      if (heroGuestsSelect) heroGuestsSelect.value = guestsCount;
      updateCalculations();
    });
  }

  const guestNameInput = document.getElementById('guestName');
  const specialReqInput = document.getElementById('specialRequests');
  if (guestNameInput) guestNameInput.addEventListener('input', updateCalculations);
  if (specialReqInput) specialReqInput.addEventListener('input', updateCalculations);

  // Initial calculation
  updateCalculations();

  // 6. Smooth scroll for anchor tags
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
