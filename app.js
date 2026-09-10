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

  const CHEF_PRICE_PER_DAY = 3000;
  const AVOCADO_TOUR_PER_PERSON = 1000;

  const addonChefBox = document.getElementById('addonChef');
  const addonAvocadoBox = document.getElementById('addonAvocado');
  const addonChefLine = document.getElementById('addonChefLine');
  const addonChefVal = document.getElementById('addonChefVal');
  const addonAvocadoLine = document.getElementById('addonAvocadoLine');
  const addonAvocadoLabel = document.getElementById('addonAvocadoLabel');
  const addonAvocadoVal = document.getElementById('addonAvocadoVal');

  
  // ================== BOOKED DATES & CALENDAR SYNC ==================
  let globalBookedDates = new Set();
  const bookedWarningBox = document.getElementById('bookedWarningBox');
  const bookedWarningText = document.getElementById('bookedWarningText');

  const checkDateConflicts = (inDate, outDate) => {
    if (!globalBookedDates || globalBookedDates.size === 0) return [];
    const conflicts = [];
    const curr = new Date(inDate);
    curr.setHours(0,0,0,0);
    const end = new Date(outDate);
    end.setHours(0,0,0,0);

    while (curr < end) {
      const iso = formatDateISO(curr);
      if (globalBookedDates.has(iso)) {
        conflicts.push(iso);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return conflicts;
  };

  const fetchBookedDates = async () => {
    try {
      // 1. Try Vercel Serverless Function
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.dates)) {
          globalBookedDates = new Set(data.dates);
          updateCalculations();
          return;
        }
      }
      // 2. Fallback to static data/booked-dates.json
      const staticRes = await fetch('data/booked-dates.json');
      if (staticRes.ok) {
        const dates = await staticRes.json();
        if (Array.isArray(dates)) {
          globalBookedDates = new Set(dates);
          updateCalculations();
        }
      }
    } catch (err) {
      console.log('Booked dates sync notice:', err);
    }
  };

  const updateCalculations = () => {
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;

    const baseStayTotal = nights * PRICE_PER_NIGHT;
    
    // Calculate Add-Ons
    let chefTotal = 0;
    const isChefSelected = addonChefBox && addonChefBox.checked;
    if (isChefSelected) {
      chefTotal = nights * CHEF_PRICE_PER_DAY;
      if (addonChefLine) addonChefLine.style.display = 'flex';
      if (addonChefVal) addonChefVal.textContent = `+ KES ${chefTotal.toLocaleString()} (${nights}d)`;
    } else {
      if (addonChefLine) addonChefLine.style.display = 'none';
    }

    let avocadoTotal = 0;
    const isAvocadoSelected = addonAvocadoBox && addonAvocadoBox.checked;
    if (isAvocadoSelected) {
      avocadoTotal = guestsCount * AVOCADO_TOUR_PER_PERSON;
      if (addonAvocadoLine) addonAvocadoLine.style.display = 'flex';
      if (addonAvocadoLabel) addonAvocadoLabel.textContent = `Avocado Farm Tour (${guestsCount} guests)`;
      if (addonAvocadoVal) addonAvocadoVal.textContent = `+ KES ${avocadoTotal.toLocaleString()}`;
    } else {
      if (addonAvocadoLine) addonAvocadoLine.style.display = 'none';
    }

    const grandTotal = baseStayTotal + chefTotal + avocadoTotal;
    const deposit = Math.round(grandTotal * 0.5);
    // Check for booked date conflicts
    const conflicts = checkDateConflicts(checkInDate, checkOutDate);
    const hasConflicts = conflicts.length > 0;
    if (bookedWarningBox) {
      if (hasConflicts) {
        bookedWarningBox.style.display = 'block';
        if (bookedWarningText) {
          const readableConflicts = conflicts.map(d => {
            const parts = d.split('-');
            const dt = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            return formatDateLabel(dt);
          }).join(', ');
          bookedWarningText.innerHTML = `The following night(s) are already reserved: <strong>${readableConflicts}</strong>. Please adjust your check-in/check-out dates.`;
        }
      } else {
        bookedWarningBox.style.display = 'none';
      }
    }


    // Update labels
    if (checkInHeroLabel) checkInHeroLabel.textContent = formatDateLabel(checkInDate);
    if (checkOutHeroLabel) checkOutHeroLabel.textContent = formatDateLabel(checkOutDate);

    if (checkInInput) checkInInput.value = formatDateISO(checkInDate);
    if (checkOutInput) checkOutInput.value = formatDateISO(checkOutDate);

    if (nightsCountSpan) nightsCountSpan.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
    if (rateBreakdownSpan) rateBreakdownSpan.textContent = `KES ${PRICE_PER_NIGHT.toLocaleString()} × ${nights}`;
    if (subtotalSpan) subtotalSpan.textContent = `KES ${baseStayTotal.toLocaleString()}`;
    if (depositSpan) depositSpan.textContent = `KES ${deposit.toLocaleString()} (50%)`;
    if (totalSpan) totalSpan.textContent = `KES ${grandTotal.toLocaleString()}`;

    // Update WhatsApp pre-filled message
    const guestNameInput = document.getElementById('guestName');
    const specialReqInput = document.getElementById('specialRequests');

    const guestName = guestNameInput && guestNameInput.value ? guestNameInput.value.trim() : 'Guest';
    const notes = specialReqInput && specialReqInput.value ? `Special notes: ${specialReqInput.value.trim()}` : '';

    let addonsText = '';
    if (isChefSelected || isAvocadoSelected) {
      addonsText = '\n- Add-Ons:';
      if (isChefSelected) addonsText += `\n  • Private Chef (${nights} days @ KES 3,000/day = KES ${chefTotal.toLocaleString()})`;
      if (isAvocadoSelected) addonsText += `\n  • STER Avocado Farm Tour (${guestsCount} guests @ KES 1,000 = KES ${avocadoTotal.toLocaleString()})`;
    }

    const message = `Hello STER Farmhouse! I would like to request a reservation:
- Guest Name: ${guestName}
- Dates: ${formatDateLabel(checkInDate)} to ${formatDateLabel(checkOutDate)} (${nights} night${nights > 1 ? 's' : ''})
- Guests: ${guestsCount} guests
- Accommodation: Entire Home (KES ${baseStayTotal.toLocaleString()})${addonsText}
- Estimated Total: KES ${grandTotal.toLocaleString()} (50% deposit: KES ${deposit.toLocaleString()})
${notes ? notes + '\n' : ''}${hasConflicts ? "[NOTE: Requested dates include nights marked reserved (" + conflicts.join(", ") + "), inquiring for availability/waitlist]\n" : ""}Please confirm date availability!`;

    const encodedMsg = encodeURIComponent(message);
    if (whatsappBookBtn) {
      whatsappBookBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`;
    }
  };

  if (addonChefBox) addonChefBox.addEventListener('change', updateCalculations);
  if (addonAvocadoBox) addonAvocadoBox.addEventListener('change', updateCalculations);

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

  // Initial calculation & fetch booked dates
  updateCalculations();
  fetchBookedDates();

  // ================== 7. LIVE THARAKA NITHI WEATHER ==================
  const fetchLiveWeather = async () => {
    try {
      // Chuka / Tharaka Nithi Coordinates: lat -0.33, lon 37.65
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-0.33&longitude=37.65&current=temperature_2m,weather_code');
      if (!res.ok) return;
      const data = await res.json();
      
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      
      // Determine condition description
      const now = new Date();
      const hour = now.getHours();
      const isEvening = hour >= 17 || hour <= 6;
      
      let condition = isEvening ? 'CRISP HIGHLAND NIGHT' : 'CRISP HIGHLAND AIR';
      if (code === 0) condition = isEvening ? 'CLEAR STARRY NIGHT' : 'SUNNY HIGHLAND SKIES';
      else if (code >= 1 && code <= 3) condition = isEvening ? 'CRISP HIGHLAND EVENING' : 'PLEASANT & PARTLY CLOUDY';
      else if (code >= 51 && code <= 67) condition = 'FRESH MOUNTAIN RAIN';
      else if (code >= 80 && code <= 82) condition = 'COOL HIGHLAND SHOWERS';

      const tempVal = document.getElementById('tempVal');
      const condVal = document.getElementById('condVal');
      if (tempVal) tempVal.innerHTML = `${temp}&deg;C`;
      if (condVal) condVal.textContent = condition;
    } catch (err) {
      console.log('Using default highland climate values', err);
    }
  };
  fetchLiveWeather();

  // ================== 8. FULL-SCREEN LIGHTBOX GALLERY ==================
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');

  // Collect all gallery photos
  const galleryImgs = Array.from(document.querySelectorAll('.img-frame img, .room-img, .excursion-img-wrap img'));
  let currentIndex = 0;

  const openLightbox = (index) => {
    currentIndex = index;
    const target = galleryImgs[currentIndex];
    if (!target) return;

    lightboxImg.src = target.src;
    lightboxCaption.textContent = target.alt || 'The STER Farmhouse';
    lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImgs.length}`;
    
    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  const showPrev = () => {
    currentIndex = (currentIndex - 1 + galleryImgs.length) % galleryImgs.length;
    openLightbox(currentIndex);
  };

  const showNext = () => {
    currentIndex = (currentIndex + 1) % galleryImgs.length;
    openLightbox(currentIndex);
  };

  galleryImgs.forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(i));
  });

  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
  if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
  
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  // Touch Swipe for Mobile
  let touchStartX = 0;
  let touchEndX = 0;
  if (lightboxModal) {
    lightboxModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) showNext(); // Swipe left
      if (touchEndX - touchStartX > 50) showPrev(); // Swipe right
    }, { passive: true });
  }


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
