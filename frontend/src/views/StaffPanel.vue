<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const warehouseId = route.params.id
const staffName = route.query.name
const userId = route.query.uid

const activeTab = ref('inventory')
const warehouses = ref([])
const incomingTransfers = ref([])
const outgoingTransfers = ref([])
const inventory = ref([])
const cart = ref([])
const message = ref('')
const errorMsg = ref('')

const stockForm = ref({ item_name: 'Su (Koli)', quantity: 10 })
const transferForm = ref({ target_id: '', item_name: 'Su (Koli)', quantity: 10 })

// const API_BASE = 'http://192.168.217.130:5000/api'
const API_BASE = 'http://13.61.179.179:5000/api'

const productOptions = [
  'Su (Koli)', 'Konserve Gıda (Koli)', 'Battaniye', 'Çadır',
  'Uyku Tulumu', 'Isıtıcı', 'Jeneratör', 'İlk Yardım Çantası',
  'Tıbbi Malzeme (İlaç vb.)', 'Kıyafet'
]

const totalInventoryCount = computed(() => {
  return inventory.value.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0)
})

const totalInTransit = computed(() => {
  return outgoingTransfers.value.reduce((sum, t) => sum + parseInt(t.quantity || 0), 0)
})

const loadData = async () => {
  try {
    const wRes = await axios.get(`${API_BASE}/warehouses`)
    warehouses.value = wRes.data.filter(w => w.id != warehouseId)

    const tRes = await axios.get(`${API_BASE}/transfer/incoming/${warehouseId}`)
    incomingTransfers.value = tRes.data

    const outRes = await axios.get(`${API_BASE}/transfer/outgoing/${warehouseId}`)
    outgoingTransfers.value = outRes.data

    const invRes = await axios.get(`${API_BASE}/inventory/${warehouseId}`)
    inventory.value = invRes.data
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadData)

const submitStockIn = async () => {
  try {
    await axios.post(`${API_BASE}/stock-in`, {
      user_id: userId,
      warehouse_id: warehouseId,
      ...stockForm.value
    })
    showMessage('✅ Stok başarıyla eklendi')
    await loadData()
  } catch (e) {
    showError(e.response?.data?.error || 'Hata oluştu')
  }
}

const addToCart = () => {
  const { item_name, quantity } = transferForm.value
  if (quantity <= 0) return showError('Miktar 0 olamaz')

  const existing = cart.value.find(i => i.item_name === item_name)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.value.push({ item_name, quantity })
  }
  transferForm.value.quantity = 10
}

const removeFromCart = (index) => {
  cart.value.splice(index, 1)
}

const startTransfer = async () => {
  if(!transferForm.value.target_id) return showError('Lütfen hedef depo seçin')
  if(cart.value.length === 0) return showError('Transfer için lütfen ürün ekleyin')
  
  try {
    await axios.post(`${API_BASE}/transfer/start`, {
      user_id: userId,
      source_id: warehouseId,
      target_id: transferForm.value.target_id,
      items: cart.value
    })
    showMessage(`🚚 ${cart.value.length} kalem transfer başlatıldı`)
    cart.value = []
    await loadData()
  } catch (e) {
    showError(e.response?.data?.error || 'Hata oluştu')
  }
}

const acceptTransfer = async (transferId) => {
  try {
    await axios.post(`${API_BASE}/transfer/complete`, {
      transfer_id: transferId,
      warehouse_id: warehouseId
    })
    showMessage('✅ Transfer onaylandı')
    await loadData()
  } catch (e) {
    showError('Onaylama hatası')
  }
}

const cancelTransfer = async (transferId, isReject = false) => {
  if(!confirm(isReject ? 'Sevkiyatı reddetmek istiyor musunuz?' : 'Transferi iptal etmek istiyor musunuz?')) return

  try {
    await axios.post(`${API_BASE}/transfer/cancel`, {
      transfer_id: transferId,
      reason: isReject ? 'Reddedildi' : 'İptal Edildi'
    })
    showMessage(isReject ? '⛔ Sevkiyat reddedildi' : '⛔ Transfer iptal edildi')
    await loadData()
  } catch (e) {
    showError('İşlem hatası')
  }
}

const showMessage = (msg) => { 
  message.value = msg
  setTimeout(() => message.value = '', 3000)
}

const showError = (msg) => { 
  errorMsg.value = msg
  setTimeout(() => errorMsg.value = '', 3000)
}
</script>

