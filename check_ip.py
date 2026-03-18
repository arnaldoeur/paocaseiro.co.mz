import socket
import subprocess

with open("my_ip.txt", "w") as f:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        f.write(ip)
    except Exception as e:
        f.write("localhost")
