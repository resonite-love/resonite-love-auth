FROM node:20.6
WORKDIR /app
COPY . .
COPY .github/ssh_config /root/.ssh/config
COPY .github/id_rsa /root/.ssh/id_rsa
RUN chmod 600 /root/.ssh/config
RUN chmod 600 /root/.ssh/id_rsa
RUN npm install && npm run build && npm run build:front
CMD ["node", "."]
