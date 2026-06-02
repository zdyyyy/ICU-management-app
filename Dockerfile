# --- build stage: install production dependencies only ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime stage: small image, non-root user ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Application source
COPY src ./src

# Offline guideline pipeline scripts (optional in container; useful for init Jobs)
COPY scripts ./scripts

# RAG assets: PDFs + CSV + embedded chunks (build image after local embed, or mount a PVC)
COPY data/guidelines ./data/guidelines

# Non-root for cluster security policies
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs \
  && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
# No extra packages: use Node for the container-level health check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/index.js"]
