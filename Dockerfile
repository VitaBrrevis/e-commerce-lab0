FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY migrations ./migrations
COPY lib ./lib
COPY index.js ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
