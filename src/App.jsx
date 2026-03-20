import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'

const MQTT_SCRIPT_ID = 'mqtt-browser-script'
const MQTT_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js'

const STORAGE_KEYS = {
  devices: 'stark-shadcn-devices',
  connections: 'stark-shadcn-connections',
  activeConnection: 'stark-shadcn-active-connection',
}

const iconLibrary = {
  bulb: {
    label: 'Bulb',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18h6M10 21h4M8 10a4 4 0 1 1 8 0c0 1.8-.78 2.92-1.75 4.02-.66.74-1.25 1.44-1.25 2.48h-2c0-1.04-.59-1.74-1.25-2.48C8.78 12.92 8 11.8 8 10Z" />
      </svg>
    ),
  },
  fan: {
    label: 'Fan',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12m-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0" />
        <path d="M11.7 4.2c1.9 0 3 2.3 2 4l-1.3 2.2" />
        <path d="M19.8 11.7c0 1.9-2.3 3-4 2l-2.2-1.3" />
        <path d="M12.3 19.8c-1.9 0-3-2.3-2-4l1.3-2.2" />
        <path d="M4.2 12.3c0-1.9 2.3-3 4-2l2.2 1.3" />
      </svg>
    ),
  },
  tv: {
    label: 'Display',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  shower: {
    label: 'Geyser',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h4a5 5 0 0 1 5 5v1" />
        <path d="M17 11h2" />
        <path d="M19 11v4" />
        <path d="M15 11c0 1.2-.8 2.4-2.3 3.5" />
        <path d="M10 16v1" />
        <path d="M13 17v1" />
        <path d="M16 16v1" />
      </svg>
    ),
  },
  plug: {
    label: 'Plug',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7v5M16 7v5" />
        <path d="M7 12h10v2a5 5 0 0 1-5 5a5 5 0 0 1-5-5v-2Z" />
      </svg>
    ),
  },
  snow: {
    label: 'AC',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18M8.5 5l7 14M15.5 5l-7 14M4 8h16M4 16h16" />
      </svg>
    ),
  },
}

const defaultDevices = [
  { id: 1, room: 'Living Room', name: 'Main Light', icon: 'bulb', color: '#f5f5f5', active: false },
  { id: 2, room: 'Bedroom', name: 'Ceiling Fan', icon: 'fan', color: '#d4d4d8', active: false },
  { id: 3, room: 'Hall', name: 'Smart Display', icon: 'tv', color: '#e5e7eb', active: false },
  { id: 4, room: 'Bathroom', name: 'Water Heater', icon: 'shower', color: '#cbd5e1', active: false },
]

const defaultConnections = [
  {
    id: 'default-hivemq',
    name: 'Public HiveMQ',
    deviceId: 'ESP32_ABCD1234',
    broker: 'broker.hivemq.com',
    port: '8884',
    username: '',
  },
]

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function DeviceIcon({ icon }) {
  return iconLibrary[icon]?.svg ?? iconLibrary.bulb.svg
}

function maskSecret(value) {
  if (!value) return '••••••'
  return '•'.repeat(Math.max(6, String(value).length))
}

