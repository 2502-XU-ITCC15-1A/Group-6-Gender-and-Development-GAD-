let employeeToken = null;

// In this version, the employee token is expected to be supplied by the
// registration/sign-in flow (e.g., stored in localStorage). For now, the
// dashboard endpoints are protected, and we surface clear messages if missing.

const profileBtn = document.getElementById('employee-load-profile-btn');
const profileStatusEl = document.getElementById('employee-profile-status');
const nameEl = document.getElementById('employee-name');
const emailEl = document.getElementById('employee-email');
const departmentEl = document.getElementById('employee-department');
const positionEl = document.getElementById('employee-position');
const birthSexEl = document.getElementById('employee-birth-sex');
const genderIdentityEl = document.getElementById('employee-gender-identity');
const editProfileBtn = document.getElementById('employee-edit-profile-btn');
const saveProfileBtn = document.getElementById('employee-save-profile-btn');

const seminarsBtn = document.getElementById('employee-load-seminars-btn');
const seminarsList = document.getElementById('employee-seminars-list');
const seminarsStatusEl = document.getElementById('employee-seminars-status');

const materialsBtn = document.getElementById('employee-load-materials-btn');
const materialsList = document.getElementById('employee-materials-list');
const materialsStatusEl = document.getElementById('employee-materials-status');

const registrationsBtn = document.getElementById('employee-load-registrations-btn');
const registrationsList = document.getElementById('employee-registrations-list');
const registrationsStatusEl = document.getElementById('employee-registrations-status');
const loadArticlesBtn = document.getElementById('load-articles-btn');
const articlesFeed = document.getElementById('articles-feed');
const articlesStatus = document.getElementById('articles-status');
const modalBackdrop = document.getElementById('article-modal-backdrop');
const modalTitle = document.getElementById('article-modal-title');
const modalImage = document.getElementById('article-modal-image');
const modalMeta = document.getElementById('article-modal-meta');
const modalText = document.getElementById('article-modal-text');
const closeModalBtn = document.getElementById('close-article-modal');

const authedFetch = async (url, options = {}) => {
  if (!employeeToken) {
    // Attempt to hydrate from storage for basic persistence
    const stored = window.localStorage.getItem('gims_employee_token');
    if (stored) {
      employeeToken = stored;
    } else {
      throw new Error('Not authenticated');
    }
  }
  const headers = options.headers || {};
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      Authorization: `Bearer ${employeeToken}`,
    },
  });
};

profileBtn?.addEventListener('click', async () => {
  profileStatusEl.textContent = '';
  try {
    const res = await authedFetch('/api/employee/me');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load profile');

    nameEl.textContent = data.name || '';
    emailEl.textContent = data.email || '';
    departmentEl.textContent = data.department || '';
    positionEl.textContent = data.position || '';
    birthSexEl.textContent = data.birthSex || '—';
    genderIdentityEl.textContent = data.genderIdentity || '—';

    profileStatusEl.textContent = '';
  } catch (err) {
    profileStatusEl.textContent = err.message;
  }
});

editProfileBtn?.addEventListener('click', () => {
  const birth = birthSexEl.textContent === '—' ? '' : birthSexEl.textContent;
  const gender = genderIdentityEl.textContent === '—' ? '' : genderIdentityEl.textContent;

  const birthInput = document.createElement('input');
  birthInput.type = 'text';
  birthInput.value = birth || '';
  birthInput.className = 'inline-input';
  birthInput.id = 'employee-birth-sex-input';

  const genderInput = document.createElement('input');
  genderInput.type = 'text';
  genderInput.value = gender || '';
  genderInput.className = 'inline-input';
  genderInput.id = 'employee-gender-identity-input';

  birthSexEl.textContent = '';
  birthSexEl.appendChild(birthInput);
  genderIdentityEl.textContent = '';
  genderIdentityEl.appendChild(genderInput);

  saveProfileBtn.style.display = 'inline-flex';
});

saveProfileBtn?.addEventListener('click', async () => {
  profileStatusEl.textContent = '';
  const birthInput = document.getElementById('employee-birth-sex-input');
  const genderInput = document.getElementById('employee-gender-identity-input');

  const payload = {
    birthSex: birthInput ? /** @type {HTMLInputElement} */ (birthInput).value.trim() : '',
    genderIdentity: genderInput
      ? /** @type {HTMLInputElement} */ (genderInput).value.trim()
      : '',
  };

  try {
    const res = await authedFetch('/api/employee/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to save profile');

    birthSexEl.textContent = data.birthSex || '—';
    genderIdentityEl.textContent = data.genderIdentity || '—';
    saveProfileBtn.style.display = 'none';
    profileStatusEl.textContent = 'Profile updated.';
  } catch (err) {
    profileStatusEl.textContent = err.message;
  }
});

