# Multi-stage Dockerfile for Go Gin Backend
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod ./
# If go.sum exists, copy it as well
COPY go.s* ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server ./cmd/server

# Final Minimal Distroless / Alpine Image
FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/bin/server /app/server

EXPOSE 8080

CMD ["/app/server"]
