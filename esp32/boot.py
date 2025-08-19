# boot.py (MicroPython)
import network, time
ssid = 'YOUR_WIFI'
pw = 'YOUR_PASS'
wlan = network.WLAN(network.STA_IF); wlan.active(True); wlan.connect(ssid, pw)
while not wlan.isconnected(): time.sleep(0.5)
print('WiFi OK:', wlan.ifconfig())