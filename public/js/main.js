// Shared front-end behavior for GIMS landing page

document.addEventListener('DOMContentLoaded', () => {
  const topbar = document.getElementById('topbar');
  const navbar = document.getElementById('navbar');

  const handleScroll = () => {
    const scrolled = window.scrollY > 10;
    if (topbar) {
      topbar.classList.toggle('is-scrolled', scrolled);
    }
    if (navbar) {
      navbar.classList.toggle('is-scrolled', scrolled);
    }
  };

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  // GAD seminars modal viewer on the public dashboard
  const seminarModalBackdrop = document.getElementById('seminar-modal-backdrop');
  const seminarModalTitle = document.getElementById('seminar-modal-title');
  const seminarModalImage = document.getElementById('seminar-modal-image');
  const seminarModalMeta = document.getElementById('seminar-modal-meta');
  const seminarModalText = document.getElementById('seminar-modal-text');
  const seminarModalClose = document.getElementById('close-seminar-modal');

  const seminarDetails = {
    'seminar-1': {
      title: 'Building Allyship in the Xavier Workplace',
      date: 'April 23 • 1:30–4:30 PM • Little Theater',
      image: '/images/gad-seminar-1.png',
      body:
        'This interactive session invites administrators, faculty, and staff to explore what everyday allyship looks like in Xavier offices and classrooms.\n\n' +
        'Through case studies based on local campus scenarios, participants will:\n' +
        '• Practice responding to biased remarks in meetings and classes.\n' +
        '• Reflect on their own spheres of influence and power.\n' +
        '• Co-design simple commitments for more gender‑responsive workflows.\n\n' +
        'The seminar is co-facilitated by the GAD Office and partners from the Guidance and Counseling Office, drawing on Ignatian reflection and feminist pedagogies.',
    },
    'seminar-2': {
      title: 'XU Gender Sensitivity & Policy Orientation',
      date: 'Campus‑wide flagship • First month of every academic year',
      image: '/images/gad-seminar-2.png',
      body:
        'This flagship orientation is a foundational seminar for all new employees and a regular refresher for continuing personnel.\n\n' +
        'Key segments include:\n' +
        '• A walk‑through of Xavier University’s gender‑fair policies and codes of conduct.\n' +
        '• Clear explanation of reporting, referral, and support mechanisms.\n' +
        '• A live demonstration of how seminar completion and attendance are monitored through GIMS.\n\n' +
        'Participants leave with a concrete understanding of their responsibilities and of the institutional supports available to them.',
    },
    'seminar-3': {
      title: 'Conversations on Safe and Inclusive Campuses',
      date: 'Term‑long GAD learning space • Hybrid',
      image: '/images/gad-seminar-3.png',
      body:
        'Inspired by Ateneo’s UGDO learning spaces, this Xavier‑based conversation series gathers small groups of employees for slow, sustained reflection on SOGIESC, safety, and accompaniment.\n\n' +
        'Each session focuses on one theme, such as:\n' +
        '• Listening to student narratives of belonging and exclusion.\n' +
        '• Designing safer procedures in offices, laboratories, and student organizations.\n' +
        '• Practicing language that affirms diverse identities in official communication.\n\n' +
        'Outputs from the series can inform unit‑level GAD plans and future seminar designs within GIMS.',
    },
  };

  const openSeminarModal = (id) => {
    if (
      !seminarModalBackdrop ||
      !seminarModalTitle ||
      !seminarModalImage ||
      !seminarModalMeta ||
      !seminarModalText
    ) {
      return;
    }
    const details = seminarDetails[id];
    if (!details) return;

    seminarModalTitle.textContent = details.title;
    seminarModalMeta.textContent = details.date;
    seminarModalText.textContent = details.body;
    seminarModalImage.src = details.image;
    seminarModalBackdrop.style.display = 'flex';
  };

  const closeSeminarModal = () => {
    if (!seminarModalBackdrop) return;
    seminarModalBackdrop.style.display = 'none';
  };

  if (seminarModalClose && seminarModalBackdrop) {
    seminarModalClose.addEventListener('click', closeSeminarModal);
    seminarModalBackdrop.addEventListener('click', (event) => {
      if (event.target === seminarModalBackdrop) {
        closeSeminarModal();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && seminarModalBackdrop?.style.display === 'flex') {
      closeSeminarModal();
    }
  });

  document.querySelectorAll('.gad-seminar-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-seminar-id]');
      if (!card) return;
      const id = card.getAttribute('data-seminar-id');
      if (!id) return;
      openSeminarModal(id);
    });
  });

  document.querySelectorAll('.gad-seminar-card').forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const id = card.getAttribute('data-seminar-id');
      if (!id) return;
      openSeminarModal(id);
    });
  });

  // Scroll reveal animation for sections/cards
  const revealEls = document.querySelectorAll('.reveal-on-scroll');
  if (revealEls.length) {
    const onScroll = () => {
      const viewportBottom = window.scrollY + window.innerHeight * 0.9;
      revealEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        if (viewportBottom >= top && !el.classList.contains('is-visible')) {
          el.classList.add('is-visible');
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
});

