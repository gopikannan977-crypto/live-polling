package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	MongoURI    string
	DBName      string
	RedisURL    string
	JWTSecret   string
	FrontendURL string
	Environment string
}

func LoadConfig() *Config {
	// Attempt to load .env file if present, non-blocking
	if err := godotenv.Load(); err != nil {
		log.Println("[Config] No .env file found, using system environment variables")
	}

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		MongoURI:    getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		DBName:      getEnv("MONGODB_DATABASE", "pulsepoll"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "pulsepoll-production-jwt-secret-key-replace-in-env"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		Environment: getEnv("ENV", "development"),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
