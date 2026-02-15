<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

// const API_URL = 'http://192.168.217.130:5000/api/login'
const API_URL = 'http://13.61.179.179:5000/api/login'

const handleLogin = async () => {
  errorMsg.value = ''
  
  // Form validation
  if (!username.value.trim()) {
    errorMsg.value = 'Lütfen kullanıcı adınızı girin'
    return
  }
  
  if (!password.value) {
    errorMsg.value = 'Lütfen şifrenizi girin'
    return
  }
  
  isLoading.value = true

  try {
    const res = await axios.post(API_URL, {
      username: username.value,
      password: password.value
    })

    const user = res.data.user
    
    if (user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(`/staff/${user.warehouse_id}?name=${user.full_name}&uid=${user.id}`)
    }

  } catch (e) {
    if (e.response && e.response.status === 401) {
      errorMsg.value = 'Kullanıcı adı veya şifre hatalı'
    } else {
      errorMsg.value = 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Left Panel - Branding -->
    <div class="brand-panel">
      <div class="brand-content">
        <div class="brand-header">
          <div class="logo">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="20" width="48" height="36" rx="4" stroke="currentColor" stroke-width="3"/>
              <path d="M16 28h32M16 36h24M16 44h28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <circle cx="32" cy="12" r="6" fill="currentColor"/>
              <path d="M32 18v2" stroke="var(--bg-primary)" stroke-width="2"/>
            </svg>
          </div>
          <h1 class="brand-title">Rescue Chain</h1>
        </div>
        
        <p class="brand-tagline">Afet anında, yardım doğru yerde</p>
        
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>Gerçek Zamanlı İzleme</h4>
              <p>Tüm operasyonlarınızı anlık takip edin</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>Otonom Yönetim</h4>
              <p>AI destekli akıllı dağıtım sistemi</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>Güvenli Altyapı</h4>
              <p>Huawei Cloud ile verileriniz güvende</p>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <span class="powered-by">Powered by</span>
          <span class="provider">Huawei Cloud</span>
        </div>
      </div>
    </div>

    <!-- Right Panel - Login Form -->
    <div class="form-panel">
      <div class="form-container">
        <div class="form-header">
          <h2>Hoş Geldiniz</h2>
          <p>Devam etmek için hesabınıza giriş yapın</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <label for="username" class="input-label">Kullanıcı Adı</label>
            <div class="input-wrapper" :class="{ 'has-error': errorMsg && !username }">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="username"
                type="text"
                v-model="username"
                placeholder="Kullanıcı adınızı girin"
                class="input"
                :disabled="isLoading"
                autocomplete="username"
              >
            </div>
          </div>

          <div class="input-group">
            <label for="password" class="input-label">Şifre</label>
            <div class="input-wrapper" :class="{ 'has-error': errorMsg && !password }">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Şifrenizi girin"
                class="input"
                :disabled="isLoading"
                autocomplete="current-password"
              >
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
                :disabled="isLoading"
                tabindex="-1"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <transition name="fade">
            <div v-if="errorMsg" class="error-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>
          </transition>

          <button type="submit" class="btn btn-primary btn-lg submit-btn" :disabled="isLoading">
            <span v-if="!isLoading">Giriş Yap</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Giriş yapılıyor...
            </span>
            <svg v-if="!isLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </form>

        <div class="demo-credentials">
          <p class="demo-label">Demo Hesaplar:</p>
          <div class="demo-list">
            <div class="demo-item">
              <span class="demo-role">Admin:</span>
              <code>admin / 1234</code>
            </div>
            <div class="demo-item">
              <span class="demo-role">Personel:</span>
              <code>staff_istanbul / 1234</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}

/* === LEFT PANEL - BRANDING === */
.brand-panel {
  flex: 1;
  position: relative;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding: var(--space-12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-panel::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(33, 150, 243, 0.1) 0%, transparent 70%);
  animation: pulse 15s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 500px;
  width: 100%;
}

.brand-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-6);
  color: var(--primary-400);
  filter: drop-shadow(0 8px 16px rgba(33, 150, 243, 0.3));
}

.logo svg {
  width: 100%;
  height: 100%;
}

.brand-title {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-2);
}

.brand-tagline {
  font-size: var(--text-xl);
  color: var(--text-secondary);
  margin-bottom: var(--space-12);
  text-align: center;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-bottom: var(--space-12);
}

.feature-item {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.feature-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-700);
  transform: translateX(8px);
}

.feature-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  color: var(--primary-400);
}

.feature-icon svg {
  width: 24px;
  height: 24px;
}

.feature-text h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.feature-text p {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.brand-footer {
  text-align: center;
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.powered-by {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.provider {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

/* === RIGHT PANEL - FORM === */
.form-panel {
  flex: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: var(--bg-secondary);
}

.form-container {
  width: 100%;
  max-width: 440px;
}

.form-header {
  margin-bottom: var(--space-10);
}

.form-header h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.form-header p {
  font-size: var(--text-base);
  color: var(--text-tertiary);
  margin: 0;
}

.login-form {
  margin-bottom: var(--space-8);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper.has-error .input {
  border-color: var(--error);
}

.input-icon {
  position: absolute;
  left: var(--space-4);
  width: 20px;
  height: 20px;
  color: var(--text-disabled);
  pointer-events: none;
  transition: color var(--transition-fast);
}

.input-wrapper .input {
  padding-left: calc(var(--space-4) + 20px + var(--space-3));
  padding-right: var(--space-4);
}

.input-wrapper:has(.password-toggle) .input {
  padding-right: calc(var(--space-4) + 20px + var(--space-3));
}

.input:focus ~ .input-icon {
  color: var(--primary-400);
}

.password-toggle {
  position: absolute;
  right: var(--space-4);
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-disabled);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.password-toggle:hover {
  color: var(--text-secondary);
}

.password-toggle svg {
  width: 100%;
  height: 100%;
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(239, 83, 80, 0.1);
  border: 1px solid var(--error);
  border-radius: var(--radius-md);
  color: var(--error-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-5);
}

.error-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.submit-btn {
  width: 100%;
  margin-top: var(--space-2);
}

.submit-btn svg {
  width: 20px;
  height: 20px;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.demo-credentials {
  padding: var(--space-6);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
}

.demo-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.demo-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.demo-role {
  color: var(--text-tertiary);
  min-width: 70px;
}

.demo-item code {
  padding: var(--space-1) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--primary-300);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .brand-panel {
    display: none;
  }
  
  .form-panel {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .form-panel {
    padding: var(--space-6) var(--space-4);
  }
  
  .form-header h2 {
    font-size: var(--text-2xl);
  }
  
  .demo-list {
    flex-direction: column;
  }
}
</style>