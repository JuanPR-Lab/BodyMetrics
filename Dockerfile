# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

# Copy built assets from the builder stage
COPY --from=builder /app/build build/
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the internal port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the server
CMD [ "node", "build" ]