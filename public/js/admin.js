document.addEventListener('DOMContentLoaded', () => {
  let adminToken = window.localStorage.getItem('gadims_employee_token') || null;

  const decodeJwtPayload = (jwtToken) => {
    try {
      const parts = String(jwtToken || '').split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(base64 + pad);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const payload = decodeJwtPayload(adminToken);
  if (!adminToken || payload?.role !== 'admin') {
    window.localStorage.removeItem('gadims_employee_token');
    window.localStorage.removeItem('gadims_role');
    window.location.href = '/';
    return;
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  const createAdminForm = document.getElementById('admin-create-admin-form');
  const createAdminStatusEl = document.getElementById('admin-create-admin-status');
  const createSeminarForm = document.getElementById('admin-create-seminar-form');
  const createSeminarStatusEl = document.getElementById('admin-create-seminar-status');
  const createSeminarClearBtn = document.getElementById('admin-create-seminar-clear-btn');
  const createSeminarModalEl = document.getElementById('admin-create-seminar-modal');
  const createSeminarCloseBtn = document.getElementById('admin-create-seminar-close');
  const createSeminarDateInput = createSeminarForm?.querySelector('input[name="date"]');
  const dashboardWrapperEl = document.getElementById('admin-dashboard-wrapper');
  const seminarsSectionEl = document.getElementById('admin-seminars-section');
  const createAdminSectionEl = document.getElementById('admin-create-admin-section');
  const moduleHintEl = document.getElementById('admin-module-hint');
  const sidebarNavButtons = Array.from(document.querySelectorAll('.dashboard-sidebar-link[data-nav]'));
  const seminarsCarouselEl = document.getElementById('admin-seminars-carousel');
  const seminarsStatusEl = document.getElementById('admin-seminars-status');
  const seminarsFilterStatusEl = document.getElementById('admin-seminars-filter-status');
  const seminarsSearchEl = document.getElementById('admin-seminars-search');
  const seminarsMonthFilterEl = document.getElementById('admin-seminars-month-filter');
  const seminarsYearFilterEl = document.getElementById('admin-seminars-year-filter');
  const seminarsClearFiltersBtn = document.getElementById('admin-seminars-clear-filters');
  const seminarsPrevBtn = document.getElementById('admin-seminars-prev-btn');
  const seminarsNextBtn = document.getElementById('admin-seminars-next-btn');
  const seminarEditModalEl = document.getElementById('admin-seminar-edit-modal');
  const seminarEditForm = document.getElementById('admin-seminar-edit-form');
  const seminarEditCloseBtn = document.getElementById('admin-seminar-edit-close');
  const seminarEditCancelBtn = document.getElementById('admin-seminar-edit-cancel');
  const seminarEditStatusEl = document.getElementById('admin-seminar-edit-status');
  const seminarParticipantsModalEl = document.getElementById('admin-seminar-participants-modal');
  const seminarParticipantsCloseBtn = document.getElementById('admin-seminar-participants-close');
  const seminarParticipantsMetaEl = document.getElementById('admin-seminar-participants-meta');
  const seminarParticipantsListEl = document.getElementById('admin-seminar-participants-list');
  const seminarParticipantsStatusEl = document.getElementById('admin-seminar-participants-status');
  const seminarHeldBtn = document.getElementById('admin-seminar-held-btn');
  const markAttendanceBtn = document.getElementById('admin-mark-attendance-btn');
  const sendCertificatesBtn = document.getElementById('admin-send-certificates-btn');
  const attendanceSelectAllEl = document.getElementById('admin-attendance-select-all');
  const employeeModalEl = document.getElementById('admin-employee-modal');
  const employeeModalCloseBtn = document.getElementById('admin-employee-modal-close');
  const profileNameEl = document.getElementById('admin-employee-profile-name');
  const profileIdEl = document.getElementById('admin-employee-profile-id');
  const profileEmailEl = document.getElementById('admin-employee-profile-email');
  const profileDepartmentEl = document.getElementById('admin-employee-profile-department');
  const profilePositionEl = document.getElementById('admin-employee-profile-position');
  const profileStatusEl = document.getElementById('admin-employee-profile-status');
  const profileReservedCountEl = document.getElementById('admin-employee-profile-reserved-count');
  const profileTakenCountEl = document.getElementById('admin-employee-profile-taken-count');
  const profileReservedListEl = document.getElementById('admin-employee-profile-reserved-list');
  const profileTakenListEl = document.getElementById('admin-employee-profile-taken-list');
  const profileCertificatesCountEl = document.getElementById('admin-employee-profile-certificates-count');
  const profileCertificatesListEl = document.getElementById('admin-employee-profile-certificates-list');
  const profileModalStatusEl = document.getElementById('admin-employee-profile-modal-status');
  const totalEmployeesEl = document.getElementById('admin-total-employees');
  const completionRateEl = document.getElementById('admin-completion-rate');
  const compliantEmployeesEl = document.getElementById('admin-compliant-employees');
  const selectModeEl = document.getElementById('admin-select-mode');
  const departmentFilterEl = document.getElementById('admin-department-filter');
  const notifyBtn = document.getElementById('admin-notify-btn');
  const exportBtn = document.getElementById('admin-export-btn');
  const employeesStatusEl = document.getElementById('admin-employees-status');
  const employeesTableEl = document.getElementById('admin-employees-table');
  const topbarNameEl = document.getElementById('admin-topbar-name');
  const topbarEmailEl = document.getElementById('admin-topbar-email');
  const topbarIdEl = document.getElementById('admin-topbar-id');

  // Pre-registration elements
  const preRegListEl = document.getElementById('admin-pre-reg-list');
  const preRegStatusEl = document.getElementById('admin-pre-reg-status');
  const approveSelectedBtn = document.getElementById('admin-approve-selected-btn');
  const preRegSelectAllEl = document.getElementById('admin-pre-reg-select-all');

  let currentSeminars = [];
  let seminarFilters = {
    query: '',
    month: '',
    year: '',
  };
  let attendanceModalState = {
    seminarId: null,
    isHeld: false,
    rows: [],
    attendanceSaved: false,
    currentTab: 'pre-registered',
  };

  const authedFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        Authorization: `Bearer ${adminToken}`,
      },
    });
  };

  const getTodayDateInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (value) => {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const parseTimeToMinutes = (value) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return 0;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const sortSeminarsNearestToFarthest = (seminars) => {
    return [...seminars].sort((a, b) => {
      const aDate = new Date(a.date || 0);
      const bDate = new Date(b.date || 0);
      const dateDiff = aDate.getTime() - bDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
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

  // ========================
  // MODAL TABS
  // ========================

  const switchParticipantsTab = (tabName) => {
    attendanceModalState.currentTab = tabName;
    document.querySelectorAll('.modal-tab-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-modal-tab') === tabName);
    });
    document.querySelectorAll('.modal-tab-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === `modal-tab-${tabName}`);
    });
  };

  document.querySelectorAll('.modal-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-modal-tab');
      if (tab) switchParticipantsTab(tab);
    });
  });

  // ========================
  // PRE-REGISTRATION RENDER
  // ========================

  const renderPreRegisteredRows = (rows) => {
    if (!preRegListEl) return;
    const preRegRows = rows.filter((r) => r.status === 'pre-registered');

    if (!preRegRows.length) {
      preRegListEl.innerHTML = '<p class="muted">No pending pre-registrations.</p>';
      if (preRegSelectAllEl) preRegSelectAllEl.disabled = true;
      return;
    }

    if (preRegSelectAllEl) preRegSelectAllEl.disabled = false;

    preRegListEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="pre-reg-select-all-inner" /></th>
            <th>Name</th>
            <th>Department</th>
            <th>Position</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${preRegRows
            .map(
              (row) => `
                <tr>
                  <td>
                    <input type="checkbox" class="admin-pre-reg-check" value="${escapeHtml(row.id || '')}" />
                  </td>
                  <td>${escapeHtml(row.name || '—')}</td>
                  <td>${escapeHtml(row.department || '—')}</td>
                  <td>${escapeHtml(row.position || '—')}</td>
                  <td>${escapeHtml(row.email || '—')}</td>
                  <td><span class="badge badge-soft badge-pending">Pending</span></td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;

    // Inner select all
    document.getElementById('pre-reg-select-all-inner')?.addEventListener('change', (e) => {
      const checked = Boolean(e.target.checked);
      preRegListEl.querySelectorAll('.admin-pre-reg-check').forEach((cb) => {
        cb.checked = checked;
      });
    });
  };

  // ========================
  // APPROVE SELECTED
  // ========================

  approveSelectedBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId || !preRegListEl) return;
    if (preRegStatusEl) preRegStatusEl.textContent = '';

    const selected = Array.from(preRegListEl.querySelectorAll('.admin-pre-reg-check'))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    if (!selected.length) {
      if (preRegStatusEl) preRegStatusEl.textContent = 'Select at least one participant to approve.';
      return;
    }

    try {
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Approval failed');
      if (preRegStatusEl) preRegStatusEl.textContent = data?.message || `${data.approvedCount || 0} participant(s) approved.`;
      // Reload the modal
      const seminar = currentSeminars.find((s) => String(s._id) === String(attendanceModalState.seminarId));
      if (seminar) await openParticipantsModal(seminar);
    } catch (err) {
      if (preRegStatusEl) preRegStatusEl.textContent = err.message || 'Failed to approve participants.';
    }
  });

  preRegSelectAllEl?.addEventListener('change', () => {
    if (!preRegListEl) return;
    const checked = Boolean(preRegSelectAllEl.checked);
    preRegListEl.querySelectorAll('.admin-pre-reg-check').forEach((cb) => {
      cb.checked = checked;
    });
  });

  // ========================
  // ATTENDANCE / PARTICIPANTS
  // ========================

  const renderEmployeeSeminarsList = (listEl, seminars, emptyMessage) => {
    if (!listEl) return;
    if (!Array.isArray(seminars) || seminars.length === 0) {
      listEl.innerHTML = `<div class="muted small">${escapeHtml(emptyMessage)}</div>`;
      return;
    }

    listEl.innerHTML = seminars
      .map((seminar) => {
        const datePart = seminar?.date ? formatDate(seminar.date) : 'No date';
        const timePart = seminar?.startTime ? ` • ${escapeHtml(seminar.startTime)}` : '';
        return `
          <div style="padding: 0.4rem 0.5rem; border:1px solid var(--border); border-radius:0.55rem; background:#fff;">
            <div style="font-weight: 600; color: var(--xu-blue);">${escapeHtml(seminar?.title || 'Untitled seminar')}</div>
            <div class="muted small" style="margin-top: 0.15rem;">${escapeHtml(datePart)}${timePart}</div>
          </div>
        `;
      })
      .join('');
  };

  const renderEmployeeCertificatesList = (employeeId, certificates) => {
    if (!profileCertificatesListEl) return;
    if (!Array.isArray(certificates) || certificates.length === 0) {
      profileCertificatesListEl.innerHTML = '<div class="muted small">No certificates available yet.</div>';
      return;
    }

    profileCertificatesListEl.innerHTML = certificates
      .map((cert) => {
        const datePart = cert?.date ? formatDate(cert.date) : 'No date';
        const issuedPart = cert?.certificateIssuedAt ? formatDate(cert.certificateIssuedAt) : 'Not issued';
        return `
          <div style="padding: 0.45rem 0.55rem; border:1px solid var(--border); border-radius:0.55rem; background:#fff;">
            <div style="display:flex; justify-content:space-between; gap:0.6rem; align-items:center; flex-wrap:wrap;">
              <div>
                <div style="font-weight:600; color:var(--xu-blue);">${escapeHtml(cert?.title || 'Untitled seminar')}</div>
                <div class="muted small" style="margin-top:0.12rem;">${escapeHtml(datePart)} • Code: ${escapeHtml(cert?.certificateCode || 'Pending')}</div>
              </div>
              <button class="btn secondary" type="button" data-admin-cert-download="${escapeHtml(cert?.registrationId || '')}" style="padding:0.35rem 0.65rem;">Download</button>
            </div>
            <div class="muted small" style="margin-top:0.15rem;">Issued: ${escapeHtml(issuedPart)}</div>
          </div>
        `;
      })
      .join('');

    profileCertificatesListEl.querySelectorAll('[data-admin-cert-download]').forEach((button) => {
      button.addEventListener('click', async () => {
        const registrationId = button.getAttribute('data-admin-cert-download');
        if (!registrationId || !employeeId) return;
        try {
          const res = await authedFetch(`/api/admin/employees/${employeeId}/certificates/${registrationId}/download`);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Certificate download failed.');
          }

          const blob = await res.blob();
          const disposition = res.headers.get('content-disposition') || '';
          const match = /filename="?([^";]+)"?/i.exec(disposition);
          const name = match?.[1] || `GADIMS-Certificate-${registrationId}.png`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
          if (profileModalStatusEl) profileModalStatusEl.textContent = err.message || 'Certificate download failed.';
        }
      });
    });
  };

  const showEmployeeProfile = async (row) => {
    if (profileNameEl) profileNameEl.textContent = row.name || '—';
    if (profileIdEl) profileIdEl.textContent = row.employeeId || '—';
    if (profileEmailEl) profileEmailEl.textContent = row.email || '—';
    if (profileDepartmentEl) profileDepartmentEl.textContent = row.department || '—';
    if (profilePositionEl) profilePositionEl.textContent = row.position || '—';
    if (profileStatusEl) profileStatusEl.textContent = row.seminarStatus || '—';
    if (profileReservedCountEl) profileReservedCountEl.textContent = '0';
    if (profileTakenCountEl) profileTakenCountEl.textContent = '0';
    if (profileCertificatesCountEl) profileCertificatesCountEl.textContent = '0';
    renderEmployeeSeminarsList(profileReservedListEl, [], 'Loading reserved seminars...');
    renderEmployeeSeminarsList(profileTakenListEl, [], 'Loading taken seminars...');
    renderEmployeeCertificatesList(row.id, []);
    if (profileModalStatusEl) profileModalStatusEl.textContent = '';
    if (employeeModalEl) employeeModalEl.style.display = 'flex';

    try {
      const res = await authedFetch(`/api/admin/employees/${row.id}/profile`);
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Employee profile details endpoint is unavailable. Please restart the server and try again.');
      }
      if (!res.ok) throw new Error(data?.message || 'Failed to load employee profile details');

      const profile = data?.profile || {};
      const reservedSeminars = Array.isArray(data?.reservedSeminars) ? data.reservedSeminars : [];
      const takenSeminars = Array.isArray(data?.takenSeminars) ? data.takenSeminars : [];
      const certificates = Array.isArray(data?.certificates) ? data.certificates : [];

      if (profileNameEl) profileNameEl.textContent = profile.name || row.name || '—';
      if (profileIdEl) profileIdEl.textContent = profile.employeeId || row.employeeId || '—';
      if (profileEmailEl) profileEmailEl.textContent = profile.email || row.email || '—';
      if (profileDepartmentEl) profileDepartmentEl.textContent = profile.department || row.department || '—';
      if (profilePositionEl) profilePositionEl.textContent = profile.position || row.position || '—';
      if (profileStatusEl) {
        const statusLabel = profile.seminarStatus || row.seminarStatus || '—';
        const completionText = profile.completionText ? ` (${profile.completionText})` : '';
        profileStatusEl.textContent = `${statusLabel}${completionText}`;
      }

      if (profileReservedCountEl) profileReservedCountEl.textContent = String(reservedSeminars.length);
      if (profileTakenCountEl) profileTakenCountEl.textContent = String(takenSeminars.length);
      if (profileCertificatesCountEl) profileCertificatesCountEl.textContent = String(certificates.length);
      renderEmployeeSeminarsList(profileReservedListEl, reservedSeminars, 'No reserved seminars yet.');
      renderEmployeeSeminarsList(profileTakenListEl, takenSeminars, 'No seminars taken yet.');
      renderEmployeeCertificatesList(row.id, certificates);
    } catch (err) {
      if (profileModalStatusEl) {
        profileModalStatusEl.textContent = err.message || 'Failed to load seminar details.';
      }
      renderEmployeeSeminarsList(profileReservedListEl, [], 'Unable to load reserved seminars.');
      renderEmployeeSeminarsList(profileTakenListEl, [], 'Unable to load seminars taken.');
      renderEmployeeCertificatesList(row.id, []);
    }
  };

  const openCreateSeminarModal = () => {
    if (!createSeminarModalEl) return;
    if (createSeminarStatusEl) createSeminarStatusEl.textContent = '';
    createSeminarModalEl.style.display = 'flex';
  };

  const closeCreateSeminarModal = () => {
    if (!createSeminarModalEl) return;
    createSeminarModalEl.style.display = 'none';
  };

  const showNavModule = (nav) => {
    const key = String(nav || 'dashboard').toLowerCase();
    const isDashboard = key === 'dashboard';
    const isEmployees = key === 'employees';
    const isSeminars = key === 'seminars';
    const isCreateAdmin = key === 'create-admin';

    if (dashboardWrapperEl) {
      dashboardWrapperEl.style.display = isDashboard || isEmployees ? 'block' : 'none';
    }
    if (seminarsSectionEl) {
      seminarsSectionEl.style.display = isSeminars ? 'block' : 'none';
    }
    if (createAdminSectionEl) {
      createAdminSectionEl.style.display = isCreateAdmin ? 'grid' : 'none';
    }

    sidebarNavButtons.forEach((btn) => {
      const btnKey = String(btn.getAttribute('data-nav') || '').toLowerCase();
      btn.classList.toggle('is-active', btnKey === key);
    });

    if (moduleHintEl) {
      const hintMap = {
        dashboard: 'Current View: Overview',
        seminars: 'Current View: Manage Seminars',
        'create-admin': 'Current View: Admin Accounts',
        employees: 'Current View: Employee Records',
      };
      moduleHintEl.textContent = hintMap[key] || 'Current View: Overview';
    }

    if (isEmployees) {
      document.getElementById('admin-employees-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!isSeminars) {
      closeSeminarParticipantsModal();
    }
  };

  const closeEmployeeProfileModal = () => {
    if (employeeModalEl) employeeModalEl.style.display = 'none';
  };

  const setTopbarFromToken = () => {
    if (topbarEmailEl) topbarEmailEl.textContent = payload.email || 'admin@xu.edu.ph';
    if (topbarIdEl) topbarIdEl.textContent = payload.id ? `ID: ${payload.id}` : 'ID: —';
    if (topbarNameEl) {
      const email = String(payload.email || '');
      const first = email.split('@')[0] || '';
      const pretty = first
        .split(/[._-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      topbarNameEl.textContent = pretty || 'Admin';
    }
  };

  const closeSeminarEditModal = () => {
    if (seminarEditModalEl) seminarEditModalEl.style.display = 'none';
  };

  const closeSeminarParticipantsModal = () => {
    if (seminarParticipantsModalEl) seminarParticipantsModalEl.style.display = 'none';
  };

  const openSeminarEditModal = (seminar) => {
    if (!seminarEditForm || !seminarEditModalEl) return;
    seminarEditForm.elements.seminarId.value = seminar._id;
    seminarEditForm.elements.title.value = seminar.title || '';
    seminarEditForm.elements.startTime.value = seminar.startTime || '';
    seminarEditForm.elements.date.value = String(seminar.date || '').slice(0, 10);
    seminarEditForm.elements.durationHours.value = seminar.durationHours || 1;
    seminarEditForm.elements.capacity.value = seminar.capacity || 1;
    seminarEditForm.elements.mandatory.value = seminar.mandatory ? 'true' : 'false';
    seminarEditForm.elements.description.value = seminar.description || '';
    const editAutoSendCheckbox = document.getElementById('edit-auto-send-cert-checkbox');
    if (editAutoSendCheckbox) editAutoSendCheckbox.checked = Boolean(seminar.autoSendCertificates);
    const dateInput = seminarEditForm.querySelector('input[name="date"]');
    if (dateInput) dateInput.min = getTodayDateInputValue();
    if (seminarEditStatusEl) seminarEditStatusEl.textContent = '';
    seminarEditModalEl.style.display = 'flex';
  };

  const renderParticipantsRows = (rows, isHeld) => {
    if (!seminarParticipantsListEl) return;
    // Only show registered/attended/absent (approved) participants
    const approvedRows = rows.filter((r) => ['registered', 'attended', 'absent'].includes(String(r.status || '').toLowerCase()));

    if (!approvedRows.length) {
      seminarParticipantsListEl.innerHTML = '<p class="muted">No approved participants found. Approve pre-registered participants first.</p>';
      return;
    }

    const statusBadge = (row) => {
      const status = String(row.status || 'registered').toLowerCase();
      if (status === 'attended') return '<span class="badge badge-green">Attended</span>';
      if (status === 'absent') return '<span class="badge badge-red">Absent</span>';
      return '<span class="badge badge-soft">Registered</span>';
    };

    seminarParticipantsListEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Attend</th>
            <th>Name</th>
            <th>Department</th>
            <th>Status</th>
            <th>Evaluation</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          ${approvedRows
            .map(
              (row) => `
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      class="admin-attendance-row-check"
                      value="${escapeHtml(row.id || '')}"
                      ${row.status === 'attended' ? 'checked' : ''}
                      ${isHeld ? '' : 'disabled'}
                    />
                  </td>
                  <td>${escapeHtml(row.name || '—')}</td>
                  <td>${escapeHtml(row.department || '—')}</td>
                  <td>${statusBadge(row)}</td>
                  <td>
                    ${row.evaluationCompleted
                      ? '<span class="badge badge-green">Answered</span>'
                      : row.evaluationAvailable
                        ? '<span class="badge badge-soft">Not Answered</span>'
                        : '<span class="badge badge-soft">Not Available</span>'}
                  </td>
                  <td>${row.certificateIssued ? '<span class="badge badge-green">Sent</span>' : '<span class="badge badge-soft">Not Sent</span>'}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;

    if (attendanceSelectAllEl) {
      attendanceSelectAllEl.checked = false;
      attendanceSelectAllEl.disabled = !isHeld;
    }
  };

  const openParticipantsModal = async (seminar) => {
    if (!seminarParticipantsModalEl || !seminarParticipantsMetaEl) return;
    seminarParticipantsMetaEl.textContent = `${seminar.title || 'Seminar'} — ${formatDate(seminar.date)} ${seminar.startTime || ''}`;
    if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = 'Loading...';
    if (preRegStatusEl) preRegStatusEl.textContent = '';
    if (seminarParticipantsListEl) seminarParticipantsListEl.innerHTML = '';
    if (preRegListEl) preRegListEl.innerHTML = '';

    attendanceModalState = {
      seminarId: seminar._id,
      isHeld: Boolean(seminar.isHeld),
      rows: [],
      attendanceSaved: false,
      currentTab: 'pre-registered',
    };

    // Start on pre-registered tab
    switchParticipantsTab('pre-registered');
    seminarParticipantsModalEl.style.display = 'flex';

    try {
      const res = await authedFetch(`/api/admin/seminars/${seminar._id}/participants`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load participants');

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const isHeld = Boolean(data?.seminar?.isHeld);
      const autoSendCerts = Boolean(data?.seminar?.autoSendCertificates);

      attendanceModalState = {
        seminarId: seminar._id,
        isHeld,
        rows,
        attendanceSaved: rows.some((r) => ['attended', 'absent'].includes(String(r.status || '').toLowerCase())),
        currentTab: attendanceModalState.currentTab,
      };

      // Render pre-registered tab
      renderPreRegisteredRows(rows);

      // Render attendance tab
      renderParticipantsRows(rows, isHeld);

      // Update attendance buttons
      if (seminarHeldBtn) {
        seminarHeldBtn.disabled = isHeld;
        seminarHeldBtn.textContent = isHeld ? 'Seminar Already Held' : 'Seminar Held';
      }
      if (markAttendanceBtn) markAttendanceBtn.disabled = !isHeld;
      if (sendCertificatesBtn) sendCertificatesBtn.disabled = !isHeld || !attendanceModalState.attendanceSaved;

      // Add auto-send cert indicator
      if (autoSendCerts && seminarParticipantsStatusEl) {
        seminarParticipantsStatusEl.textContent = 'Auto-send certificates is enabled for this seminar.';
      } else if (seminarParticipantsStatusEl) {
        seminarParticipantsStatusEl.textContent = isHeld
          ? ''
          : 'Mark this seminar as held first before recording attendance.';
      }
    } catch (err) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = err.message || 'Failed to load participants.';
      if (preRegStatusEl) preRegStatusEl.textContent = err.message || 'Failed to load participants.';
    }
  };

  const renderSeminarsCarousel = (seminars) => {
    if (!seminarsCarouselEl) return;
    if (!Array.isArray(seminars) || seminars.length === 0) {
      seminarsCarouselEl.innerHTML = '<p class="muted">No seminars created yet.</p>';
      return;
    }

    seminarsCarouselEl.innerHTML = seminars
      .map((seminar) => {
        const registeredCount = Array.isArray(seminar.registeredEmployees) ? seminar.registeredEmployees.length : 0;
        const capacity = Number(seminar.capacity || 0);
        const mandatoryLabel = seminar.mandatory ? 'Mandatory' : 'Optional';
        const heldLabel = seminar.isHeld ? 'Held' : 'Upcoming';
        const autoSendLabel = seminar.autoSendCertificates ? 'Auto-cert' : '';
        return `
          <article class="card" style="box-shadow:none; padding: 1rem; min-width: 320px; flex: 0 0 320px; display:flex; flex-direction:column; gap: 0.75rem;">
            <div style="display:flex; justify-content: space-between; gap: 0.5rem; align-items:flex-start;">
              <h3 style="margin:0; color: var(--xu-blue);">${escapeHtml(seminar.title || 'Untitled Seminar')}</h3>
              <span class="badge badge-soft" style="white-space:nowrap;">${escapeHtml(mandatoryLabel)}</span>
            </div>

            <div class="muted small">${escapeHtml(formatDate(seminar.date))} - ${escapeHtml(seminar.startTime || '')}</div>
            <div class="muted small">Duration: ${escapeHtml(seminar.durationHours || 0)} hour(s)</div>
            <div class="muted small">Reserved: ${escapeHtml(registeredCount)}/${escapeHtml(capacity)}</div>
            <div class="muted small">Status: ${escapeHtml(heldLabel)} ${autoSendLabel ? `• <span style="color:#059669;">${escapeHtml(autoSendLabel)}</span>` : ''}</div>
            <div class="muted" style="font-size: 0.92rem; line-height:1.4;">${escapeHtml(seminar.description || '')}</div>

            <div style="display:flex; gap: 0.55rem; flex-wrap: wrap; margin-top: auto;">
              <button class="btn secondary" type="button" data-seminar-view="${seminar._id}">View Participants</button>
              <button class="btn secondary" type="button" data-seminar-held="${seminar._id}" ${seminar.isHeld ? 'disabled' : ''}>${seminar.isHeld ? 'Held' : 'Seminar Held'}</button>
              <button class="btn" type="button" data-seminar-edit="${seminar._id}">Edit</button>
              <button class="btn secondary" type="button" data-seminar-delete="${seminar._id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join('');

    seminarsCarouselEl.querySelectorAll('[data-seminar-view]').forEach((button) => {
      button.addEventListener('click', async () => {
        const seminar = currentSeminars.find((item) => String(item._id) === String(button.getAttribute('data-seminar-view')));
        if (!seminar) return;
        await openParticipantsModal(seminar);
      });
    });

    seminarsCarouselEl.querySelectorAll('[data-seminar-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const seminar = currentSeminars.find((item) => String(item._id) === String(button.getAttribute('data-seminar-edit')));
        if (!seminar) return;
        openSeminarEditModal(seminar);
      });
    });

    seminarsCarouselEl.querySelectorAll('[data-seminar-held]').forEach((button) => {
      button.addEventListener('click', async () => {
        const seminar = currentSeminars.find((item) => String(item._id) === String(button.getAttribute('data-seminar-held')));
        if (!seminar) return;
        try {
          const res = await authedFetch(`/api/admin/seminars/${seminar._id}/held`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'Failed to mark seminar as held');
          if (seminarsStatusEl) seminarsStatusEl.textContent = data?.message || 'Seminar marked as held.';
          await loadSeminars();
        } catch (err) {
          if (seminarsStatusEl) seminarsStatusEl.textContent = err.message || 'Failed to mark seminar as held.';
        }
      });
    });

    seminarsCarouselEl.querySelectorAll('[data-seminar-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const seminar = currentSeminars.find((item) => String(item._id) === String(button.getAttribute('data-seminar-delete')));
        if (!seminar) return;
        const ok = window.confirm(`Delete seminar "${seminar.title}"? This will remove its registrations.`);
        if (!ok) return;
        try {
          const res = await authedFetch(`/api/admin/seminars/${seminar._id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'Failed to delete seminar');
          if (seminarsStatusEl) seminarsStatusEl.textContent = 'Seminar deleted successfully.';
          await loadSeminars();
        } catch (err) {
          if (seminarsStatusEl) seminarsStatusEl.textContent = err.message || 'Failed to delete seminar.';
        }
      });
    });
  };

  const populateSeminarYearFilter = (seminars) => {
    if (!seminarsYearFilterEl) return;
    const currentValue = seminarsYearFilterEl.value;
    const years = [...new Set(
      (Array.isArray(seminars) ? seminars : [])
        .map((seminar) => {
          const d = new Date(seminar?.date);
          return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
        })
        .filter(Boolean)
    )].sort((a, b) => Number(b) - Number(a));

    seminarsYearFilterEl.innerHTML = ['<option value="">All Years</option>']
      .concat(years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`))
      .join('');

    if (currentValue && years.includes(currentValue)) {
      seminarsYearFilterEl.value = currentValue;
    }
  };

  const getFilteredSeminars = () => {
    const query = String(seminarFilters.query || '').trim().toLowerCase();
    const month = String(seminarFilters.month || '');
    const year = String(seminarFilters.year || '');

    return currentSeminars.filter((seminar) => {
      const title = String(seminar?.title || '').toLowerCase();
      const description = String(seminar?.description || '').toLowerCase();
      const date = new Date(seminar?.date);
      const isValidDate = !Number.isNaN(date.getTime());

      const queryMatch = !query || title.includes(query) || description.includes(query);
      const monthMatch = !month || (isValidDate && String(date.getMonth()) === month);
      const yearMatch = !year || (isValidDate && String(date.getFullYear()) === year);

      return queryMatch && monthMatch && yearMatch;
    });
  };

  const applySeminarFilters = () => {
    const filtered = getFilteredSeminars();
    renderSeminarsCarousel(filtered);

    if (seminarsFilterStatusEl) {
      const hasFilter = Boolean(
        String(seminarFilters.query || '').trim() || String(seminarFilters.month || '') || String(seminarFilters.year || '')
      );
      seminarsFilterStatusEl.textContent = hasFilter
        ? `${filtered.length} seminar(s) match your filter.`
        : '';
      if (hasFilter && filtered.length === 0) {
        seminarsFilterStatusEl.textContent = 'No seminars match your filter.';
      }
    }
  };

  const loadSeminars = async () => {
    if (seminarsStatusEl) seminarsStatusEl.textContent = '';
    if (seminarsCarouselEl) seminarsCarouselEl.innerHTML = '';
    try {
      const res = await authedFetch('/api/admin/seminars');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load seminars');
      currentSeminars = sortSeminarsNearestToFarthest(Array.isArray(data) ? data : []);
      populateSeminarYearFilter(currentSeminars);
      applySeminarFilters();
    } catch (err) {
      if (seminarsStatusEl) seminarsStatusEl.textContent = err.message || 'Failed to load seminars.';
    }
  };

  const renderEmployeesTable = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      employeesTableEl.innerHTML = '<p class="muted">No employees found.</p>';
      return;
    }

    const checkboxesEnabled = Boolean(selectModeEl?.checked);
    const body = rows
      .map((row) => {
        const checkboxStyle = checkboxesEnabled ? '' : 'display:none';
        const isComplete = row.seminarStatus === 'Complete';
        const statusBadge = `<span class="badge ${isComplete ? 'badge-green' : 'badge-red'}">${row.seminarStatus}</span>`;
        return `
          <tr>
            <td><button class="table-link-btn" type="button" data-employee-profile="${row.id}">${escapeHtml(row.name)}</button></td>
            <td><input type="checkbox" class="admin-row-check" value="${row.id}" style="${checkboxStyle}" /></td>
            <td>${row.employeeId}</td>
            <td>${escapeHtml(row.department)}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      })
      .join('');

    employeesTableEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Profile</th>
            <th><input type="checkbox" id="admin-select-all" ${checkboxesEnabled ? '' : 'disabled'} /></th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Seminar Status</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;

    document.getElementById('admin-select-all')?.addEventListener('change', (event) => {
      const checked = Boolean(event.target.checked);
      employeesTableEl.querySelectorAll('.admin-row-check').forEach((checkbox) => {
        if (checkbox.style.display === 'none') return;
        checkbox.checked = checked;
      });
    });

    employeesTableEl.querySelectorAll('[data-employee-profile]').forEach((button) => {
      button.addEventListener('click', async () => {
        const row = rows.find((item) => String(item.id) === String(button.getAttribute('data-employee-profile')));
        if (row) await showEmployeeProfile(row);
      });
    });
  };

  const loadDepartmentsAndEmployees = async () => {
    employeesStatusEl.textContent = '';
    employeesTableEl.innerHTML = '';
    try {
      const department = departmentFilterEl?.value || '';
      const url = department
        ? `/api/admin/employees?department=${encodeURIComponent(department)}`
        : '/api/admin/employees';
      const res = await authedFetch(url, { method: 'GET' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load employees');

      if (Array.isArray(data.departments) && departmentFilterEl) {
        const current = departmentFilterEl.value;
        const options = data.departments
          .map((dept) => `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`)
          .join('');
        departmentFilterEl.innerHTML = `<option value="">All</option>${options}`;
        if (data.departments.includes(current)) {
          departmentFilterEl.value = current;
        }
      }

      renderEmployeesTable(data.rows);
    } catch (err) {
      employeesStatusEl.textContent = err.message || 'Failed to load employees.';
      if (String(err.message || '').toLowerCase().includes('invalid token')) {
        window.localStorage.removeItem('gadims_employee_token');
        window.localStorage.removeItem('gadims_role');
        window.location.href = '/';
      }
    }
  };

  const loadSummary = async () => {
    const res = await authedFetch('/api/admin/reports/summary');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load summary');
    totalEmployeesEl.textContent = String(data.totalEmployees ?? 0);
    completionRateEl.textContent = `${String(data.completionRatePercent ?? 0)}%`;
    compliantEmployeesEl.textContent = String(data.compliant ?? 0);
  };

  const loadAll = async () => {
    await loadSummary();
    await loadDepartmentsAndEmployees();
    await loadSeminars();
    window.localStorage.setItem('gadims_role', 'admin');
  };

  // ========================
  // EVENT LISTENERS
  // ========================

  document.querySelectorAll('[data-scroll-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-scroll-target');
      if (!targetId) return;
      if (targetId === 'admin-create-seminar-card') {
        openCreateSeminarModal();
        return;
      }
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  sidebarNavButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      showNavModule(btn.getAttribute('data-nav'));
    });
  });

  seminarsPrevBtn?.addEventListener('click', () => {
    if (!seminarsCarouselEl) return;
    const amount = Math.max(320, seminarsCarouselEl.clientWidth * 0.9);
    seminarsCarouselEl.scrollBy({ left: -amount, behavior: 'smooth' });
  });

  seminarsNextBtn?.addEventListener('click', () => {
    if (!seminarsCarouselEl) return;
    const amount = Math.max(320, seminarsCarouselEl.clientWidth * 0.9);
    seminarsCarouselEl.scrollBy({ left: amount, behavior: 'smooth' });
  });

  seminarsSearchEl?.addEventListener('input', () => {
    seminarFilters.query = seminarsSearchEl.value || '';
    applySeminarFilters();
  });

  seminarsMonthFilterEl?.addEventListener('change', () => {
    seminarFilters.month = seminarsMonthFilterEl.value || '';
    applySeminarFilters();
  });

  seminarsYearFilterEl?.addEventListener('change', () => {
    seminarFilters.year = seminarsYearFilterEl.value || '';
    applySeminarFilters();
  });

  seminarsClearFiltersBtn?.addEventListener('click', () => {
    seminarFilters = { query: '', month: '', year: '' };
    if (seminarsSearchEl) seminarsSearchEl.value = '';
    if (seminarsMonthFilterEl) seminarsMonthFilterEl.value = '';
    if (seminarsYearFilterEl) seminarsYearFilterEl.value = '';
    applySeminarFilters();
  });

  if (createSeminarDateInput) {
    createSeminarDateInput.min = getTodayDateInputValue();
  }

  createSeminarClearBtn?.addEventListener('click', () => {
    createSeminarForm?.reset();
    if (createSeminarStatusEl) createSeminarStatusEl.textContent = '';
  });

  createSeminarCloseBtn?.addEventListener('click', closeCreateSeminarModal);
  createSeminarModalEl?.addEventListener('click', (event) => {
    if (event.target === createSeminarModalEl) closeCreateSeminarModal();
  });

  employeeModalCloseBtn?.addEventListener('click', closeEmployeeProfileModal);
  employeeModalEl?.addEventListener('click', (event) => {
    if (event.target === employeeModalEl) closeEmployeeProfileModal();
  });

  seminarEditCloseBtn?.addEventListener('click', closeSeminarEditModal);
  seminarEditCancelBtn?.addEventListener('click', closeSeminarEditModal);
  seminarEditModalEl?.addEventListener('click', (event) => {
    if (event.target === seminarEditModalEl) closeSeminarEditModal();
  });

  seminarParticipantsCloseBtn?.addEventListener('click', closeSeminarParticipantsModal);
  seminarParticipantsModalEl?.addEventListener('click', (event) => {
    if (event.target === seminarParticipantsModalEl) closeSeminarParticipantsModal();
  });

  attendanceSelectAllEl?.addEventListener('change', () => {
    if (!seminarParticipantsListEl) return;
    const checked = Boolean(attendanceSelectAllEl.checked);
    seminarParticipantsListEl.querySelectorAll('.admin-attendance-row-check').forEach((checkbox) => {
      if (checkbox.disabled) return;
      checkbox.checked = checked;
    });
  });

  seminarHeldBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId) return;
    try {
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/held`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to mark seminar as held');
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = data?.message || 'Seminar marked as held.';
      await loadSeminars();
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) await openParticipantsModal(seminar);
    } catch (err) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = err.message || 'Failed to mark seminar as held.';
    }
  });

  markAttendanceBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId || !seminarParticipantsListEl) return;

    const selected = Array.from(seminarParticipantsListEl.querySelectorAll('.admin-attendance-row-check'))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    try {
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendedRegistrationIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to record attendance');
      attendanceModalState.attendanceSaved = true;
      if (seminarParticipantsStatusEl) {
        seminarParticipantsStatusEl.textContent =
          data?.message || `Attendance updated. Attended: ${data.attendedCount || 0}, Absent: ${data.absentCount || 0}`;
      }
      await loadSummary();
      await loadSeminars();
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) await openParticipantsModal(seminar);
    } catch (err) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = err.message || 'Failed to record attendance.';
    }
  });

  sendCertificatesBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId || !seminarParticipantsListEl) return;
    const selected = Array.from(seminarParticipantsListEl.querySelectorAll('.admin-attendance-row-check'))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    if (!selected.length) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = 'Select attended participants first.';
      return;
    }

    if (!attendanceModalState.attendanceSaved) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = 'Save attendance first before sending certificates.';
      return;
    }

    try {
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send certificates');
      if (seminarParticipantsStatusEl) {
        seminarParticipantsStatusEl.textContent =
          data?.message || `Certificates released to ${data.releasedCount || 0} attendee(s).`;
      }
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) await openParticipantsModal(seminar);
    } catch (err) {
      if (seminarParticipantsStatusEl) seminarParticipantsStatusEl.textContent = err.message || 'Failed to send certificates.';
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeEmployeeProfileModal();
      closeSeminarEditModal();
      closeSeminarParticipantsModal();
    }
  });

  seminarEditForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (seminarEditStatusEl) seminarEditStatusEl.textContent = '';
    const formData = new FormData(seminarEditForm);
    const formBody = Object.fromEntries(formData.entries());
    const seminarId = formBody.seminarId;
    const today = getTodayDateInputValue();
    if (!seminarId) return;
    if (!formBody.date || String(formBody.date) < today) {
      if (seminarEditStatusEl) seminarEditStatusEl.textContent = 'Seminar date cannot be in the past.';
      return;
    }

    const editAutoSendCheckbox = document.getElementById('edit-auto-send-cert-checkbox');
    const autoSendCertificates = editAutoSendCheckbox?.checked ? 'true' : 'false';

    try {
      const res = await authedFetch(`/api/admin/seminars/${seminarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formBody.title,
          description: formBody.description,
          date: formBody.date,
          startTime: formBody.startTime,
          durationHours: formBody.durationHours,
          mandatory: formBody.mandatory,
          capacity: formBody.capacity,
          autoSendCertificates,
          certificateReleaseMode: autoSendCertificates === 'true' ? 'automatic' : 'evaluation',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update seminar');
      if (seminarEditStatusEl) seminarEditStatusEl.textContent = 'Seminar updated successfully.';
      closeSeminarEditModal();
      if (seminarsStatusEl) seminarsStatusEl.textContent = 'Seminar updated successfully.';
      await loadSeminars();
    } catch (err) {
      if (seminarEditStatusEl) seminarEditStatusEl.textContent = err.message || 'Failed to update seminar.';
    }
  });

  createAdminForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (createAdminStatusEl) createAdminStatusEl.textContent = '';
    const body = Object.fromEntries(new FormData(createAdminForm).entries());
    try {
      const res = await authedFetch('/api/admin/seed-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Admin creation failed');
      if (createAdminStatusEl) createAdminStatusEl.textContent = 'Admin account created successfully.';
    } catch (err) {
      if (createAdminStatusEl) createAdminStatusEl.textContent = err.message || 'Admin creation failed.';
    }
  });

  createSeminarForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (createSeminarStatusEl) createSeminarStatusEl.textContent = '';
    const formData = new FormData(createSeminarForm);
    const body = Object.fromEntries(formData.entries());
    const releaseMode = String(body.certificateReleaseMode || 'evaluation').toLowerCase();
    body.certificateReleaseMode = releaseMode;
    body.autoSendCertificates = releaseMode === 'automatic' ? 'true' : 'false';

    const today = getTodayDateInputValue();
    if (!body.date || String(body.date) < today) {
      if (createSeminarStatusEl) createSeminarStatusEl.textContent = 'Seminar date cannot be in the past.';
      return;
    }
    try {
      const res = await authedFetch('/api/admin/seminars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Seminar creation failed');
      if (createSeminarStatusEl) createSeminarStatusEl.textContent = 'Seminar created successfully.';
      createSeminarForm.reset();
      if (createSeminarDateInput) createSeminarDateInput.min = getTodayDateInputValue();
      await loadSummary();
      await loadDepartmentsAndEmployees();
      await loadSeminars();
      closeCreateSeminarModal();
    } catch (err) {
      if (createSeminarStatusEl) createSeminarStatusEl.textContent = err.message || 'Seminar creation failed.';
    }
  });

  selectModeEl?.addEventListener('change', async () => {
    await loadDepartmentsAndEmployees();
  });

  departmentFilterEl?.addEventListener('change', async () => {
    await loadDepartmentsAndEmployees();
  });

  notifyBtn?.addEventListener('click', async () => {
    employeesStatusEl.textContent = '';
    try {
      const selected = Array.from(employeesTableEl.querySelectorAll('.admin-row-check'))
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);

      if (selected.length === 0) {
        employeesStatusEl.textContent = 'No employees selected.';
        return;
      }

      const res = await authedFetch('/api/admin/employees/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Notify failed');
      employeesStatusEl.textContent =
        data?.sent !== undefined ? `Emails sent successfully (${data.sent}).` : 'Emails sent successfully.';
      await loadSummary();
    } catch (err) {
      employeesStatusEl.textContent = err.message || 'Failed to send emails.';
    }
  });

  exportBtn?.addEventListener('click', async () => {
    employeesStatusEl.textContent = '';
    try {
      const res = await authedFetch('/api/admin/reports/employees.csv');
      const dataText = await res.text();
      if (!res.ok) throw new Error(dataText || 'Export failed');

      const blob = new Blob([dataText], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gadims_employees.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      employeesStatusEl.textContent = err.message || 'Failed to export.';
    }
  });

  logoutBtn?.addEventListener('click', () => {
    window.localStorage.removeItem('gadims_employee_token');
    window.localStorage.removeItem('gadims_role');
    adminToken = null;
    window.location.href = '/';
  });

  setTopbarFromToken();
  showNavModule('dashboard');
  loadAll().catch((err) => {
    employeesStatusEl.textContent = err.message || 'Failed to load admin dashboard.';
    window.localStorage.removeItem('gadims_employee_token');
    window.localStorage.removeItem('gadims_role');
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  });
});
