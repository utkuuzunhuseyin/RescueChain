<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const transactions = ref([])
const activeTrucks = {}
const selectedView = ref('map')
const filterType = ref('all')
const aiNotifications = ref([])
const statsData = ref({
  totalWarehouses: 0,
  activeShipments: 0,
  totalTransactions: 0,
  stockIn: 0,
  transfers: 0
})

let map = null
let warehouseLayer = null
let truckLayer = null

// const API_BASE = 'http://192.168.217.130:5000/api'
const API_BASE = 'http://13.61.179.179:5000/api'

const vanIcon = L.divIcon({ 
  className: 'vehicle-marker van', 
  html: '<div class="vehicle-icon">🚐</div>', 
  iconSize: [60, 60], 
  iconAnchor: [30, 30] 
})

const truckIcon = L.divIcon({ 
  className: 'vehicle-marker truck', 
  html: '<div class="vehicle-icon">🚚</div>', 
  iconSize: [70, 70], 
  iconAnchor: [35, 35] 
})

const trailerIcon = L.divIcon({ 
  className: 'vehicle-marker trailer', 
  html: '<div class="vehicle-icon">🚛</div>', 
  iconSize: [80, 80], 
  iconAnchor: [40, 40] 
})

const createWarehouseIcon = (colorClass) => {
  return L.divIcon({
    className: `warehouse-marker ${colorClass}`,
    html: '<div class="warehouse-pin"><div class="pin-inner"></div></div>',
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  })
}

const filteredTransactions = computed(() => {
  if (filterType.value === 'all') return transactions.value
  return transactions.value.filter(t => t.type === filterType.value)
})

