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

