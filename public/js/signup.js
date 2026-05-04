window.handleSignupGoogleCredential = async (response) => {
  const banner = document.getElementById('signup-google-banner');
  const completeStatusEl = document.getElementById('signup-complete-status');
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message || 'Google sign-in failed.');

    if (body.needsProfile) {
      const params = new URLSearchParams({
        token: body.profileToken,
        email: body.email || '',
        firstName: body.firstName || '',
        lastName: body.lastName || '',
      });
      window.location.hash = `google=${encodeURIComponent(params.toString())}`;
      window.location.reload();
      return;
    }

    if (body.token) window.localStorage.setItem('gims_employee_token', body.token);
    if (body.role) window.localStorage.setItem('gims_role', String(body.role));
    if (banner) {
      banner.style.display = 'block';
      banner.querySelector('p').textContent = 'You already have an account. Redirecting to your dashboard…';
    }
    setTimeout(() => {
      window.location.href = body.role === 'admin' ? '/admin.html' : '/employee.html';
    }, 700);
  } catch (err) {
    if (completeStatusEl) completeStatusEl.textContent = err.message || 'Google sign-in failed.';
  }
};

const initSignupGoogleButton = async () => {
  const container = document.getElementById('signup-google-container');
  if (!container) return;
  try {
    const res = await fetch('/api/auth/google-config');
    const { clientId } = await res.json();
    if (!clientId) {
      container.innerHTML = '<span class="muted small">Google sign-up is not configured.</span>';
      return;
    }
    const tryRender = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(tryRender, 150);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.handleSignupGoogleCredential,
        auto_select: false,
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });
    };
    tryRender();
  } catch {
    container.innerHTML = '<span class="muted small">Google sign-up unavailable.</span>';
  }
};

const parseGoogleHash = () => {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#google=')) return null;
  const raw = decodeURIComponent(hash.slice('#google='.length));
  const params = new URLSearchParams(raw);
  const token = params.get('token');
  if (!token) return null;
  return {
    token,
    email: params.get('email') || '',
    firstName: params.get('firstName') || '',
    lastName: params.get('lastName') || '',
  };
};