onMounted(async () => {
  if (map) {
    map.remove()
    map = null
  }

  map = L.map('map', {
    zoomControl: false
  }).setView([39.0, 35.0], 6)
  
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(map)

  warehouseLayer = L.layerGroup().addTo(map)
  truckLayer = L.layerGroup().addTo(map)

  await loadMapData()
  startAnimationLoop()
  startAILoop()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

const loadMapData = async () => {
  try {
    if (warehouseLayer) warehouseLayer.clearLayers()

    const wRes = await axios.get(`${API_BASE}/warehouses`)
    
    if (wRes.data && Array.isArray(wRes.data)) {
      statsData.value.totalWarehouses = wRes.data.length
      
      wRes.data.forEach(w => {
        let totalStock = 0
        let popupHtml = `
          <div class="warehouse-popup">
            <h3>${w.name}</h3>
            <p class="warehouse-location">${w.city}</p>
            <div class="inventory-list">
        `
        
        if(w.inventory && w.inventory.length > 0) {
          w.inventory.forEach(i => { 
            const qty = parseInt(i.quantity) || 0
            totalStock += qty 
            popupHtml += `
              <div class="inventory-item">
                <span>${i.item_name}</span>
                <strong>${qty}</strong>
              </div>
            `
          })
        } else { 
          popupHtml += '<p class="empty-inventory">Depo Boş</p>' 
        }
        
        popupHtml += `
            </div>
            <div class="total-stock">
              <span>Toplam Stok</span>
              <strong>${totalStock}</strong>
            </div>
          </div>
        `

        let colorClass = 'blue'
        if (totalStock < 1000) colorClass = 'red'
        else if (totalStock > 5000) colorClass = 'green'

        L.marker([w.latitude, w.longitude], { 
          icon: createWarehouseIcon(colorClass),
          zIndexOffset: 1000 
        }).addTo(warehouseLayer).bindPopup(popupHtml, {
          maxWidth: 300,
          className: 'custom-popup'
        })
      })
    }

    const tRes = await axios.get(`${API_BASE}/transactions`)
    transactions.value = tRes.data
    
    statsData.value.totalTransactions = tRes.data.length
    statsData.value.stockIn = tRes.data.filter(t => t.type === 'STOCK_IN').length
    statsData.value.transfers = tRes.data.filter(t => t.type === 'TRANSFER').length

    const sRes = await axios.get(`${API_BASE}/map/active-shipments`)
    if (sRes.data && Array.isArray(sRes.data)) {
      statsData.value.activeShipments = sRes.data.length
      sRes.data.forEach(shipment => drawRouteAndTruck(shipment))
    }

  } catch (e) {
    console.error("Veri Hatası:", e)
  }
}

const drawRouteAndTruck = (transfer) => {
  if (activeTrucks[transfer.id]) return

  const router = L.Routing.control({
    waypoints: [
      L.latLng(transfer.source_lat, transfer.source_lng),
      L.latLng(transfer.target_lat, transfer.target_lng)
    ],
    router: L.Routing.osrmv1({ 
      serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1' 
    }),
    lineOptions: {
      styles: [{ color: '#e67e22', opacity: 0.8, weight: 6 }],
      interactive: false,
      addWaypoints: false
    },
    show: false, 
    addWaypoints: false, 
    fitSelectedRoutes: false
  }).addTo(map)

  router.on('routesfound', function(e) {
    const coordinates = e.routes[0].coordinates 
    
    let selectedIcon = truckIcon
    let vehicleType = 'Standart Kamyon'

    if (transfer.vehicle_type === 'VAN') {
      selectedIcon = vanIcon
      vehicleType = 'Hafif Araç'
    } else if (transfer.vehicle_type === 'TRAILER') {
      selectedIcon = trailerIcon
      vehicleType = 'Ağır Nakliye'
    }

    const marker = L.marker([transfer.source_lat, transfer.source_lng], { icon: selectedIcon })
      .addTo(truckLayer)
      .bindPopup(`
        <div class="shipment-popup">
          <div class="shipment-header">
            <span class="vehicle-type">${vehicleType}</span>
          </div>
          <p class="shipment-summary">${transfer.summary}</p>
          <div class="shipment-weight">
            <strong>${transfer.total_weight} kg</strong>
          </div>
        </div>
      `, {
        className: 'custom-popup'
      })

    activeTrucks[transfer.id] = {
      marker: marker,
      path: coordinates,
      startTime: new Date(transfer.created_at).getTime(),
      duration: 60000 
    }
  })
}

const startAnimationLoop = () => {
  setInterval(() => {
    const now = Date.now()
    Object.keys(activeTrucks).forEach(id => {
      const truck = activeTrucks[id]
      let diff = now - truck.startTime
      let elapsed = diff % truck.duration
      if (elapsed < 0) elapsed += truck.duration
      const progress = elapsed / truck.duration
      const currentIndex = Math.floor(progress * truck.path.length)
      if (truck.path[currentIndex]) {
        truck.marker.setLatLng([
          truck.path[currentIndex].lat, 
          truck.path[currentIndex].lng
        ])
      }
    })
  }, 100)
}

const startAILoop = () => {
  setInterval(async () => {
    try {
      const res = await axios.post(`${API_BASE}/ai/trigger-emergency`)
      if (res.data.logs && res.data.logs.length > 0) {
        loadMapData()
        res.data.logs.forEach(log => {
          const notificationId = Date.now() + Math.random()
          aiNotifications.value.push({
            id: notificationId,
            message: log
          })  
          setTimeout(() => {
            aiNotifications.value = aiNotifications.value.filter(n => n.id !== notificationId)
          }, 10000)
        })    
      }
    } catch (e) {
      console.error("AI Sistemi Hatası:", e)
    }
  }, 10000)
}

const getTransactionIcon = (type) => {
  if (type === 'STOCK_IN') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    </svg>`
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>`
}
</script>

<template>
  <div class="admin-panel">
    <header class="panel-header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo-section">
            <svg class="logo" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="20" width="48" height="36" rx="4" stroke="currentColor" stroke-width="3"/>
              <path d="M16 28h32M16 36h24M16 44h28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <circle cx="32" cy="12" r="6" fill="currentColor"/>
            </svg>
            <div>
              <h1>Komuta Kontrol Merkezi</h1>
              <p class="header-subtitle">Gerçek Zamanlı İzleme</p>
            </div>
          </div>
        </div>
        
        <div class="header-right">
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            <span>CANLI</span>
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
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon warehouse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Toplam Depo</p>
          <h3 class="stat-value">{{ statsData.totalWarehouses }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Aktif Sevkiyat</p>
          <h3 class="stat-value">{{ statsData.activeShipments }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8"/>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Stok Girişi</p>
          <h3 class="stat-value">{{ statsData.stockIn }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon transfer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Transfer</p>
          <h3 class="stat-value">{{ statsData.transfers }}</h3>
        </div>
      </div>
    </div>

    <div class="view-toggle">
      <button 
        :class="['toggle-btn', { active: selectedView === 'map' }]"
        @click="selectedView = 'map'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        </svg>
        Harita Görünümü
      </button>
      <button 
        :class="['toggle-btn', { active: selectedView === 'logs' }]"
        @click="selectedView = 'logs'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
        </svg>
        Operasyon Günlüğü
      </button>
    </div>

    <div v-show="selectedView === 'map'" class="map-container">
      <div id="map" class="map-view"></div>
    </div>

    <div v-show="selectedView === 'logs'" class="logs-container">
      <div class="logs-header">
        <h2>Operasyon Günlüğü</h2>
        <div class="filter-buttons">
          <button 
            :class="['filter-btn', { active: filterType === 'all' }]"
            @click="filterType = 'all'"
          >
            Tümü ({{ transactions.length }})
          </button>
          <button 
            :class="['filter-btn', { active: filterType === 'STOCK_IN' }]"
            @click="filterType = 'STOCK_IN'"
          >
            Giriş ({{ statsData.stockIn }})
          </button>
          <button 
            :class="['filter-btn', { active: filterType === 'TRANSFER' }]"
            @click="filterType = 'TRANSFER'"
          >
            Transfer ({{ statsData.transfers }})
          </button>
        </div>
      </div>

      <div class="transactions-list">
        <div 
          v-for="t in filteredTransactions" 
          :key="t.id" 
          class="transaction-card"
        >
          <div class="transaction-icon" v-html="getTransactionIcon(t.type)"></div>
          <div class="transaction-content">
            <div class="transaction-header">
              <div class="transaction-badges">
                <span :class="['badge', t.type === 'STOCK_IN' ? 'badge-success' : 'badge-warning']">
                  {{ t.type === 'STOCK_IN' ? 'Giriş' : 'Transfer' }}
                </span>
                <span v-if="t.type === 'TRANSFER'" :class="['badge', 'badge-' + (t.status === 'PENDING' ? 'warning' : t.status === 'COMPLETED' ? 'success' : 'error')]">
                  {{ t.status === 'PENDING' ? 'Bekliyor' : t.status === 'COMPLETED' ? 'Tamamlandı' : 'İptal' }}
                </span>
              </div>
              <span class="transaction-time">
                {{ new Date(t.created_at).toLocaleString('tr-TR', { 
                  day: '2-digit', 
                  month: 'short', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) }}
              </span>
            </div>
            <p class="transaction-description">
              <strong>{{ t.user_name }}</strong>
              <span v-if="t.type === 'STOCK_IN'">
                {{ t.source_name }} deposuna <strong>{{ t.quantity }} {{ t.item_name }}</strong> girişi
              </span>
              <span v-else>
                {{ t.target_name }} deposuna <strong>{{ t.quantity }} {{ t.item_name }}</strong> transferi
              </span>
            </p>
          </div>
        </div>

        <div v-if="filteredTransactions.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>Henüz kayıt yok</p>
        </div>
      </div>
    </div>

    <!-- AI Emergency Notifications -->
    <transition-group name="notification-slide" tag="div" class="ai-notifications">
      <div 
        v-for="notification in aiNotifications" 
        :key="notification.id"
        class="ai-notification"
      >
        <div class="ai-notification-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="ai-notification-content">
          <strong>Otonom Sistem Aktif</strong>
          <p>{{ notification.message }}</p>
        </div>
        <button @click="aiNotifications = aiNotifications.filter(n => n.id !== notification.id)" class="ai-notification-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: var(--space-6);
}

.panel-header {
  margin-bottom: var(--space-8);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.logo {
  width: 48px;
  height: 48px;
  color: var(--primary-400);
}

.header-content h1 {
  font-size: var(--text-2xl);
  margin: 0;
}

.header-subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(239, 83, 80, 0.1);
  border: 1px solid var(--error);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--error-light);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--error-light);
  border-radius: 50%;
  animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
}

.stat-icon.warehouse { background: rgba(33, 150, 243, 0.1); color: var(--primary-400); }
.stat-icon.active { background: rgba(255, 152, 0, 0.1); color: var(--warning-light); }
.stat-icon.stock { background: rgba(76, 175, 80, 0.1); color: var(--success-light); }
.stat-icon.transfer { background: rgba(156, 39, 176, 0.1); color: #ab47bc; }

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0 0 var(--space-1) 0;
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  width: fit-content;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.toggle-btn svg {
  width: 18px;
  height: 18px;
}

.toggle-btn.active {
  background: var(--primary-700);
  color: white;
}

.map-container {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-primary);
}

.map-view {
  height: 600px;
  width: 100%;
}

.logs-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-secondary);
}

.logs-header h2 {
  margin: 0;
}

.filter-buttons {
  display: flex;
  gap: var(--space-2);
}

.filter-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn.active {
  background: var(--primary-700);
  color: white;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 600px;
  overflow-y: auto;
}

.transaction-card {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.transaction-card:hover {
  background: var(--bg-elevated);
  transform: translateX(4px);
}

.transaction-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--primary-400);
  flex-shrink: 0;
}

