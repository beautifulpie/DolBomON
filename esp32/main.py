# main.py (MicroPython)
import time, machine
from umqtt.simple import MQTTClient

MQTT_HOST = "192.168.0.10"   # 허브 IP
CLIENT_ID = "esp32_room1"
TOPIC_BASE = b"dolbomon/sensor/room1"

pir = machine.Pin(14, machine.Pin.IN)          # PIR
gas = machine.ADC(machine.Pin(34))             # 가스 센서
button = machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP)  # 비상버튼

def sub_cb(topic, msg):
    # 예: 조명 명령 수신 시 릴레이 제어 등
    print("CMD:", topic, msg)

c = MQTTClient(CLIENT_ID, MQTT_HOST)
c.set_callback(sub_cb)
c.connect()
c.subscribe(b"dolbomon/cmd/room1")

last_pir = 0
while True:
    # PIR 변화 감지
    v = pir.value()
    if v != last_pir:
        c.publish(TOPIC_BASE + b"/motion", b"1" if v else b"0")
        last_pir = v
    # 가스 센서 간이 임계값
    gv = gas.read()
    if gv > 2000:
        c.publish(TOPIC_BASE + b"/gas", b"ALERT:" + str(gv).encode())
    # 비상 버튼
    if button.value() == 0:
        c.publish(TOPIC_BASE + b"/fall", b"ALERT:BUTTON")
        time.sleep(0.5)
    c.check_msg()
    time.sleep(0.2)