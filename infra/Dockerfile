FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend .
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY src/backend/package*.json ./
RUN npm install
COPY src/backend .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./src/frontend/dist
RUN mkdir -p logs

EXPOSE 3002
CMD ["node", "dist/server.js"]