.transaction-icon svg {
  width: 20px;
  height: 20px;
}

.transaction-content {
  flex: 1;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  gap: var(--space-3);
}

.transaction-badges {
  display: flex;
  gap: var(--space-2);
}

.transaction-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.transaction-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

:deep(.vehicle-marker) {
  background: transparent;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  font-size: 30px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  
  width: 100%;
  height: 100%;
}

:deep(.warehouse-marker .warehouse-pin) {
  width: 50px;
  height: 50px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 3px solid white;
  box-shadow: 0 8px 15px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.warehouse-marker .pin-inner) {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transform: rotate(45deg);
}

:deep(.warehouse-marker.blue .warehouse-pin) { background: #3498db; }
:deep(.warehouse-marker.green .warehouse-pin) { background: #2ecc71; }
:deep(.warehouse-marker.red .warehouse-pin) { 
  background: #e74c3c;
  animation: pulse-pin 2s infinite;
}

@keyframes pulse-pin {
  0%, 100% { transform: rotate(-45deg) scale(1); }
  50% { transform: rotate(-45deg) scale(1.15); }
}

:deep(.leaflet-popup-content-wrapper) {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

:deep(.warehouse-popup h3) {
  margin: 0 0 var(--space-2) 0;
  color: var(--text-primary);
}

:deep(.inventory-item) {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-secondary);
}

/* AI Notifications */
.ai-notifications {
  position: fixed;
  top: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-tooltip);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 420px;
}

.ai-notification {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border: 2px solid #ff6b6b;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl), 0 0 30px rgba(231, 76, 60, 0.4);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: var(--shadow-2xl), 0 0 20px rgba(231, 76, 60, 0.4); }
  50% { box-shadow: var(--shadow-2xl), 0 0 40px rgba(231, 76, 60, 0.6); }
}

.ai-notification-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  color: white;
}

.ai-notification-icon svg {
  width: 28px;
  height: 28px;
}

.ai-notification-content {
  flex: 1;
  color: white;
}

.ai-notification-content strong {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-1);
}

.ai-notification-content p {
  font-size: var(--text-sm);
  margin: 0;
  line-height: var(--leading-relaxed);
  color: rgba(255, 255, 255, 0.95);
}

.ai-notification-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.ai-notification-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.ai-notification-close svg {
  width: 16px;
  height: 16px;
}

.notification-slide-enter-active {
  animation: slideInRight 0.5s ease-out;
}

.notification-slide-leave-active {
  animation: slideOutRight 0.5s ease-in;
}

@keyframes slideInRight {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .admin-panel {
    padding: var(--space-4);
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .ai-notifications {
    top: var(--space-4);
    right: var(--space-4);
    left: var(--space-4);
    max-width: none;
  }
}
</style>