<template>
  <div class="staff-panel">
    <header class="panel-header">
      <div class="header-content">
        <div class="staff-info">
          <div class="avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h1>{{ staffName }}</h1>
            <p class="warehouse-id">Depo ID: {{ warehouseId }}</p>
          </div>
        </div>
        <router-link to="/" class="btn btn-ghost btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Çıkış
        </router-link>
      </div>
    </header>

    <div class="stats-row">
      <div class="mini-stat">
        <div class="mini-stat-icon stock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8"/>
          </svg>
        </div>
        <div>
          <p class="mini-stat-label">Depoda</p>
          <h3 class="mini-stat-value">{{ totalInventoryCount }}</h3>
        </div>
      </div>

      <div class="mini-stat">
        <div class="mini-stat-icon transit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div>
          <p class="mini-stat-label">Yolda</p>
          <h3 class="mini-stat-value">{{ totalInTransit }}</h3>
        </div>
      </div>

      <div class="mini-stat">
        <div class="mini-stat-icon pending">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div>
          <p class="mini-stat-label">Bekleyen</p>
          <h3 class="mini-stat-value">{{ incomingTransfers.length }}</h3>
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <button :class="['tab-btn', { active: activeTab === 'inventory' }]" @click="activeTab = 'inventory'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8"/>
        </svg>
        Envanter
      </button>

      <button :class="['tab-btn', { active: activeTab === 'stockin' }]" @click="activeTab = 'stockin'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Bağış Kabul
      </button>

      <button :class="['tab-btn', { active: activeTab === 'transfer' }]" @click="activeTab = 'transfer'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        Transfer
      </button>

      <button :class="['tab-btn', { active: activeTab === 'incoming' }]" @click="activeTab = 'incoming'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        Onay Bekleyenler
        <span v-if="incomingTransfers.length" class="notification-badge">{{ incomingTransfers.length }}</span>
      </button>
    </div>

    <div class="tab-content">
      <div v-if="activeTab === 'inventory'" class="content-grid">
        <div class="card">
          <div class="card-header">
            <h3>Depodaki Ürünler</h3>
            <span class="card-subtitle">Kullanıma hazır stoklarınız</span>
          </div>
          <div v-if="inventory.length === 0" class="empty-state">
            <div class="empty-state-icon">📦</div>
            <p>Depo şu an boş</p>
          </div>
          <div v-else class="inventory-grid">
            <div v-for="item in inventory" :key="item.item_name" class="inventory-item">
              <div class="item-info">
                <span class="item-icon">📦</span>
                <span class="item-name">{{ item.item_name }}</span>
              </div>
              <span class="item-quantity">{{ item.quantity }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Transferdeki Ürünler</h3>
            <span class="card-subtitle">Onay bekleyen sevkiyatlar</span>
          </div>
          <div v-if="outgoingTransfers.length === 0" class="empty-state">
            <div class="empty-state-icon">🚚</div>
            <p>Yolda ürün yok</p>
          </div>
          <div v-else class="transfer-grid">
            <div v-for="t in outgoingTransfers" :key="t.id" class="transfer-item-small">
              <div class="transfer-info">
                <span class="transfer-name">{{ t.item_name }}</span>
                <span class="transfer-target">→ {{ t.target_name }}</span>
              </div>
              <span class="transfer-quantity warning">{{ t.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'stockin'" class="content-single">
        <div class="card">
          <div class="card-header">
            <h3>Bağış Kabul Et</h3>
            <span class="card-subtitle">Gelen bağışları stoğa ekle</span>
          </div>
          <form @submit.prevent="submitStockIn" class="form-layout">
            <div class="input-group">
              <label class="input-label">Ürün Seç</label>
              <select v-model="stockForm.item_name" class="input">
                <option v-for="product in productOptions" :key="product">{{ product }}</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Miktar</label>
              <input type="number" v-model="stockForm.quantity" min="1" class="input">
            </div>
            <button type="submit" class="btn btn-success btn-compact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Stoğa Ekle
            </button>
          </form>
        </div>
      </div>

      <div v-if="activeTab === 'transfer'" class="content-single">
        <div class="card">
          <div class="card-header">
            <h3>Stok Transferi Oluştur</h3>
            <span class="card-subtitle">Diğer depolara sevkiyat yap</span>
          </div>
          <div class="form-layout">
            <div class="input-group">
              <label class="input-label">Hedef Depo</label>
              <select v-model="transferForm.target_id" class="input">
                <option disabled value="">Seçiniz...</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }} ({{ w.city }})</option>
              </select>
            </div>

            <div class="cart-builder">
              <div class="cart-inputs">
                <div class="input-group">
                  <label class="input-label">Ürün</label>
                  <select v-model="transferForm.item_name" class="input">
                    <option v-for="product in productOptions" :key="product">{{ product }}</option>
                  </select>
                </div>
                <div class="input-group">
                  <label class="input-label">Miktar</label>
                  <input type="number" v-model="transferForm.quantity" min="1" class="input">
                </div>
              </div>
              <button @click="addToCart" type="button" class="btn btn-primary btn-compact">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Listeye Ekle
              </button>
            </div>

            <div v-if="cart.length > 0" class="cart-preview">
              <h4>Transfer Listesi</h4>
              <div class="cart-items">
                <div v-for="(item, index) in cart" :key="index" class="cart-item">
                  <span class="cart-item-text">{{ item.quantity }} x {{ item.item_name }}</span>
                  <button @click="removeFromCart(index)" class="btn-icon-small">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <button @click="startTransfer" class="btn btn-warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                Transferi Başlat
              </button>
            </div>
            <div v-else class="empty-cart">
              <p>Listeye ürün eklemek için yukarıdaki formu kullanın</p>
            </div>
          </div>
        </div>

        <div v-if="outgoingTransfers.length > 0" class="card">
          <div class="card-header">
            <h3>Bekleyen Gönderimler</h3>
            <span class="card-subtitle">İptal edilebilir sevkiyatlar</span>
          </div>
          <div class="transfer-list">
            <div v-for="t in outgoingTransfers" :key="t.id" class="transfer-card outgoing">
              <div class="transfer-card-content">
                <div class="transfer-card-header">
                  <span class="badge badge-warning">Yolda</span>
                  <span class="transfer-card-target">{{ t.target_name }}</span>
                </div>
                <p class="transfer-card-details">{{ t.quantity }} adet {{ t.item_name }}</p>
              </div>
              <button @click="cancelTransfer(t.id, false)" class="btn btn-error btn-sm">İptal Et</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'incoming'" class="content-single">
        <div class="card">
          <div class="card-header">
            <h3>Onay Bekleyen Sevkiyatlar</h3>
            <span class="card-subtitle">Gelen transferleri onayla</span>
          </div>
          <div v-if="incomingTransfers.length === 0" class="empty-state">
            <div class="empty-state-icon">✅</div>
            <p>Bekleyen sevkiyat yok</p>
          </div>
          <div v-else class="transfer-list">
            <div v-for="t in incomingTransfers" :key="t.id" class="transfer-card incoming">
              <div class="transfer-card-content">
                <div class="transfer-card-header">
                  <span class="badge badge-info">Onay Bekliyor</span>
                  <span class="transfer-card-source">{{ t.source_name }}</span>
                </div>
                <p class="transfer-card-details">{{ t.quantity }} adet {{ t.item_name }}</p>
              </div>
              <div class="transfer-actions">
                <button @click="acceptTransfer(t.id)" class="btn btn-success btn-sm">Kabul Et</button>
                <button @click="cancelTransfer(t.id, true)" class="btn btn-error btn-sm">Reddet</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="toast-fade">
      <div v-if="message" class="toast toast-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        {{ message }}
      </div>
    </transition>

    <transition name="toast-fade">
      <div v-if="errorMsg" class="toast toast-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ errorMsg }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.staff-panel { min-height: 100vh; background: var(--bg-primary); padding: var(--space-6); max-width: 1400px; margin: 0 auto; }
.panel-header { margin-bottom: var(--space-8); }
.header-content { display: flex; align-items: center; justify-content: space-between; padding: var(--space-6); background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); }
.staff-info { display: flex; align-items: center; gap: var(--space-4); }
.avatar { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--primary-700); border-radius: var(--radius-lg); color: white; }
.avatar svg { width: 28px; height: 28px; }
.header-content h1 { font-size: var(--text-2xl); margin: 0; }
.warehouse-id { font-size: var(--text-sm); color: var(--text-tertiary); margin: 0; }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6); }
.mini-stat { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.mini-stat-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); flex-shrink: 0; }
.mini-stat-icon svg { width: 24px; height: 24px; }
.mini-stat-icon.stock { background: rgba(76, 175, 80, 0.1); color: var(--success-light); }
.mini-stat-icon.transit { background: rgba(255, 152, 0, 0.1); color: var(--warning-light); }
.mini-stat-icon.pending { background: rgba(33, 150, 243, 0.1); color: var(--primary-400); }
.mini-stat-label { font-size: var(--text-xs); color: var(--text-tertiary); margin: 0; }
.mini-stat-value { font-size: var(--text-2xl); font-weight: var(--font-bold); margin: 0; }
.tabs-container { display: flex; gap: var(--space-2); padding: var(--space-2); background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); margin-bottom: var(--space-6); overflow-x: auto; }
.tab-btn { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-5); background: transparent; border: none; border-radius: var(--radius-md); color: var(--text-tertiary); font-size: var(--text-sm); font-weight: var(--font-medium); cursor: pointer; transition: all var(--transition-base); position: relative; white-space: nowrap; }
.tab-btn svg { width: 18px; height: 18px; }
.tab-btn.active { background: var(--primary-700); color: white; }
.tab-btn:hover:not(.active) { background: var(--bg-tertiary); color: var(--text-secondary); }
.notification-badge { position: absolute; top: -4px; right: -4px; background: var(--error); color: white; font-size: var(--text-xs); padding: 2px 6px; border-radius: var(--radius-full); font-weight: var(--font-bold); }
.tab-content { min-height: 400px; }
.content-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); }
.content-single { display: flex; flex-direction: column; gap: var(--space-6); }
.card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-lg); }
.card-header { margin-bottom: var(--space-6); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-secondary); }
.card-header h3 { margin: 0 0 var(--space-1) 0; font-size: var(--text-xl); }
.card-subtitle { font-size: var(--text-sm); color: var(--text-tertiary); }
.inventory-grid { display: flex; flex-direction: column; gap: var(--space-3); }
.inventory-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: var(--radius-md); transition: all var(--transition-base); }
.inventory-item:hover { background: var(--bg-elevated); transform: translateX(4px); }
.item-info { display: flex; align-items: center; gap: var(--space-3); }
.item-icon { font-size: var(--text-xl); }
.item-name { font-weight: var(--font-medium); color: var(--text-primary); }
.item-quantity { padding: var(--space-2) var(--space-4); background: var(--primary-700); color: white; border-radius: var(--radius-full); font-weight: var(--font-bold); font-size: var(--text-sm); }
.transfer-grid { display: flex; flex-direction: column; gap: var(--space-3); }
.transfer-item-small { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-left: 3px solid var(--warning); border-radius: var(--radius-md); }
.transfer-info { display: flex; flex-direction: column; gap: var(--space-1); }
.transfer-name { font-weight: var(--font-medium); color: var(--text-primary); }
.transfer-target { font-size: var(--text-sm); color: var(--text-tertiary); }
.transfer-quantity { padding: var(--space-2) var(--space-4); background: var(--warning-dark); color: white; border-radius: var(--radius-full); font-weight: var(--font-bold); font-size: var(--text-sm); }
.form-layout { display: flex; flex-direction: column; gap: var(--space-5); }
.btn-compact { padding: var(--space-2) var(--space-5); font-size: var(--text-sm); }
.btn svg, button svg { 
  width: 20px; 
  height: 20px; 
  margin-right: var(--space-2); 
  vertical-align: middle;
}
.cart-builder { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5); background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: var(--radius-lg); }
.cart-inputs { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4); }
.cart-preview { padding: var(--space-5); background: var(--bg-tertiary); border: 1px dashed var(--border-primary); border-radius: var(--radius-lg); }
.cart-preview h4 { margin: 0 0 var(--space-4) 0; font-size: var(--text-base); color: var(--text-secondary); }
.cart-items { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-5); }
.cart-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md); }
.cart-item-text { font-size: var(--text-sm); color: var(--text-primary); }
.btn-icon-small { width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-primary); border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; transition: all var(--transition-fast); }
.btn-icon-small:hover { background: var(--error); border-color: var(--error); color: white; }
.btn-icon-small svg { width: 14px; height: 14px; }
.empty-cart { padding: var(--space-8); text-align: center; color: var(--text-tertiary); font-size: var(--text-sm); }
.transfer-list { display: flex; flex-direction: column; gap: var(--space-4); }
.transfer-card { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-5); background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: var(--radius-lg); transition: all var(--transition-base); }
.transfer-card:hover { background: var(--bg-elevated); transform: translateX(4px); }
.transfer-card.incoming { border-left: 4px solid var(--info); }
.transfer-card.outgoing { border-left: 4px solid var(--warning); }
.transfer-card-content { flex: 1; }
.transfer-card-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.transfer-card-target, .transfer-card-source { font-weight: var(--font-semibold); color: var(--text-primary); }
.transfer-card-details { font-size: var(--text-sm); color: var(--text-secondary); margin: 0; }
.transfer-actions { display: flex; gap: var(--space-2); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from { opacity: 0; transform: translateY(20px); }
.toast-fade-leave-to { opacity: 0; transform: translateY(-20px); }
.toast { display: flex; align-items: center; gap: var(--space-3); }
.toast svg { width: 20px; height: 20px; flex-shrink: 0; }

@media (max-width: 768px) {
  .staff-panel { padding: var(--space-4); }
  .header-content { flex-direction: column; gap: var(--space-4); }
  .content-grid { grid-template-columns: 1fr; }
  .cart-inputs { grid-template-columns: 1fr; }
  .tabs-container { overflow-x: auto; }
  .transfer-card { flex-direction: column; align-items: stretch; }
  .transfer-actions { width: 100%; }
  .transfer-actions button { flex: 1; }
}
</style>