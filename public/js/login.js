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

  const form = document.getElementById('login-form');
  const statusEl = document.getElementById('login-status');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const forgotOpenBtn = document.getElementById('forgot-password-open-btn');
  const forgotModalEl = document.getElementById('forgot-password-modal');
  const forgotCloseBtn = document.getElementById('forgot-password-close-btn');
  const forgotCancelBtn = document.getElementById('forgot-password-cancel-btn');
  const forgotRequestBtn = document.getElementById('forgot-password-request-btn');
  const forgotVerifyBtn = document.getElementById('forgot-password-verify-btn');
  const forgotConfirmBtn = document.getElementById('forgot-password-confirm-btn');
  const forgotStatusEl = document.getElementById('forgot-password-status');
  const forgotEmailEl = document.getElementById('forgot-password-email');
  const forgotPinEl = document.getElementById('forgot-password-pin');
  const forgotPasswordEl = document.getElementById('forgot-password-new-password');

  let forgotResetToken = null;

  const isValidXUEmail = (value) => {
    const email = String(value || '').trim().toLowerCase();
    return email.endsWith('@xu.edu.ph') || email.endsWith('@my.xu.edu.ph');
  };

  const resetForgotForm = () => {
    forgotResetToken = null;
    if (forgotStatusEl) forgotStatusEl.textContent = '';
    if (forgotPinEl) forgotPinEl.value = '';
    if (forgotPasswordEl) forgotPasswordEl.value = '';
  };

  const closeForgotModal = () => {
    if (forgotModalEl) forgotModalEl.style.display = 'none';
    resetForgotForm();
  };

  forgotOpenBtn?.addEventListener('click', () => {
    if (forgotModalEl) forgotModalEl.style.display = 'flex';
    if (forgotStatusEl) forgotStatusEl.textContent = '';
  });
  forgotCloseBtn?.addEventListener('click', closeForgotModal);
  forgotCancelBtn?.addEventListener('click', closeForgotModal);
  forgotModalEl?.addEventListener('click', (event) => {
    if (event.target === forgotModalEl) closeForgotModal();
  });

  forgotRequestBtn?.addEventListener('click', async () => {
    if (forgotStatusEl) forgotStatusEl.textContent = '';
    const email = String(forgotEmailEl?.value || '').trim();
    if (!isValidXUEmail(email)) {
      if (forgotStatusEl) forgotStatusEl.textContent = 'Use a valid @xu.edu.ph or @my.xu.edu.ph email.';
      return;
    }

    try {
      forgotRequestBtn.disabled = true;
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Failed to send reset PIN.');
      if (forgotStatusEl) forgotStatusEl.textContent = body?.message || 'Reset PIN sent. Check your email.';
    } catch (err) {
      if (forgotStatusEl) forgotStatusEl.textContent = err.message || 'Failed to send reset PIN.';
    } finally {
      forgotRequestBtn.disabled = false;
    }
  });

  forgotVerifyBtn?.addEventListener('click', async () => {
    if (forgotStatusEl) forgotStatusEl.textContent = '';
    const email = String(forgotEmailEl?.value || '').trim();
    const code = String(forgotPinEl?.value || '').trim();
    if (!isValidXUEmail(email)) {
      if (forgotStatusEl) forgotStatusEl.textContent = 'Use a valid @xu.edu.ph or @my.xu.edu.ph email.';
      return;
    }
    if (!code || code.length !== 6) {
      if (forgotStatusEl) forgotStatusEl.textContent = 'Enter your 6-digit reset PIN.';
      return;
    }

    try {
      forgotVerifyBtn.disabled = true;
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'PIN verification failed.');
      forgotResetToken = body?.token || null;
      if (forgotStatusEl) forgotStatusEl.textContent = 'PIN verified. You can now set a new password.';
    } catch (err) {
      if (forgotStatusEl) forgotStatusEl.textContent = err.message || 'PIN verification failed.';
    } finally {
      forgotVerifyBtn.disabled = false;
    }
  });

  forgotConfirmBtn?.addEventListener('click', async () => {
    if (forgotStatusEl) forgotStatusEl.textContent = '';
    const newPassword = String(forgotPasswordEl?.value || '').trim();
    if (!forgotResetToken) {
      if (forgotStatusEl) forgotStatusEl.textContent = 'Verify your PIN first.';
      return;
    }
    if (newPassword.length < 8) {
      if (forgotStatusEl) forgotStatusEl.textContent = 'New password must be at least 8 characters.';
      return;
    }

    try {
      forgotConfirmBtn.disabled = true;
      const res = await fetch('/api/auth/forgot-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${forgotResetToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Password reset failed.');
      if (forgotStatusEl) forgotStatusEl.textContent = body?.message || 'Password reset successful. You can now login.';
      setTimeout(() => {
        closeForgotModal();
      }, 900);
    } catch (err) {
      if (forgotStatusEl) forgotStatusEl.textContent = err.message || 'Password reset failed.';
    } finally {
      forgotConfirmBtn.disabled = false;
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form || !statusEl) return;
    statusEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '').trim();

    if (!email || !password) {
      statusEl.textContent = 'Please enter both email and password.';
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || 'Login failed.');
      }
      if (body.token) {
        window.localStorage.setItem('gadims_employee_token', body.token);
      }
      if (body.role) {
        window.localStorage.setItem('gadims_role', String(body.role));
      }
      const role = body.role || 'employee';
      statusEl.textContent = 'Logged in. Redirecting to your dashboard…';
      setTimeout(() => {
        if (role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/employee.html';
        }
      }, 900);
    } catch (err) {
      statusEl.textContent = err.message || 'Login failed.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    }
  });
});

