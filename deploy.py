import paramiko
import os

hostname = '51.89.97.76'
username = 'ardv2030'
password = 'smetgvqd3hozupxcfka#'

print(f"Connecting to {hostname}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password)

print("Opening SFTP...")
sftp = client.open_sftp()

print("Uploading frontend.zip...")
sftp.put('frontend.zip', '/ardv2030/frontend.zip')

print("Uploading backend.zip...")
sftp.put('backend.zip', '/ardv2030/backend.zip')

sftp.close()

print("Extracting frontend.zip into /ardv2030/wwwroot...")
stdin, stdout, stderr = client.exec_command('cd /ardv2030 && unzip -o frontend.zip -d wwwroot')
print(stdout.read().decode())
print(stderr.read().decode())

print("Finding backend directory...")
# We need to know where the backend is. It might be in /ardv2030/data or some other folder. Let's see the structure first.
stdin, stdout, stderr = client.exec_command('ls -la /ardv2030')
print("Listing of /ardv2030:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command('ps aux | grep uvicorn')
print("Running python processes:")
print(stdout.read().decode())

client.close()
