FROM node:20.6
WORKDIR /app
COPY . .
RUN npm install && npm run build && npm run build:front
CMD ["node", "."]
