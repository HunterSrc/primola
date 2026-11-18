FROM node:20-alpine

WORKDIR /app

# Installa solo le dipendenze di produzione
COPY package*.json ./
RUN npm ci --omit=dev

# Copia i sorgenti dell'applicazione e gli script db
COPY src/ ./src/
COPY db/ ./db/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
