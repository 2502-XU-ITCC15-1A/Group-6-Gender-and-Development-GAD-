document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} */
  let token = window.localStorage.getItem('gadims_employee_token');
  const savedRole = window.localStorage.getItem('gadims_role');

  if (!token) {
    window.location.href = '/';
    return;
  }

  if (savedRole === 'admin') {
    window.location.href = '/admin.html';
    return;
  }

  const el = {
    topbarName:
      document.getElementById('employee-topbar-name') ||
      document.getElementById('employee-profile-trigger'),
    profileTrigger: document.getElementById('employee-profile-trigger'),
    topbarEmail: document.getElementById('employee-topbar-email'),
    topbarId: document.getElementById('employee-topbar-id'),
    welcomeName: document.getElementById('employee-welcome-name'),

    complianceProgressText: document.getElementById('compliance-progress-text'),
    complianceProgressPercent: document.getElementById('compliance-progress-percent'),
    complianceProgressBar: document.getElementById('compliance-progress-bar'),
    complianceStatusBadge: document.getElementById('compliance-status-badge'),
    complianceUpdatedAt: document.getElementById('compliance-updated-at'),
    complianceAdviceBox: document.getElementById('compliance-advice-box'),
    complianceAdviceHeader: document.getElementById('compliance-advice-header'),
    complianceAdviceText: document.getElementById('compliance-advice-text'),

    infoId: document.getElementById('employee-info-id'),
    infoEmail: document.getElementById('employee-info-email'),
    infoDepartment: document.getElementById('employee-info-department'),
    infoPosition: document.getElementById('employee-info-position'),
    infoBirthSex: document.getElementById('employee-info-birthSex'),
    infoGenderIdentity: document.getElementById('employee-info-genderIdentity'),
    infoMaleCount: document.getElementById('employee-info-maleCount'),
    infoFemaleCount: document.getElementById('employee-info-femaleCount'),

    upcomingCarousel: document.getElementById('upcoming-carousel'),
    upcomingPrevBtn: document.getElementById('upcoming-prev-btn'),
    upcomingNextBtn: document.getElementById('upcoming-next-btn'),
    upcomingStatus: document.getElementById('upcoming-status'),

    certificatesList: document.getElementById('certificates-list'),
    certificatesDownloadAllBtn: document.getElementById('certificates-download-all-btn'),
    certificatesCountText: document.getElementById('certificates-count-text'),
    certificatesStatus: document.getElementById('certificates-status'),
    joinedSeminarsList: document.getElementById('joined-seminars-list'),
    seminarFilterSelect: document.getElementById('seminar-filter-select'),

    // Join modal
    joinBackdrop: document.getElementById('join-modal-backdrop'),
    joinTitle: document.getElementById('join-modal-title'),
    joinMeta: document.getElementById('join-modal-meta'),
    joinDesc: document.getElementById('join-modal-desc'),
    joinConsent1: document.getElementById('join-consent-1'),
    joinConsent2: document.getElementById('join-consent-2'),
    joinConfirmBtn: document.getElementById('join-modal-confirm'),
    joinCancelBtn: document.getElementById('join-modal-cancel'),
    joinCloseBtn: document.getElementById('join-modal-close'),
    joinStatus: document.getElementById('join-modal-status'),
    logoutBtn: document.getElementById('employee-logout-btn'),
  };

  let currentDashboardData = null;
  let currentSeminarFilter = 'open';
  let currentEmployeeId = null;
  let currentSeminars = [];

  const authedFetch = async (url, options = {}) => {
    if (!token) throw new Error('Not authenticated');
    const headers = options.headers || {};
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const escapeHtml = (str) => {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const formatSeminarDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return String(date);
    }
  };

  const truncate = (text, max = 120) => {
    const s = String(text || '');
    if (s.length <= max) return s;
    return s.slice(0, max).trimEnd() + '…';
  };

  const parseStartTimeToMinutes = (startTime) => {
    const value = String(startTime || '').trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) return 0;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  };

  const sortSeminarsNearestToFarthest = (seminars) => {
    return [...seminars].sort((a, b) => {
      const aDate = new Date(a.date || 0);
      const bDate = new Date(b.date || 0);
      const aTs = Number.isNaN(aDate.getTime()) ? Number.MAX_SAFE_INTEGER : aDate.getTime();
      const bTs = Number.isNaN(bDate.getTime()) ? Number.MAX_SAFE_INTEGER : bDate.getTime();
      if (aTs !== bTs) return aTs - bTs;
      const aMinutes = parseStartTimeToMinutes(a.startTime);
      const bMinutes = parseStartTimeToMinutes(b.startTime);
      return aMinutes - bMinutes;
    });
  };

  const renderJoinedSeminars = (joinedSeminars) => {
    if (!el.joinedSeminarsList) return;
    if (!Array.isArray(joinedSeminars) || joinedSeminars.length === 0) {
      el.joinedSeminarsList.innerHTML = '<p class="muted">No joined seminars yet.</p>';
      return;
    }

    el.joinedSeminarsList.innerHTML = joinedSeminars
      .map((seminar) => `
        <article class="card seminar-card">
          <div class="badge badge-soft">${escapeHtml(seminar.statusLabel)}</div>
          <h3 style="margin-top:0.7rem;">${escapeHtml(seminar.title || '')}</h3>
          <p class="muted small">${escapeHtml(seminar.dateText || '')}</p>
          <p class="muted small">${escapeHtml(seminar.description || '')}</p>
        </article>
      `)
      .join('');
  };

  const getJoinedSeminars = () => {
    if (!currentEmployeeId || !Array.isArray(currentSeminars)) return [];
    return sortSeminarsNearestToFarthest(
      currentSeminars
      .filter((seminar) => Array.isArray(seminar.registeredEmployees) && seminar.registeredEmployees.some((id) => String(id) === String(currentEmployeeId)))
    )
      .map((seminar) => ({
        id: seminar._id || seminar.id,
        title: seminar.title,
        dateText: `${formatSeminarDate(seminar.date)} • ${seminar.startTime || ''}`,
        description: seminar.description,
        statusLabel: 'Joined',
      }));
  };

  const applySeminarFilter = () => {
    if (!currentDashboardData) return;
    const seminars = Array.isArray(currentDashboardData.upcomingSeminars) ? currentDashboardData.upcomingSeminars : [];
    const joinedSeminars = getJoinedSeminars();
    const joinedIds = new Set(joinedSeminars.map((item) => String(item.id)));
    const filtered = currentSeminarFilter === 'joined'
      ? seminars.filter((seminar) => joinedIds.has(String(seminar.id)))
      : seminars.filter((seminar) => !joinedIds.has(String(seminar.id)));

    renderUpcoming(sortSeminarsNearestToFarthest(filtered));
    renderJoinedSeminars(joinedSeminars);

    if (el.seminarFilterSelect) {
      el.seminarFilterSelect.value = currentSeminarFilter;
    }

    if (!filtered.length) {
      el.upcomingStatus.textContent =
        currentSeminarFilter === 'joined'
          ? 'No joined seminars found in upcoming schedules.'
          : 'No open seminars found.';
    }
  };

  const openJoinModal = ({ seminar, joinActionId }) => {
    if (!el.joinBackdrop || !el.joinConfirmBtn || !el.joinConsent1 || !el.joinConsent2) return;

    el.joinTitle.textContent = 'Join Seminar';
    const dateStr = `${formatSeminarDate(seminar.date)} • ${seminar.startTime || ''}`;
    const mandatoryLabel = seminar.mandatory ? 'Mandatory' : 'Optional';
    el.joinMeta.textContent = `${dateStr} • ${mandatoryLabel} • ${seminar.remainingCapacity} slots remaining`;
    el.joinDesc.textContent = seminar.description || '';

    // Reset checkboxes / state
    el.joinConsent1.checked = false;
    el.joinConsent2.checked = false;
    el.joinStatus.textContent = '';
    el.joinConfirmBtn.disabled = true;

    const updateConfirmState = () => {
      const ok = el.joinConsent1.checked && el.joinConsent2.checked;
      el.joinConfirmBtn.disabled = !ok;
    };

    el.joinConsent1.onchange = updateConfirmState;
    el.joinConsent2.onchange = updateConfirmState;

    el.joinConfirmBtn.dataset.joinId = joinActionId || seminar.id || '';
    el.joinBackdrop.style.display = 'flex';
  };

  const closeJoinModal = () => {
    if (!el.joinBackdrop) return;
    el.joinBackdrop.style.display = 'none';
  };

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && el.joinBackdrop?.style.display === 'flex') {
      closeJoinModal();
    }
  });

  el.joinConfirmBtn?.addEventListener('click', async () => {
    const seminarId = el.joinConfirmBtn.dataset.joinId;
    if (!seminarId) return;
    el.joinStatus.textContent = 'Processing…';
    el.joinConfirmBtn.disabled = true;
    try {
      const res = await authedFetch(`/api/employee/seminars/${seminarId}/register`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Registration failed');
      el.joinStatus.textContent = data?.message || 'You have successfully registered for this seminar.';
      closeJoinModal();
      await loadDashboard();
    } catch (err) {
      el.joinStatus.textContent = err.message || 'Registration failed.';
      el.joinConfirmBtn.disabled = false;
    }
  });

  el.joinCancelBtn?.addEventListener('click', closeJoinModal);
  el.joinCloseBtn?.addEventListener('click', closeJoinModal);
  el.joinBackdrop?.addEventListener('click', (e) => {
    if (e.target === el.joinBackdrop) closeJoinModal();
  });

  el.profileTrigger?.addEventListener('click', () => {
    document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  el.logoutBtn?.addEventListener('click', () => {
    window.localStorage.removeItem('gadims_employee_token');
    window.localStorage.removeItem('gadims_role');
    window.location.href = '/';
  });

  document.querySelectorAll('[data-scroll-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-scroll-target');
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  el.seminarFilterSelect?.addEventListener('change', (event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const filter = target.value;
    if (!filter) return;
    currentSeminarFilter = filter;
    applySeminarFilter();
  });

  const renderUpcoming = (upcomingSeminars) => {
    if (!el.upcomingCarousel) return;
    el.upcomingCarousel.innerHTML = '';

    if (!Array.isArray(upcomingSeminars) || upcomingSeminars.length === 0) {
      el.upcomingCarousel.innerHTML = `<p class="muted">No upcoming seminars found.</p>`;
      return;
    }

    const cards = upcomingSeminars.map((s) => {
      const mandatoryLabel = s.mandatory ? 'Mandatory' : 'Optional';
      const shortDesc = truncate(s.description, 110);
      const capacity = Number(s.capacity || 0);
      const remaining = Number(s.remainingCapacity || 0);
      const joined = Math.max(0, capacity - remaining);
      const isJoined =
        currentEmployeeId &&
        Array.isArray(s.registeredEmployees) &&
        s.registeredEmployees.some((id) => String(id) === String(currentEmployeeId));

      const actionLabel = isJoined ? 'Joined' : 'Join Seminar';
      const actionDisabledAttr = isJoined ? 'disabled' : '';
      return `
        <div class="card seminar-card" style="box-shadow:none; padding: 1rem; min-width: 290px; flex: 0 0 290px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; align-items:flex-start; gap: 0.8rem;">
            <div style="width:36px; height:36px; border-radius:10px; background: rgba(32,58,115,0.12); display:flex; align-items:center; justify-content:center; color: var(--xu-blue); font-weight:600;">
              ▣
            </div>
            <div style="flex:1;">
              <div style="font-weight:600; color: var(--xu-blue);">
                ${escapeHtml(s.title)}
              </div>
              <div class="muted small" style="margin-top:0.25rem; font-size:0.82rem;">
                ${escapeHtml(formatSeminarDate(s.date))} • ${escapeHtml(s.startTime || '')}
              </div>
              <div class="muted small" style="font-size:0.82rem; margin-top:0.25rem;">
                Instructor: ${escapeHtml(s.instructorName || 'GAD Office')}
              </div>
            </div>
          </div>

          <div class="muted" style="margin-top: 0.75rem; font-size:0.92rem; line-height:1.4;">
            ${escapeHtml(shortDesc)}
          </div>

          <div style="margin-top: 0.75rem; display:flex; justify-content: space-between; align-items:center; gap: 0.75rem;">
            <div>
              <div class="badge badge-soft" style="background: rgba(32,58,115,0.08); color: var(--xu-blue); border-color: rgba(32,58,115,0.18);">
                ${escapeHtml(mandatoryLabel)}
              </div>
            </div>
            <div class="muted small" style="font-size:0.82rem;">
              Slots: ${escapeHtml(joined)}/${escapeHtml(capacity)}
            </div>
          </div>

          <button class="btn join-seminar-btn" style="margin-top: 0.9rem; width: 100%;" data-join-id="${escapeHtml(s.id)}" type="button" ${actionDisabledAttr}>
            ${actionLabel}
          </button>
        </div>
      `;
    });

    el.upcomingCarousel.innerHTML = cards.join('');
    el.upcomingCarousel.querySelectorAll('button[data-join-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const seminarId = btn.getAttribute('data-join-id');
        const seminar = upcomingSeminars.find((x) => String(x.id) === String(seminarId));
        if (!seminar) return;
        openJoinModal({ seminar, joinActionId: seminarId });
      });
    });
  };

  const renderCertificates = (certificates) => {
    if (!el.certificatesList) return;
    el.certificatesList.innerHTML = '';

    const count = Array.isArray(certificates) ? certificates.length : 0;
    if (el.certificatesCountText) {
      el.certificatesCountText.textContent = `Your GAD seminar completion certificates (${count})`;
    }

    if (!Array.isArray(certificates) || certificates.length === 0) {
      el.certificatesList.innerHTML = `<p class="muted">No completed certificates yet.</p>`;
      return;
    }

    const rows = certificates.map((c) => {
      const dateStr = c.seminar?.date ? formatSeminarDate(c.seminar.date) : '';
      const certificateLabel = c.certificateCode || c.registrationId.slice(-10);
      return `
        <div class="card" style="box-shadow:none; padding: 0.9rem 1rem; display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
          <div style="min-width:0;">
            <div style="font-weight: 600; color: var(--xu-blue);">${escapeHtml(c.seminar?.title || '')}</div>
            <div class="muted small" style="font-size:0.82rem; margin-top:0.25rem;">
              Date: ${escapeHtml(dateStr)} • Certificate ID: ${escapeHtml(certificateLabel)}
            </div>
          </div>
          <button class="btn secondary" data-download-cert="${escapeHtml(c.registrationId)}" type="button">
            Download
          </button>
        </div>
      `;
    });

    el.certificatesList.innerHTML = rows.join('');

    el.certificatesList.querySelectorAll('button[data-download-cert]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const registrationId = btn.getAttribute('data-download-cert');
        if (!registrationId) return;
        await downloadCertificate(registrationId);
      });
    });
  };

  const downloadCertificate = async (registrationId) => {
    if (!registrationId) return;
    el.certificatesStatus.textContent = 'Preparing download…';
    try {
      const res = await authedFetch(`/api/employee/certificates/${registrationId}/download`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Download failed');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const fileNameMatch = /filename="?([^";]+)"?/i.exec(disposition);
      const suggestedName = fileNameMatch?.[1] || `GADIMS-Certificate-${registrationId}.html`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      el.certificatesStatus.textContent = '';
    } catch (err) {
      el.certificatesStatus.textContent = err.message || 'Download failed.';
    }
  };

  el.certificatesDownloadAllBtn?.addEventListener('click', async () => {
    const buttons = Array.from(el.certificatesList?.querySelectorAll('button[data-download-cert]') || []);
    if (buttons.length === 0) return;
    // sequential downloads to avoid browser popup spam
    for (const btn of buttons) {
      const id = btn.getAttribute('data-download-cert');
      // eslint-disable-next-line no-await-in-loop
      await downloadCertificate(id);
      // slight delay
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  const loadDashboard = async () => {
    if (!token) {
      throw new Error('Not authenticated. Please login.');
    }
    const [dashboardRes, meRes, seminarsRes] = await Promise.all([
      authedFetch('/api/employee/dashboard', { method: 'GET' }),
      authedFetch('/api/employee/me', { method: 'GET' }),
      authedFetch('/api/employee/seminars', { method: 'GET' }),
    ]);
    const data = await dashboardRes.json();
    const meData = await meRes.json();
    const seminarsData = await seminarsRes.json();
    if (!dashboardRes.ok) throw new Error(data?.message || 'Failed to load dashboard');
    if (!meRes.ok) throw new Error(meData?.message || 'Failed to load profile');
    if (!seminarsRes.ok) throw new Error(seminarsData?.message || 'Failed to load seminars');

    if (data.profile?.role && data.profile.role !== 'employee') {
      window.localStorage.setItem('gadims_role', String(data.profile.role));
      window.location.href = '/admin.html';
      return;
    }
    window.localStorage.setItem('gadims_role', 'employee');

    // Topbar + Welcome
    const profile = data.profile || {};
    currentEmployeeId = meData?._id || null;
    const name = profile.name || '';
    if (el.topbarName) el.topbarName.textContent = name;
    if (el.welcomeName) el.welcomeName.textContent = name;
    if (el.topbarEmail) el.topbarEmail.textContent = profile.email || '';
    if (el.topbarId) el.topbarId.textContent = profile.employeeId || '';

    // Compliance
    const compliance = data.compliance || {};
    const progressPercent = compliance.progressPercent || 0;
    if (el.complianceProgressText) {
      el.complianceProgressText.textContent = `Progress: ${compliance.completedSeminars || 0} of ${compliance.requiredSeminars || 0} Required Seminars`;
    }
    if (el.complianceProgressPercent) el.complianceProgressPercent.textContent = `${progressPercent}%`;
    if (el.complianceProgressBar) el.complianceProgressBar.style.width = `${progressPercent}%`;

    const todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    if (el.complianceUpdatedAt) el.complianceUpdatedAt.textContent = `Status as of ${todayStr}`;

    if (compliance.compliant) {
      el.complianceStatusBadge.textContent = 'Compliant';
      if (el.complianceStatusBadge) {
        el.complianceStatusBadge.style.background = 'rgba(16,185,129,0.10)';
        el.complianceStatusBadge.style.color = '#059669';
        el.complianceStatusBadge.style.borderColor = 'rgba(16,185,129,0.25)';
      }
      if (el.complianceAdviceBox) {
        el.complianceAdviceBox.style.borderColor = 'rgba(16,185,129,0.22)';
        el.complianceAdviceBox.style.background = 'rgba(16,185,129,0.08)';
      }
      if (el.complianceAdviceHeader) el.complianceAdviceHeader.textContent = 'All Requirements Completed!';
      if (el.complianceAdviceText) {
        el.complianceAdviceText.textContent = 'You have successfully completed all required GAD seminars.';
      }
    } else {
      el.complianceStatusBadge.textContent = 'Non-Compliant';
      if (el.complianceStatusBadge) {
        el.complianceStatusBadge.style.background = 'rgba(239,68,68,0.10)';
        el.complianceStatusBadge.style.color = '#dc2626';
        el.complianceStatusBadge.style.borderColor = 'rgba(239,68,68,0.25)';
      }
      if (el.complianceAdviceBox) {
        el.complianceAdviceBox.style.borderColor = 'rgba(239,68,68,0.22)';
        el.complianceAdviceBox.style.background = 'rgba(239,68,68,0.08)';
      }
      if (el.complianceAdviceHeader) el.complianceAdviceHeader.textContent = 'You Are Almost There';
      if (el.complianceAdviceText) {
        const remaining = (compliance.requiredSeminars || 0) - (compliance.completedSeminars || 0);
        el.complianceAdviceText.textContent =
          remaining > 0 ? `You still need ${remaining} seminar(s) to become compliant.` : 'Keep going—your compliance will be updated soon.';
      }
    }

    // Info
    if (el.infoId) el.infoId.textContent = profile.employeeId || '';
    if (el.infoEmail) el.infoEmail.textContent = profile.email || '';
    if (el.infoDepartment) el.infoDepartment.textContent = profile.department || '';
    if (el.infoPosition) el.infoPosition.textContent = profile.position || '';
    if (el.infoBirthSex) el.infoBirthSex.textContent = profile.birthSex || '';
    if (el.infoGenderIdentity) el.infoGenderIdentity.textContent = profile.genderIdentity || '—';
    if (el.infoMaleCount) el.infoMaleCount.textContent = String(profile.departmentGenderCounts?.male ?? 0);
    if (el.infoFemaleCount) el.infoFemaleCount.textContent = String(profile.departmentGenderCounts?.female ?? 0);

    // Upcoming
    el.upcomingStatus.textContent = '';
    currentSeminars = Array.isArray(seminarsData)
      ? seminarsData.map((seminar) => ({
          ...seminar,
          id: seminar._id || seminar.id,
          registeredEmployees: Array.isArray(seminar.registeredEmployees)
            ? seminar.registeredEmployees
            : [],
        }))
      : [];
    currentDashboardData = data;
    if (Array.isArray(currentDashboardData.upcomingSeminars)) {
      currentDashboardData.upcomingSeminars = currentDashboardData.upcomingSeminars.map((seminar) => {
        const match = currentSeminars.find((item) => String(item.id) === String(seminar.id));
        return {
          ...seminar,
          registeredEmployees: Array.isArray(match?.registeredEmployees)
            ? match.registeredEmployees
            : [],
        };
      });
    }
    applySeminarFilter();

    // Certificates
    renderCertificates(data.certificates || []);
  };

  const scrollCarouselBy = (direction) => {
    if (!el.upcomingCarousel) return;
    const amount = Math.max(300, el.upcomingCarousel.clientWidth * 0.9);
    el.upcomingCarousel.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  el.upcomingPrevBtn?.addEventListener('click', () => scrollCarouselBy(-1));
  el.upcomingNextBtn?.addEventListener('click', () => scrollCarouselBy(1));

  // Initial load
  loadDashboard()
    .catch((err) => {
      if (String(err?.message || '').toLowerCase().includes('not authenticated')) {
        window.localStorage.removeItem('gadims_employee_token');
        window.localStorage.removeItem('gadims_role');
        window.location.href = '/';
        return;
      }
      // Don't crash the whole UI; show a message near upcoming section
      if (el.upcomingStatus) el.upcomingStatus.textContent = err.message || 'Failed to load dashboard.';
      if (el.certificatesStatus) el.certificatesStatus.textContent = err.message || 'Failed to load dashboard.';
    });
});

