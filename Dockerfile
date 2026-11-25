FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-humanizer.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-humanizer.txt
RUN useradd -m -u 10001 learner && mkdir -p /app/data && chown learner:learner /app/data
COPY server ./server
COPY content ./content
COPY --from=web /app/dist ./dist
USER learner
EXPOSE 8000
CMD ["uvicorn","server.app:app","--host","0.0.0.0","--port","8000"]
