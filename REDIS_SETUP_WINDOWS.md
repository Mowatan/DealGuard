# Redis Setup for Windows

## Why Redis is Needed
Redis is used as the message queue for asynchronous email sending. When a deal is created, the email notification job is added to Redis, and a background worker processes it.

## Option 1: Docker (Recommended)

### Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and restart
3. Run Redis:

```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### Verify:
```bash
docker ps
# Should show redis container running
```

## Option 2: WSL (Windows Subsystem for Linux)

### Install WSL
```powershell
# Run in PowerShell as Administrator
wsl --install
```

### Install Redis in WSL
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server -y

# Start Redis
sudo service redis-server start

# Verify
redis-cli ping
# Should return: PONG
```

### Auto-start Redis
Add to `~/.bashrc`:
```bash
sudo service redis-server start
```

## Option 3: Native Windows (Redis Stack)

### Install Redis Stack
1. Download from: https://redis.io/download/
2. Choose "Redis Stack" for Windows
3. Or use Chocolatey:

```powershell
choco install redis-stack-server
```

### Start Redis
```powershell
redis-stack-server
```

## Verify Redis is Working

```bash
# Test connection
redis-cli ping
# Should return: PONG

# Test basic operations
redis-cli
> SET test "Hello"
> GET test
> exit
```

## Configure for DealGuard

Your `.env` already has the correct Redis URL:
```env
REDIS_URL="redis://localhost:6379"
```

## Start Backend with Redis

```bash
# Terminal 1: Start Redis (Docker)
docker start redis

# Or WSL
sudo service redis-server start

# Terminal 2: Start Backend
cd fouad-ai/backend
npm run dev
```

## Check Logs
The backend will log when Redis connects:
```
✅ Queue workers started
```

## Troubleshooting

### "Redis connection failed"
1. Ensure Redis is running: `redis-cli ping`
2. Check port 6379 is not blocked
3. Try restarting Redis

### "ECONNREFUSED"
1. Redis is not running
2. Start Redis using one of the methods above

### Performance Issues
- Redis should use minimal resources
- Check with: `redis-cli INFO memory`
- For production, consider Redis Cloud or AWS ElastiCache

## Production Deployment

For production, use a managed Redis service:
- **Redis Cloud** (free tier available)
- **AWS ElastiCache**
- **Azure Cache for Redis**
- **Google Cloud Memorystore**

Update `.env` with production Redis URL:
```env
REDIS_URL="redis://username:password@your-redis-host:6379"
```

## Next Steps

1. [ ] Install Redis (choose Option 1, 2, or 3)
2. [ ] Verify: `redis-cli ping`
3. [ ] Start backend: `npm run dev`
4. [ ] Check logs for "Queue workers started"
5. [ ] Test emails: `npm run test:deal-email`
