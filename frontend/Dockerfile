# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build-time arguments (Vite needs these to be available during build)
ARG VITE_API_BASE_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

# Map them to environment variables
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source code and build the application
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output to Nginx's default public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx configuration from local context
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