seminarsBtn?.addEventListener('click', async () => {
  seminarsStatusEl.textContent = '';
  try {
    const res = await authedFetch('/api/employee/seminars');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load seminars');

    if (!Array.isArray(data) || data.length === 0) {
      seminarsList.innerHTML = '<p class="muted">No active seminars at the moment.</p>';
      return;
    }

    const cards = data
      .map((s) => {
        const date = s.date ? new Date(s.date).toLocaleDateString() : '';
        const mandatoryLabel = s.mandatory ? 'YES' : 'NO';
        const remaining = (s.capacity || 0) - (Array.isArray(s.registeredEmployees) ? s.registeredEmployees.length : 0);
        const slotsText = `${Math.max(remaining, 0)} / ${s.capacity}`;
        return `
          <article class="card">
            <h3>${escapeHtml(s.title || '')}</h3>
            <p class="muted">${escapeHtml(s.description || '')}</p>
            <p class="muted small">
              Date: ${escapeHtml(date)}<br />
              Time: ${escapeHtml(s.startTime || '')}<br />
              Duration: ${escapeHtml(String(s.durationHours || ''))} hours<br />
              Mandatory: ${escapeHtml(mandatoryLabel)}<br />
              Slots: ${escapeHtml(slotsText)}
            </p>
            <button class="btn" data-register="${escapeHtml(s._id)}">Join Seminar</button>
          </article>
        `;
      })
      .join('');

    seminarsList.innerHTML = cards;

    seminarsList.querySelectorAll('button[data-register]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-register');
        if (!id) return;
        seminarsStatusEl.textContent = 'Processing registration…';
        try {
          const res2 = await authedFetch(`/api/employee/seminars/${id}/register`, {
            method: 'POST',
          });
          const data2 = await res2.json();
          if (!res2.ok) throw new Error(data2?.message || 'Registration failed');
          seminarsStatusEl.textContent = data2.message || 'You have successfully registered for this seminar.';
          seminarsBtn.click();
        } catch (err) {
          seminarsStatusEl.textContent = err.message;
        }
      });
    });
  } catch (err) {
    seminarsStatusEl.textContent = err.message;
  }
});

materialsBtn?.addEventListener('click', async () => {
  materialsStatusEl.textContent = '';
  try {
    const res = await authedFetch('/api/employee/materials');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load materials');

    if (!Array.isArray(data) || data.length === 0) {
      materialsList.innerHTML = '<p class="muted">No learning materials uploaded yet.</p>';
      return;
    }

    const items = data
      .map((m) => {
        const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '';
        return `
          <article class="card">
            <h3>${escapeHtml(m.title || '')}</h3>
            <p class="muted">${escapeHtml(m.description || '')}</p>
            <p class="muted small">Uploaded: ${escapeHtml(date)}</p>
            <a class="btn secondary" href="${escapeHtml(m.fileURL || '#')}" target="_blank" rel="noopener noreferrer">Download File</a>
          </article>
        `;
      })
      .join('');

    materialsList.innerHTML = items;
  } catch (err) {
    materialsStatusEl.textContent = err.message;
  }
});

registrationsBtn?.addEventListener('click', async () => {
  registrationsStatusEl.textContent = '';
  try {
    const res = await authedFetch('/api/employee/registrations');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load history');

    if (!Array.isArray(data) || data.length === 0) {
      registrationsList.innerHTML = '<p class="muted">No seminar registrations yet.</p>';
      return;
    }

    const rows = data
      .map((r) => {
        const seminar = r.seminarID || {};
        const date = seminar.date ? new Date(seminar.date).toLocaleDateString() : '';
        return `
          <article class="card">
            <h3>${escapeHtml(seminar.title || '')}</h3>
            <p class="muted small">
              Date: ${escapeHtml(date)} • Status: ${escapeHtml(r.status || '')}
            </p>
          </article>
        `;
      })
      .join('');

    registrationsList.innerHTML = rows;
  } catch (err) {
    registrationsStatusEl.textContent = err.message;
  }
});

const openModal = ({ title, imageUrl, meta, content }) => {
  modalTitle.textContent = title || 'Article';
  modalMeta.textContent = meta || '';
  modalText.textContent = content || '';
  if (imageUrl) {
    modalImage.src = imageUrl;
    modalImage.style.display = 'block';
  } else {
    modalImage.style.display = 'none';
  }
  modalBackdrop.style.display = 'flex';
};

const closeModal = () => {
  modalBackdrop.style.display = 'none';
};

closeModalBtn?.addEventListener('click', closeModal);
modalBackdrop?.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

const renderArticles = (articles) => {
  if (!Array.isArray(articles) || articles.length === 0) {
    articlesFeed.innerHTML = '<p class="muted">No updates yet.</p>';
    return;
  }

  const cards = articles
    .map((a) => {
      const date = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '';
      const seminarTitle = a.seminar?.title ? ` • ${escapeHtml(a.seminar.title)}` : '';
      const cover = a.imageUrl ? `<img class="article-cover" src="${escapeHtml(a.imageUrl)}" alt="Article image" />` : '';
      return `
        <article class="article-card">
          ${cover}
          <div class="article-body">
            <h3 class="article-title">${escapeHtml(a.title)}</h3>
            <div class="article-meta">${escapeHtml(date)}${seminarTitle}</div>
            <p class="article-excerpt">${escapeHtml(a.excerpt || '')}</p>
            <button class="btn secondary" data-read-more="${escapeHtml(a._id)}">Read more</button>
          </div>
        </article>
      `;
    })
    .join('');

  articlesFeed.innerHTML = `<div class="articles-grid">${cards}</div>`;

  articlesFeed.querySelectorAll('button[data-read-more]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-read-more');
      articlesStatus.textContent = 'Loading article...';
      try {
        const res = await authedFetch(`/api/employee/articles/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to load article');
        const date = data.publishedAt ? new Date(data.publishedAt).toLocaleString() : '';
        const seminarTitle = data.seminar?.title ? ` • ${data.seminar.title}` : '';
        openModal({
          title: data.title,
          imageUrl: data.imageUrl,
          meta: `${date}${seminarTitle}`,
          content: data.content,
        });
        articlesStatus.textContent = '';
      } catch (err) {
        articlesStatus.textContent = `Load failed: ${err.message}`;
      }
    });
  });
};

loadArticlesBtn?.addEventListener('click', async () => {
  articlesStatus.textContent = '';
  if (!employeeToken) {
    articlesStatus.textContent = 'Please login to view updates.';
    return;
  }
  try {
    const res = await authedFetch('/api/employee/articles');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load updates');
    renderArticles(data);
  } catch (err) {
    articlesStatus.textContent = `Load failed: ${err.message}`;
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

