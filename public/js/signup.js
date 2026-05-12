window.addEventListener('error', (event) => {
  console.error('[signup] uncaught error', event.error || event.message, event.filename, event.lineno);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[signup] unhandled promise rejection', event.reason);
});

const _SIGNUP_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const _SIGNUP_EYE_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.innerHTML = _SIGNUP_EYE;
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-field')?.querySelector('input');
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? _SIGNUP_EYE : _SIGNUP_EYE_OFF;
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });

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
  const genderSelfDescribeInput = document.getElementById('signup-gender-self-describe');
  const genderSelfDescribeRow = document.getElementById('signup-gender-self-describe-row');

  const updateGenderSelfDescribeVisibility = () => {
    if (!genderIdentityInput || !genderSelfDescribeRow) return;
    const show = genderIdentityInput.value === 'Prefer to self-describe';
    genderSelfDescribeRow.style.display = show ? '' : 'none';
    if (!show && genderSelfDescribeInput) genderSelfDescribeInput.value = '';
  };
  genderIdentityInput?.addEventListener('change', updateGenderSelfDescribeVisibility);
  const submitBtn = document.getElementById('signup-submit-btn');
  const cancelBtn = document.getElementById('signup-cancel-btn');

  const errorPopupEl = document.getElementById('signup-error-popup');
  const errorPopupMsgEl = document.getElementById('signup-error-popup-message');
  const errorPopupCloseBtn = document.getElementById('signup-error-popup-close');
  let errorPopupTimer = null;
  const showErrorPopup = (message) => {
    if (!errorPopupEl || !errorPopupMsgEl) {
      window.alert(message);
      return;
    }
    errorPopupMsgEl.textContent = message;
    errorPopupEl.classList.add('is-visible');
    if (errorPopupTimer) clearTimeout(errorPopupTimer);
    errorPopupTimer = setTimeout(() => {
      errorPopupEl.classList.remove('is-visible');
    }, 6000);
  };
  const hideErrorPopup = () => {
    errorPopupEl?.classList.remove('is-visible');
    if (errorPopupTimer) clearTimeout(errorPopupTimer);
    errorPopupTimer = null;
  };
  errorPopupCloseBtn?.addEventListener('click', hideErrorPopup);

  const requiredFieldMap = [
    { input: firstNameInput, label: 'First Name' },
    { input: lastNameInput, label: 'Last Name' },
    { input: departmentInput, label: 'Department' },
    { input: positionInput, label: 'Position' },
    { input: birthSexInput, label: 'Birth Sex' },
  ];
  const markFieldInvalid = (input, invalid) => {
    if (!input) return;
    const labelEl = input.closest('label');
    if (labelEl) labelEl.classList.toggle('is-required-missing', Boolean(invalid));
    input.classList.toggle('is-invalid', Boolean(invalid));
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };
  const clearAllFieldErrors = () => {
    requiredFieldMap.forEach(({ input }) => markFieldInvalid(input, false));
    if (passwordInput) markFieldInvalid(passwordInput, false);
  };
  [firstNameInput, lastNameInput, departmentInput, positionInput, birthSexInput, passwordInput].forEach((input) => {
    input?.addEventListener('input', () => markFieldInvalid(input, false));
  });

  const passwordHintEl = document.getElementById('signup-password-hint');
  const isPasswordSufficient = (pw) =>
    pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const updatePasswordHint = () => {
    if (!passwordHintEl) return;
    const value = passwordInput?.value || '';
    const show = value.length > 0 && !isPasswordSufficient(value);
    passwordHintEl.style.display = show ? 'block' : 'none';
  };
  passwordInput?.addEventListener('input', updatePasswordHint);
  passwordInput?.addEventListener('blur', updatePasswordHint);

  /** @type {string | null} */
  let registrationToken = null;
  /** @type {string | null} */
  let verifiedEmail = null;

  const profileInputs = [
    firstNameInput,
    lastNameInput,
    departmentInput,
    positionInput,
    passwordInput,
    birthSexInput,
    genderIdentityInput,
    genderSelfDescribeInput,
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
      console.error('[signup] send PIN failed', err);
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
      console.error('[signup] verify PIN failed', err);
      pinStatusEl.textContent = err.message || 'Invalid or expired PIN.';
    } finally {
      verifyPinBtn.disabled = false;
      verifyPinBtn.textContent = 'Verify PIN';
    }
  });

  submitBtn?.addEventListener('click', async () => {
    clearStatus();
    clearAllFieldErrors();
    if (!registrationToken) {
      completeStatusEl.textContent = 'Please verify your PIN before creating an account.';
      showErrorPopup('Please verify your XU email PIN before creating an account.');
      return;
    }

    const payload = {
      firstName: /** @type {HTMLInputElement} */ (firstNameInput).value.trim().toUpperCase(),
      lastName: /** @type {HTMLInputElement} */ (lastNameInput).value.trim().toUpperCase(),
      department: /** @type {HTMLInputElement} */ (departmentInput).value.trim().toUpperCase(),
      position: /** @type {HTMLInputElement} */ (positionInput).value.trim().toUpperCase(),
      birthSex: birthSexInput ? /** @type {HTMLInputElement} */ (birthSexInput).value.trim() : '',
      genderIdentity: (() => {
        const raw = genderIdentityInput ? /** @type {HTMLInputElement} */ (genderIdentityInput).value.trim() : '';
        if (raw === 'Prefer to self-describe') {
          const selfDesc = genderSelfDescribeInput
            ? /** @type {HTMLInputElement} */ (genderSelfDescribeInput).value.trim()
            : '';
          return selfDesc ? `Self-described: ${selfDesc}` : 'Prefer to self-describe';
        }
        return raw;
      })(),
    };

    payload.password = /** @type {HTMLInputElement} */ (passwordInput).value.trim();

    const missingLabels = [];
    requiredFieldMap.forEach(({ input, label }) => {
      const value = input ? /** @type {HTMLInputElement} */ (input).value.trim() : '';
      if (!value) {
        markFieldInvalid(input, true);
        missingLabels.push(label);
      }
    });
    if (!payload.password) {
      markFieldInvalid(passwordInput, true);
      missingLabels.push('Password');
    }

    if (missingLabels.length) {
      const msg = `These required field${missingLabels.length > 1 ? 's are' : ' is'} missing: ${missingLabels.join(', ')}.`;
      completeStatusEl.textContent = msg;
      showErrorPopup(msg);
      const firstMissing = requiredFieldMap.find(({ input }) => input?.classList.contains('is-invalid'));
      (firstMissing?.input || passwordInput)?.focus();
      return;
    }

    if (!isPasswordSufficient(payload.password)) {
      const msg = 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';
      completeStatusEl.textContent = msg;
      showErrorPopup(msg);
      markFieldInvalid(passwordInput, true);
      if (passwordHintEl) passwordHintEl.style.display = 'block';
      passwordInput?.focus();
      return;
    }

    const endpoint = '/api/auth/create-account';
    const authToken = registrationToken;

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
      setTimeout(() => {
        window.location.href = '/employee.html';
      }, 1200);
    } catch (err) {
      console.error('[signup] create account failed', err);
      const msg = err.message || 'Failed to create account.';
      completeStatusEl.textContent = msg;
      showErrorPopup(msg);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  cancelBtn?.addEventListener('click', () => {
    registrationToken = null;
    verifiedEmail = null;
    setProfileEnabled(false);
    clearStatus();
    clearAllFieldErrors();
    hideErrorPopup();

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
    if (genderSelfDescribeInput) /** @type {HTMLInputElement} */ (genderSelfDescribeInput).value = '';
    updateGenderSelfDescribeVisibility();
  });
});