document.addEventListener('DOMContentLoaded', () => {
  initSignupGoogleButton();

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

  const emailInput = document.getElementById('signup-email');
  const sendPinBtn = document.getElementById('signup-send-pin-btn');
  const resendPinBtn = document.getElementById('signup-resend-pin-btn');
  const pinInput = document.getElementById('signup-pin');
  const verifyPinBtn = document.getElementById('signup-verify-pin-btn');
  const emailStatusEl = document.getElementById('signup-email-status');
  const pinStatusEl = document.getElementById('signup-pin-status');
  const completeStatusEl = document.getElementById('signup-complete-status');

  const firstNameInput = document.getElementById('signup-first-name');
  const lastNameInput = document.getElementById('signup-last-name');
  const departmentInput = document.getElementById('signup-department');
  const departmentList = document.getElementById('signup-department-list');
  if (departmentList && Array.isArray(window.XU_ALL_DEPARTMENTS)) {
    window.XU_CLUSTERS.forEach((cluster) => {
      window.XU_DEPARTMENTS[cluster].forEach((dept) => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.label = `${dept} — ${cluster}`;
        departmentList.appendChild(opt);
      });
    });
  }
  const positionList = document.getElementById('signup-position-list');
  if (positionList && Array.isArray(window.XU_ALL_ROLES)) {
    window.XU_ROLE_CATEGORIES.forEach((cat) => {
      window.XU_ROLES[cat].forEach((role) => {
        const opt = document.createElement('option');
        opt.value = role;
        opt.label = `${role} — ${cat}`;
        positionList.appendChild(opt);
      });
    });
  }
  const positionInput = document.getElementById('signup-position');
  const passwordInput = document.getElementById('signup-password');
  const birthSexInput = document.getElementById('signup-birth-sex');
  const genderIdentityInput = document.getElementById('signup-gender-identity');
  const submitBtn = document.getElementById('signup-submit-btn');
  const cancelBtn = document.getElementById('signup-cancel-btn');

  /** @type {string | null} */
  let registrationToken = null;
  /** @type {string | null} */
  let verifiedEmail = null;
  /** @type {string | null} */
  let googleProfileToken = null;

  const profileInputs = [
    firstNameInput,
    lastNameInput,
    departmentInput,
    positionInput,
    passwordInput,
    birthSexInput,
    genderIdentityInput,
    submitBtn,
  ].filter(Boolean);

  const step2Container = document.getElementById('signup-step2');
  const setProfileEnabled = (enabled) => {
    profileInputs.forEach((node) => {
      node.disabled = !enabled;
    });
    if (step2Container) {
      step2Container.classList.toggle('is-locked', !enabled);
    }
  };

  const isValidXUEmail = (value) => {
    const trimmed = String(value || '').trim().toLowerCase();
    return trimmed.endsWith('@xu.edu.ph') || trimmed.endsWith('@my.xu.edu.ph');
  };

  const clearStatus = () => {
    if (emailStatusEl) emailStatusEl.textContent = '';
    if (pinStatusEl) pinStatusEl.textContent = '';
    if (completeStatusEl) completeStatusEl.textContent = '';
  };

  setProfileEnabled(false);

  const googleHash = parseGoogleHash();
  if (googleHash) {
    googleProfileToken = googleHash.token;
    verifiedEmail = googleHash.email;

    const banner = document.getElementById('signup-google-banner');
    const googleCard = document.getElementById('signup-google-card');
    const step1Heading = document.getElementById('signup-step1-heading');
    const step1Help = document.getElementById('signup-step1-help');
    if (banner) banner.style.display = 'block';
    if (googleCard) googleCard.style.display = 'none';
    if (step1Heading) step1Heading.style.display = 'none';
    if (step1Help) step1Help.style.display = 'none';

    if (emailInput) {
      emailInput.value = googleHash.email;
      emailInput.readOnly = true;
      const emailLabel = emailInput.closest('label');
      if (emailLabel) emailLabel.style.display = 'none';
    }
    if (sendPinBtn) sendPinBtn.style.display = 'none';
    if (resendPinBtn) resendPinBtn.style.display = 'none';
    if (verifyPinBtn) verifyPinBtn.style.display = 'none';
    if (pinInput) {
      const pinLabel = pinInput.closest('label');
      if (pinLabel) pinLabel.style.display = 'none';
    }

    if (firstNameInput) firstNameInput.value = googleHash.firstName;
    if (lastNameInput) lastNameInput.value = googleHash.lastName;

    if (passwordInput) {
      const pwLabel = passwordInput.closest('label');
      if (pwLabel) pwLabel.style.display = 'none';
      passwordInput.removeAttribute('required');
    }

    setProfileEnabled(true);
    const step2Heading = step2Container?.querySelector('h2');
    if (step2Heading) {
      step2Heading.firstChild.textContent = 'Complete your profile ';
    }
    const lockBadge = step2Container?.querySelector('.signup-step2-lock-badge');
    if (lockBadge) lockBadge.style.display = 'none';
  }

  sendPinBtn?.addEventListener('click', async () => {
    clearStatus();
    const value = /** @type {HTMLInputElement} */ (emailInput).value.trim();
    if (!value) {
      emailStatusEl.textContent = 'Please enter your Xavier email address first.';
      return;
    }
    if (!isValidXUEmail(value)) {
      emailStatusEl.textContent = 'Only @xu.edu.ph or @my.xu.edu.ph emails are allowed.';
      return;
    }

    try {
      sendPinBtn.disabled = true;
      sendPinBtn.textContent = 'Sending...';
      const res = await fetch('/api/auth/send-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to send PIN.');
      }
      /** @type {HTMLInputElement} */ (pinInput).disabled = false;
      emailStatusEl.textContent = 'Verification PIN sent. Please check your XU inbox.';
      verifiedEmail = value;
    } catch (err) {
      emailStatusEl.textContent = err.message || 'Failed to send PIN.';
    } finally {
      sendPinBtn.disabled = false;
      sendPinBtn.textContent = 'Send PIN';
    }
  });

  resendPinBtn?.addEventListener('click', () => {
    sendPinBtn?.click();
  });

  verifyPinBtn?.addEventListener('click', async () => {
    clearStatus();
    const pin = /** @type {HTMLInputElement} */ (pinInput).value.trim();

    if (!verifiedEmail) {
      pinStatusEl.textContent = 'Please request a PIN first.';
      return;
    }
    if (!pin || pin.length !== 6) {
      pinStatusEl.textContent = 'Please enter the 6‑digit PIN.';
      return;
    }

    try {
      verifyPinBtn.disabled = true;
      verifyPinBtn.textContent = 'Verifying...';
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedEmail, code: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'PIN verification failed.');
      }
      registrationToken = data.token;
      pinStatusEl.textContent = 'PIN verified. You may now complete your profile.';
      setProfileEnabled(true);
    } catch (err) {
      pinStatusEl.textContent = err.message || 'Invalid or expired PIN.';
    } finally {
      verifyPinBtn.disabled = false;
      verifyPinBtn.textContent = 'Verify PIN';
    }
  });

  submitBtn?.addEventListener('click', async () => {
    clearStatus();
    if (!registrationToken && !googleProfileToken) {
      completeStatusEl.textContent = 'Please verify your PIN before creating an account.';
      return;
    }

    const payload = {
      firstName: /** @type {HTMLInputElement} */ (firstNameInput).value.trim(),
      lastName: /** @type {HTMLInputElement} */ (lastNameInput).value.trim(),
      department: /** @type {HTMLInputElement} */ (departmentInput).value.trim(),
      position: /** @type {HTMLInputElement} */ (positionInput).value.trim(),
      birthSex: birthSexInput ? /** @type {HTMLInputElement} */ (birthSexInput).value.trim() : '',
      genderIdentity: genderIdentityInput
        ? /** @type {HTMLInputElement} */ (genderIdentityInput).value.trim()
        : '',
    };

    if (!googleProfileToken) {
      payload.password = /** @type {HTMLInputElement} */ (passwordInput).value.trim();
    }

    const requiredMissing = !payload.firstName || !payload.lastName || !payload.department || !payload.position || !payload.birthSex;
    if (requiredMissing || (!googleProfileToken && !payload.password)) {
      completeStatusEl.textContent = googleProfileToken
        ? 'First Name, Last Name, Department, Position, and Birth Sex are required.'
        : 'First Name, Last Name, Department, Position, Birth Sex, and Password are required.';
      return;
    }

    if (!googleProfileToken) {
      const pw = payload.password;
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        completeStatusEl.textContent =
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';
        return;
      }
    }

    const endpoint = googleProfileToken
      ? '/api/auth/google/complete-account'
      : '/api/auth/create-account';
    const authToken = googleProfileToken || registrationToken;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create account.');
      }

      if (data.token) {
        window.localStorage.setItem('gims_employee_token', data.token);
        window.localStorage.setItem('gims_role', 'employee');
      }
      completeStatusEl.textContent = 'Account created. Redirecting to your dashboard…';
      if (googleProfileToken && window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
      }
      setTimeout(() => {
        window.location.href = '/employee.html';
      }, 1200);
    } catch (err) {
      completeStatusEl.textContent = err.message || 'Failed to create account.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  cancelBtn?.addEventListener('click', () => {
    registrationToken = null;
    verifiedEmail = null;
    setProfileEnabled(false);
    clearStatus();

    if (emailInput) /** @type {HTMLInputElement} */ (emailInput).value = '';
    if (pinInput) {
      /** @type {HTMLInputElement} */ (pinInput).value = '';
      /** @type {HTMLInputElement} */ (pinInput).disabled = true;
    }
    if (firstNameInput) /** @type {HTMLInputElement} */ (firstNameInput).value = '';
    if (lastNameInput) /** @type {HTMLInputElement} */ (lastNameInput).value = '';
    if (departmentInput) /** @type {HTMLInputElement} */ (departmentInput).value = '';
    if (positionInput) /** @type {HTMLInputElement} */ (positionInput).value = '';
    if (passwordInput) /** @type {HTMLInputElement} */ (passwordInput).value = '';
    if (birthSexInput) /** @type {HTMLInputElement} */ (birthSexInput).value = '';
    if (genderIdentityInput) /** @type {HTMLInputElement} */ (genderIdentityInput).value = '';
  });
});

