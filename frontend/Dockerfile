FROM node:20-alpine as builder

COPY . /app
WORKDIR /app
RUN npm install
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
