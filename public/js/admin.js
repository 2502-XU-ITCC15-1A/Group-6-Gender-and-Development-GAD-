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
  const createSeminarDateInput = createSeminarForm?.querySelector('input[name="date"]');
  const seminarsCarouselEl = document.getElementById('admin-seminars-carousel');
  const seminarsStatusEl = document.getElementById('admin-seminars-status');
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
  const newSeminarShortcutBtn = document.getElementById('admin-new-seminar-shortcut');
  const employeeModalEl = document.getElementById('admin-employee-modal');
  const employeeModalCloseBtn = document.getElementById('admin-employee-modal-close');
  const profileNameEl = document.getElementById('admin-employee-profile-name');
  const profileIdEl = document.getElementById('admin-employee-profile-id');
  const profileEmailEl = document.getElementById('admin-employee-profile-email');
  const profileDepartmentEl = document.getElementById('admin-employee-profile-department');
  const profilePositionEl = document.getElementById('admin-employee-profile-position');
  const profileStatusEl = document.getElementById('admin-employee-profile-status');
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
  let currentSeminars = [];
  let attendanceModalState = {
    seminarId: null,
    isHeld: false,
    rows: [],
    attendanceSaved: false,
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

  const showEmployeeProfile = (row) => {
    if (profileNameEl) profileNameEl.textContent = row.name || '—';
    if (profileIdEl) profileIdEl.textContent = row.employeeId || '—';
    if (profileEmailEl) profileEmailEl.textContent = row.email || '—';
    if (profileDepartmentEl) profileDepartmentEl.textContent = row.department || '—';
    if (profilePositionEl) profilePositionEl.textContent = row.position || '—';
    if (profileStatusEl) profileStatusEl.textContent = row.seminarStatus || '—';
    if (employeeModalEl) employeeModalEl.style.display = 'flex';
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
    const dateInput = seminarEditForm.querySelector('input[name="date"]');
    if (dateInput) dateInput.min = getTodayDateInputValue();
    if (seminarEditStatusEl) seminarEditStatusEl.textContent = '';
    seminarEditModalEl.style.display = 'flex';
  };

  const renderParticipantsRows = (rows, isHeld) => {
    if (!seminarParticipantsListEl) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      seminarParticipantsListEl.innerHTML = '<p class="muted">No one has registered yet.</p>';
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
            <th>Position</th>
            <th>Status</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          ${rows
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
                  <td>${escapeHtml(row.position || '—')}</td>
                  <td>${statusBadge(row)}</td>
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
    if (!seminarParticipantsModalEl || !seminarParticipantsMetaEl || !seminarParticipantsStatusEl) return;
    seminarParticipantsMetaEl.textContent = `${seminar.title || 'Seminar'} - ${formatDate(seminar.date)} ${seminar.startTime || ''}`;
    seminarParticipantsStatusEl.textContent = 'Loading attendance...';
    if (seminarParticipantsListEl) seminarParticipantsListEl.innerHTML = '';
    attendanceModalState = {
      seminarId: seminar._id,
      isHeld: Boolean(seminar.isHeld),
      rows: [],
      attendanceSaved: false,
    };
    seminarParticipantsModalEl.style.display = 'flex';
    try {
      const res = await authedFetch(`/api/admin/seminars/${seminar._id}/participants`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load attendance');
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const isHeld = Boolean(data?.seminar?.isHeld);
      attendanceModalState = {
        seminarId: seminar._id,
        isHeld,
        rows,
        attendanceSaved: rows.some((row) => String(row.status || '').toLowerCase() !== 'registered'),
      };
      renderParticipantsRows(rows, isHeld);
      if (seminarHeldBtn) {
        seminarHeldBtn.disabled = isHeld;
        seminarHeldBtn.textContent = isHeld ? 'Seminar Already Held' : 'Seminar Held';
      }
      if (markAttendanceBtn) markAttendanceBtn.disabled = !isHeld;
      if (sendCertificatesBtn) sendCertificatesBtn.disabled = !isHeld || !attendanceModalState.attendanceSaved;
      if (!isHeld) {
        seminarParticipantsStatusEl.textContent =
          'Mark this seminar as held first. Before attendance is recorded, participants are treated as absent for completion.';
      } else {
        seminarParticipantsStatusEl.textContent = '';
      }
    } catch (err) {
      seminarParticipantsStatusEl.textContent = err.message || 'Failed to load attendance.';
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
        return `
          <article class="card" style="box-shadow:none; padding: 1rem; min-width: 320px; flex: 0 0 320px; display:flex; flex-direction:column; gap: 0.75rem;">
            <div style="display:flex; justify-content: space-between; gap: 0.5rem; align-items:flex-start;">
              <h3 style="margin:0; color: var(--xu-blue);">${escapeHtml(seminar.title || 'Untitled Seminar')}</h3>
              <span class="badge badge-soft" style="white-space:nowrap;">${escapeHtml(mandatoryLabel)}</span>
            </div>

            <div class="muted small">${escapeHtml(formatDate(seminar.date))} - ${escapeHtml(seminar.startTime || '')}</div>
            <div class="muted small">Duration: ${escapeHtml(seminar.durationHours || 0)} hour(s)</div>
            <div class="muted small">Reserved: ${escapeHtml(registeredCount)}/${escapeHtml(capacity)}</div>
            <div class="muted small">Status: ${escapeHtml(heldLabel)}</div>
            <div class="muted" style="font-size: 0.92rem; line-height:1.4;">${escapeHtml(seminar.description || '')}</div>

            <div style="display:flex; gap: 0.55rem; flex-wrap: wrap; margin-top: auto;">
              <button class="btn secondary" type="button" data-seminar-view="${seminar._id}">View Attendance</button>
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

  const loadSeminars = async () => {
    if (seminarsStatusEl) seminarsStatusEl.textContent = '';
    if (seminarsCarouselEl) seminarsCarouselEl.innerHTML = '';
    try {
      const res = await authedFetch('/api/admin/seminars');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load seminars');
      currentSeminars = sortSeminarsNearestToFarthest(Array.isArray(data) ? data : []);
      renderSeminarsCarousel(currentSeminars);
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
      button.addEventListener('click', () => {
        const row = rows.find((item) => String(item.id) === String(button.getAttribute('data-employee-profile')));
        if (row) showEmployeeProfile(row);
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

  document.querySelectorAll('[data-scroll-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-scroll-target');
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  newSeminarShortcutBtn?.addEventListener('click', () => {
    document.getElementById('admin-create-seminar-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  if (createSeminarDateInput) {
    createSeminarDateInput.min = getTodayDateInputValue();
  }

  createSeminarClearBtn?.addEventListener('click', () => {
    createSeminarForm?.reset();
    if (createSeminarStatusEl) createSeminarStatusEl.textContent = '';
  });

  employeeModalCloseBtn?.addEventListener('click', closeEmployeeProfileModal);
  employeeModalEl?.addEventListener('click', (event) => {
    if (event.target === employeeModalEl) {
      closeEmployeeProfileModal();
    }
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
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/held`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to mark seminar as held');
      seminarParticipantsStatusEl.textContent = data?.message || 'Seminar marked as held.';
      await loadSeminars();
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) {
        await openParticipantsModal(seminar);
      }
    } catch (err) {
      seminarParticipantsStatusEl.textContent = err.message || 'Failed to mark seminar as held.';
    }
  });

  markAttendanceBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId) return;
    if (!seminarParticipantsListEl) return;

    const selected = Array.from(seminarParticipantsListEl.querySelectorAll('.admin-attendance-row-check'))
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    try {
      const res = await authedFetch(`/api/admin/seminars/${attendanceModalState.seminarId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendedRegistrationIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to record attendance');
      attendanceModalState.attendanceSaved = true;
      seminarParticipantsStatusEl.textContent =
        data?.message || `Attendance updated. Attended: ${data.attendedCount || 0}, Absent: ${data.absentCount || 0}`;
      await loadSummary();
      await loadSeminars();
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) {
        await openParticipantsModal(seminar);
      }
    } catch (err) {
      seminarParticipantsStatusEl.textContent = err.message || 'Failed to record attendance.';
    }
  });

  sendCertificatesBtn?.addEventListener('click', async () => {
    if (!attendanceModalState.seminarId || !seminarParticipantsListEl) return;
    const selected = Array.from(seminarParticipantsListEl.querySelectorAll('.admin-attendance-row-check'))
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    if (!selected.length) {
      seminarParticipantsStatusEl.textContent = 'Select attended participants first.';
      return;
    }

    if (!attendanceModalState.attendanceSaved) {
      seminarParticipantsStatusEl.textContent = 'Save attendance first before sending certificates.';
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
      seminarParticipantsStatusEl.textContent =
        data?.message || `Certificates released to ${data.releasedCount || 0} attendee(s).`;
      const seminar = currentSeminars.find((item) => String(item._id) === String(attendanceModalState.seminarId));
      if (seminar) {
        await openParticipantsModal(seminar);
      }
    } catch (err) {
      seminarParticipantsStatusEl.textContent = err.message || 'Failed to send certificates.';
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
    const formBody = Object.fromEntries(new FormData(seminarEditForm).entries());
    const seminarId = formBody.seminarId;
    const today = getTodayDateInputValue();
    if (!seminarId) return;
    if (!formBody.date || String(formBody.date) < today) {
      if (seminarEditStatusEl) seminarEditStatusEl.textContent = 'Seminar date cannot be in the past.';
      return;
    }

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
    const body = Object.fromEntries(new FormData(createSeminarForm).entries());
    const today = getTodayDateInputValue();
    if (!body.date || String(body.date) < today) {
      if (createSeminarStatusEl) {
        createSeminarStatusEl.textContent = 'Seminar date cannot be in the past.';
      }
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
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

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
        data?.sent !== undefined
          ? `Emails sent successfully (${data.sent}).`
          : 'Emails sent successfully.';
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
  loadAll().catch((err) => {
    employeesStatusEl.textContent = err.message || 'Failed to load admin dashboard.';
    window.localStorage.removeItem('gadims_employee_token');
    window.localStorage.removeItem('gadims_role');
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  });
});
