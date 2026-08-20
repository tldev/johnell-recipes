# Build: render the static site with Node (no npm dependencies).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json build.mjs ./
COPY src ./src
COPY test ./test
COPY static ./static
# Tests run at image-build time too, so a broken build can never ship.
RUN node --test && node build.mjs

# Serve: unprivileged nginx on 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
ARG GIT_SHA=dev
LABEL org.opencontainers.image.title="johnell-recipes" \
      org.opencontainers.image.description="The Johnell family cookbook as a static website" \
      org.opencontainers.image.revision="${GIT_SHA}"
EXPOSE 8080
