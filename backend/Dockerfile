FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate
EXPOSE 3002
ENV PORT=3002
CMD ["npm", "run", "start:dev"]
