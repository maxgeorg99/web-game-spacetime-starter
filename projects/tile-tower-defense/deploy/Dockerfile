FROM oven/bun:1.3.12-debian
ARG SPACETIME_VERSION=2.10.2
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates nodejs \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.local/bin:${PATH}"
RUN curl --fail --silent --show-error --location https://install.spacetimedb.com -o /tmp/install-spacetime.sh \
    && sh /tmp/install-spacetime.sh --yes \
    && spacetime version install ${SPACETIME_VERSION} \
    && spacetime version use ${SPACETIME_VERSION}
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY shared ./shared
COPY spacetimedb ./spacetimedb
RUN cd spacetimedb && bun install
COPY src/coordinator_bindings ./src/coordinator_bindings
COPY scripts/provisioner.ts ./scripts/provisioner.ts
ENV SPACETIME_SERVER="maincloud" \
    SPACETIME_PUBLIC_URI="wss://maincloud.spacetimedb.com" \
    SPACETIME_COORDINATOR="tiled-tower-defense"
# Inject SPACETIME_ADMIN_TOKEN at runtime; never bake publishing credentials into the image.
CMD ["bun", "run", "scripts/provisioner.ts"]