function formatMaskedConnection(connection) {
  if (!connection) return ''
  return ''
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [devices, setDevices] = useState(() => {
    const loaded = safeRead(STORAGE_KEYS.devices, defaultDevices)
    return Array.isArray(loaded) && loaded.length ? loaded : defaultDevices
  })
  const [connections, setConnections] = useState(() => {
    const loaded = safeRead(STORAGE_KEYS.connections, defaultConnections)
    return Array.isArray(loaded) && loaded.length ? loaded : defaultConnections
  })
  const [activeConnectionId, setActiveConnectionId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.activeConnection) || defaultConnections[0].id,
  )
  const [editingDeviceId, setEditingDeviceId] = useState(null)
  const [editingConnectionId, setEditingConnectionId] = useState(null)
  const [mqttReady, setMqttReady] = useState(Boolean(window.mqtt))
  const [connectionState, setConnectionState] = useState('idle')
  const [connectionLabel, setConnectionLabel] = useState('Not connected')
  const [pirState, setPirState] = useState(false)
  const [logs, setLogs] = useState([
    {
      id: crypto.randomUUID(),
      type: 'sys',
      time: new Date().toLocaleTimeString('en-GB'),
      message: 'A.R.J.U.N.V.I.S reset with a new UI foundation.',
    },
  ])
  const [form, setForm] = useState({
    name: '',
    deviceId: '',
    broker: 'broker.hivemq.com',
    port: '8884',
    username: '',
  })

  const clientRef = useRef(null)
  const baseTopicRef = useRef('')

  const addLog = useCallback((type, message) => {
    const entry = {
      id: crypto.randomUUID(),
      type,
      time: new Date().toLocaleTimeString('en-GB'),
      message,
    }
    setLogs((current) => [...current.slice(-299), entry])
  }, [])

  const handleReady = useCallback(() => {
    setMqttReady(true)
    addLog('sys', 'MQTT client loaded in browser')
  }, [addLog])

  const disconnectClient = useCallback((logIt = true) => {
    const client = clientRef.current
    if (client) {
      try {
        client.end(true)
      } catch {
        addLog('err', 'Failed to close MQTT client cleanly')
      }
      clientRef.current = null
    }

    setConnectionState('idle')
    setConnectionLabel('Not connected')
    if (logIt) addLog('sys', 'Disconnected')
  }, [addLog])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.devices, JSON.stringify(devices))
  }, [devices])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.connections, JSON.stringify(connections))
  }, [connections])

  useEffect(() => {
    if (activeConnectionId) {
      localStorage.setItem(STORAGE_KEYS.activeConnection, activeConnectionId)
    }
  }, [activeConnectionId])

  useEffect(() => {
    if (window.mqtt) return undefined

    const existing = document.getElementById(MQTT_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', handleReady)
      return () => existing.removeEventListener('load', handleReady)
    }

    const script = document.createElement('script')
    script.id = MQTT_SCRIPT_ID
    script.src = MQTT_SCRIPT_SRC
    script.async = true
    script.addEventListener('load', handleReady)
    document.body.appendChild(script)

    return () => script.removeEventListener('load', handleReady)
  }, [handleReady])

  useEffect(() => () => disconnectClient(false), [disconnectClient])

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
    [connections, activeConnectionId],
  )

  const editingDevice = useMemo(
    () => devices.find((device) => device.id === editingDeviceId) ?? null,
    [devices, editingDeviceId],
  )

  function setDevicePatch(id, patch) {
    setDevices((current) =>
      current.map((device) => (device.id === id ? { ...device, ...patch } : device)),
    )
  }

  function publish(topic, payload) {
    const client = clientRef.current
    if (!client || !client.connected) {
      addLog('err', 'Not connected')
      return false
    }

    client.publish(topic, payload, { retain: true })
    addLog('pub', `-> [${topic.replace(`${baseTopicRef.current}/`, '')}] ${payload}`)
    return true
  }

  function toggleDevice(id) {
    const device = devices.find((item) => item.id === id)
    if (!device) return

    const next = !device.active
    setDevicePatch(id, { active: next })
    if (!publish(`${baseTopicRef.current}/relay/${id}`, next ? 'ON' : 'OFF')) {
      setDevicePatch(id, { active: device.active })
    }
  }

  function togglePir() {
    const next = !pirState
    setPirState(next)
    if (!publish(`${baseTopicRef.current}/pir`, next ? 'ON' : 'OFF')) {
      setPirState(!next)
    }
  }

  function allOff() {
    devices.forEach((device) => {
      if (device.active) {
        setDevicePatch(device.id, { active: false })
        publish(`${baseTopicRef.current}/relay/${device.id}`, 'OFF')
      }
    })
  }

  function refreshStates() {
    const client = clientRef.current
    if (!client || !client.connected) {
      addLog('err', 'Not connected - connect first')
      return
    }

    addLog('sys', 'Refreshing retained states')
    client.unsubscribe(`${baseTopicRef.current}/#`, () => {
      client.subscribe(`${baseTopicRef.current}/#`, () => {
        addLog('sys', 'Refresh complete')
      })
    })
  }

  function connectClient() {
    if (!activeConnection) {
      setActiveTab('connections')
      return
    }
    if (!mqttReady || !window.mqtt) {
      addLog('err', 'MQTT library not loaded yet')
      return
    }

    disconnectClient(false)

    baseTopicRef.current = `home/${activeConnection.deviceId}`
    setConnectionState('connecting')
    setConnectionLabel('Connecting')

    const securePort = activeConnection.port === '8884' || activeConnection.port === '8883'
    const securePage = window.location.protocol === 'https:'
    const protocol = securePort || securePage ? 'wss' : 'ws'
    const url = `${protocol}://${activeConnection.broker}:${activeConnection.port}/mqtt`

    addLog('sys', `Connecting to ${url}`)

    const options = {
      clientId: `stark_${crypto.randomUUID()}`,
      clean: true,
      reconnectPeriod: 0,
      connectTimeout: 12000,
    }

    if (activeConnection.username) options.username = activeConnection.username

    const client = window.mqtt.connect(url, options)
    clientRef.current = client

    client.on('connect', () => {
      setConnectionState('connected')
      setConnectionLabel('Connected')
      addLog('sys', `Subscribed to ${baseTopicRef.current}/#`)
      client.subscribe(`${baseTopicRef.current}/#`, (error) => {
        if (error) addLog('err', `Subscribe error: ${error.message}`)
      })
    })

    client.on('message', (topic, payload) => {
      const message = payload.toString().trim()
      addLog('sub', `<- [${topic.replace(`${baseTopicRef.current}/`, '')}] ${message}`)

      if (topic === `${baseTopicRef.current}/pir`) {
        setPirState(message === 'ON')
      }

      const relayMatch = topic.match(/\/relay\/(\d+)$/)
      if (relayMatch) {
        const relayId = Number(relayMatch[1])
        setDevicePatch(relayId, { active: message === 'ON' })
      }
    })

    client.on('error', (error) => {
      setConnectionState('error')
      setConnectionLabel('Error')
      addLog('err', error.message)
    })

    client.on('close', () => {
      setConnectionState('idle')
      setConnectionLabel('Disconnected')
      addLog('sys', 'Connection closed')
    })
  }

  function handleConnectionSubmit(event) {
    event.preventDefault()

    if (!form.name || !form.deviceId || !form.broker || !form.port) {
      addLog('err', 'Fill Name, Device ID, Broker and Port')
      return
    }

    if (editingConnectionId) {
      setConnections((current) =>
        current.map((connection) =>
          connection.id === editingConnectionId ? { ...connection, ...form } : connection,
        ),
      )
      addLog('sys', `Connection updated: ${form.name}`)
    } else {
      const id = `conn-${crypto.randomUUID()}`
      setConnections((current) => [...current, { id, ...form }])
      setActiveConnectionId(id)
      addLog('sys', `Connection saved: ${form.name}`)
    }

    resetForm()
  }

  function resetForm() {
    setEditingConnectionId(null)
    setForm({
      name: '',
      deviceId: '',
      broker: 'broker.hivemq.com',
      port: '8884',
      username: '',
    })
  }

  function startEditConnection(connection) {
    setEditingConnectionId(connection.id)
    setForm({
      name: connection.name,
      deviceId: connection.deviceId,
      broker: connection.broker,
      port: connection.port,
      username: connection.username,
    })
  }

  function deleteConnection(id) {
    const remaining = connections.filter((connection) => connection.id !== id)
    setConnections(remaining)
    if (activeConnectionId === id) setActiveConnectionId(remaining[0]?.id ?? '')
    if (editingConnectionId === id) resetForm()
    addLog('sys', 'Connection deleted')
  }

  return (
    <main className="shell">
      <div className="shell__glow shell__glow--one" aria-hidden="true" />
      <div className="shell__glow shell__glow--two" aria-hidden="true" />

      <div className="app-frame">
        <Card className="hero">
          <CardHeader className="hero__header">
            <div className="hero__brand">
              <CardTitle className="hero__title">syncHome</CardTitle>
              <CardDescription className="hero__tagline">
                Let us make your home smart like never before
              </CardDescription>
            </div>

            <div className="hero__stats">
              <Card className="metric">
                <CardHeader className="metric__header">
                  {connectionState === 'connected' ? (
                    <span className="status-dot" aria-hidden="true" />
                  ) : null}
                  <CardDescription className="metric__label">Status</CardDescription>
                  <CardTitle className="metric__value">{connectionLabel}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </CardHeader>
        </Card>

        <Tabs>
          <TabsList>
            <TabsTrigger active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              Dashboard
            </TabsTrigger>
            <TabsTrigger active={activeTab === 'connections'} onClick={() => setActiveTab('connections')}>
              Connections
            </TabsTrigger>
            <TabsTrigger active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
              Log
            </TabsTrigger>
          </TabsList>

          <TabsContent hidden={activeTab !== 'dashboard'}>
            <div className="layout-stack">
              <Card>
                <CardHeader className="split-row">
                  <div>
                    <Badge variant="secondary">Current Broker</Badge>
                    <CardTitle>{activeConnection?.name ?? 'No connection selected'}</CardTitle>
                    {activeConnection ? null : (
                      <CardDescription>Go to Connections and select a broker profile.</CardDescription>
                    )}
                  </div>

                  <div className="action-row">
                    <Button variant="secondary" onClick={() => setActiveTab('connections')}>
                      Change
                    </Button>
                    <Button
                      variant={connectionState === 'connected' ? 'destructive' : 'default'}
                      onClick={() =>
                        connectionState === 'connected' ? disconnectClient() : connectClient()
                      }
                    >
                      {connectionState === 'connected' ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="split-row split-row--panel">
                <div>
                  <h2 className="section-title">Home Controls</h2>
                </div>
                <div className="action-row">
                  <Button variant="secondary" onClick={refreshStates}>
                    Refresh
                  </Button>
                  <Button variant="secondary" onClick={allOff}>
                    All Off
                  </Button>
                </div>
              </div>

              <div className="device-grid">
                {devices.map((device) => (
                  <Card
                    key={device.id}
                    className={`device-tile ${device.active ? 'is-active' : ''}`}
                    style={{ '--device-glow': device.color }}
                    onClick={() => toggleDevice(device.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()

                        toggleDevice(device.id)
                      }
                    }}
                  >
                    <CardHeader className="device-tile__header">
                      <div className="device-tile__icon">
                        <DeviceIcon icon={device.icon} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="device-tile__edit"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingDeviceId(device.id)
                        }}
                        aria-label={`Edit ${device.room} ${device.name}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </Button>
                    </CardHeader>

                    <CardContent className="device-tile__body">
                      <Badge variant="outline">{device.room}</Badge>
                      <CardTitle>{device.name}</CardTitle>

                      <div className="device-tile__footer">
                        <Badge variant={device.active ? 'success' : 'secondary'}>
                          {device.active ? 'On' : 'Off'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className={`automation ${pirState ? 'is-active' : ''}`}>
                <CardHeader className="split-row">
                  <div>
                    <Badge variant="outline">Automation</Badge>
                    <CardTitle>PIR Motion Sensor</CardTitle>
                  </div>
                  <Button
                    variant={pirState ? 'default' : 'secondary'}
                    onClick={togglePir}
                  >
                    {pirState ? 'Disable PIR' : 'Enable PIR'}
                  </Button>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent hidden={activeTab !== 'connections'}>
            <div className="layout-stack">
              <Card>
                <CardHeader>
                  <Badge variant="outline">Broker Profiles</Badge>
                  <CardTitle>Connections</CardTitle>
                  <CardDescription>
                    Save MQTT broker details and switch between profiles from the website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="form-grid" onSubmit={handleConnectionSubmit}>
                    <label className="field">
                      <span>Name</span>
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="My ESP32 Home"
                      />
                    </label>

                    <label className="field">
                      <span>Device ID</span>
                      <Input
                        value={form.deviceId}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, deviceId: event.target.value }))
                        }
                        placeholder="ESP32_ABCD1234"
                      />
                    </label>

                    <label className="field">
                      <span>Broker</span>
                      <Input
                        value={form.broker}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, broker: event.target.value }))
                        }
                        placeholder="broker.hivemq.com"
                      />
                    </label>

                    <label className="field">
                      <span>Port</span>
                      <Input
                        value={form.port}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, port: event.target.value }))
                        }
                        placeholder="8884"
                      />
                    </label>

                    <label className="field field--wide">
                      <span>Username</span>
                      <Input
                        value={form.username}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, username: event.target.value }))
                        }
                        placeholder="optional"
                      />
                    </label>

                    <div className="action-row action-row--form">
                      <Button type="submit">
                        {editingConnectionId ? 'Update Connection' : 'Save Connection'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="connection-list">
                {connections.map((connection) => {
                  const selected = connection.id === activeConnectionId
                  return (
                    <Card key={connection.id} className={selected ? 'connection-item is-selected' : 'connection-item'}>
                      <CardHeader className="split-row">
                        <div>
                          <Badge variant={selected ? 'success' : 'outline'}>
                            {selected ? 'Active' : 'Saved'}
                          </Badge>
                          <CardTitle>{connection.name}</CardTitle>
                        </div>

                        <div className="action-row">
                          <Button variant="secondary" onClick={() => setActiveConnectionId(connection.id)}>
                            Use
                          </Button>
                          <Button variant="secondary" onClick={() => startEditConnection(connection)}>
                            Edit
                          </Button>
                          <Button variant="destructive" onClick={() => deleteConnection(connection.id)}>
                            Delete
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent hidden={activeTab !== 'log'}>
            <Card className="log-card">
              <CardHeader className="split-row">
                <div>
                  <Badge variant="outline">Live Activity</Badge>
                  <CardTitle>MQTT Log</CardTitle>
                  <CardDescription>
                    Publish, subscribe, connection, and system events.
                  </CardDescription>
                </div>
                <Button variant="secondary" onClick={() => setLogs([])}>
                  Clear
                </Button>
              </CardHeader>

              <CardContent className="log-feed">
                {logs.length ? (
                  logs.map((entry) => (
                    <div key={entry.id} className="log-entry">
                      <span className="log-entry__time">{entry.time}</span>
                      <span className={`log-entry__message is-${entry.type}`}>{entry.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="log-entry">
                    <span className="log-entry__time">--:--:--</span>
                    <span className="log-entry__message is-sys">No activity yet</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="footer">
          <span className="footer__credit">Made by Arjun Purwar</span>
          <a
            className="footer__link"
            href="https://www.linkedin.com/in/arjun-purwar-9b035a2a7?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
            target="_blank"
            rel="noreferrer"
            aria-label="Arjun Purwar LinkedIn Profile"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.94 8.5V19" />
              <path d="M6.94 5.75a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5Z" />
              <path d="M11.5 19v-5.25a2.75 2.75 0 0 1 5.5 0V19" />
              <path d="M11.5 11.25V19" />
            </svg>
          </a>
        </footer>
      </div>

      <Dialog open={Boolean(editingDevice)}>
        <DialogOverlay onClick={() => setEditingDeviceId(null)} />
        <DialogContent>
          {editingDevice ? (
            <>
              <DialogHeader>
                <div>
                  <Badge variant="outline">Device Editor</Badge>
                  <DialogTitle>Edit Appliance Tile</DialogTitle>
                  <DialogDescription>
                    Update the room, device name, icon, and tile glow color.
                  </DialogDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingDeviceId(null)}>
                  Close
                </Button>
              </DialogHeader>

              <div className="form-grid">
                <label className="field">
                  <span>Room / Place</span>
                  <Input
                    value={editingDevice.room}
                    onChange={(event) =>
                      setDevicePatch(editingDevice.id, { room: event.target.value })
                    }
                  />
                </label>

                <label className="field">
                  <span>Appliance Name</span>
                  <Input
                    value={editingDevice.name}
                    onChange={(event) =>
                      setDevicePatch(editingDevice.id, { name: event.target.value })
                    }
                  />
                </label>

                <label className="field field--wide">
                  <span>Accent Color</span>
                  <div className="color-field">
                    <Input
                      type="color"
                      value={editingDevice.color}
                      onChange={(event) =>
                        setDevicePatch(editingDevice.id, { color: event.target.value })
                      }
                    />
                    <code>{editingDevice.color}</code>
                  </div>
                </label>
              </div>

              <div className="icon-picker">
                {Object.entries(iconLibrary).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`icon-choice ${editingDevice.icon === key ? 'is-selected' : ''}`}
                    onClick={() => setDevicePatch(editingDevice.id, { icon: key })}
                  >
                    {value.svg}
                    <span>{value.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default App
