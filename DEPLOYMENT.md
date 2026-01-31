# SpendWisely Deployment (From Scratch)

This guide deploys the app on a brand‑new machine using Docker. It includes all required packages, environment variables, database setup, and HTTPS.

---

## 1) Provision a VM
Any Ubuntu 22.04+ VM works (DigitalOcean, Linode, AWS, etc.).

**Minimum recommended:**
- 1 vCPU
- 1 GB RAM
- 20 GB disk

**Open ports:**
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)

---

## 2) Install required packages
SSH into the VM and run:

```
sudo apt update
sudo apt install -y \
  ca-certificates \
  curl \
  git \
  gnupg \
  lsb-release
```

### Install Docker Engine
```
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Optional (so you can run docker without sudo):
```
sudo usermod -aG docker $USER
newgrp docker
```

### (Optional) Firewall
```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### (Optional) Set timezone (recommended for monthly summary timing)
```
sudo timedatectl set-timezone Australia/Melbourne
```

---

## 3) Clone the repo
```
git clone <your-repo-url> spendwise
cd spendwise
```

---

## 4) Set up PostgreSQL (Docker)
Run Postgres in Docker:
```
docker run --name spendwise-postgres \
  -e POSTGRES_USER=spendwise \
  -e POSTGRES_PASSWORD=spendwise_pass \
  -e POSTGRES_DB=spendwise_db \
  -p 5432:5432 \
  -d postgres:16
```

**DATABASE_URL will be:**
```
postgres://spendwise:spendwise_pass@localhost:5432/spendwise_db
```

---

## 5) Create `.env`
Create `.env` in the repo root:

```
DATABASE_URL=postgres://spendwise:spendwise_pass@localhost:5432/spendwise_db
SESSION_SECRET=<random-long-string>

OPENAI_API_KEY=replace_me
OPENAI_MODEL=gpt-4o-mini
APP_BASE_URL=https://your-domain.com
ENABLE_SUMMARY_JOB=true

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=SpendWisely <your_gmail@gmail.com>

# Admin endpoints (disable in production)
ENABLE_ADMIN_ENDPOINTS=false
ADMIN_TOKEN=replace_me

# Admin UI (local testing only)
VITE_ENABLE_ADMIN_UI=false
VITE_ADMIN_TOKEN=replace_me
```

Generate secure tokens:
```
openssl rand -hex 32
```

---

## 6) Build the app image
```
docker build -t spendwise:latest .
```

---

## 7) Run database migrations
```
docker run --rm --env-file .env spendwise:latest npm run db:push
```

---

## 8) Run the app
```
docker run -d \
  --name spendwise \
  --env-file .env \
  -p 5000:5000 \
  --restart unless-stopped \
  spendwise:latest
```

Check health:
```
curl http://localhost:5000/api/health
```

---

## 9) Enable HTTPS with Caddy (recommended)
### Install Caddy
```
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### Configure Caddy
Edit `/etc/caddy/Caddyfile`:
```
your-domain.com {
  reverse_proxy 127.0.0.1:5000
}
```

Restart Caddy:
```
sudo systemctl restart caddy
```

Now your app is available at:
```
https://your-domain.com
```

---

## 10) Verify scheduled summaries
The job runs at **00:10 Australia/Melbourne** on the **1st of each month**.

---

## 11) Required packages summary
Installed on the VM:
- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`
- `git`, `curl`, `gnupg`, `ca-certificates`, `lsb-release`
- `caddy` (for HTTPS reverse proxy)

Inside Docker images:
- `node` (included in Dockerfile build/runtime)
- `postgres` (if using Docker for DB)

---

## 12) Useful commands
```
docker logs -f spendwise
docker restart spendwise
docker ps
```
