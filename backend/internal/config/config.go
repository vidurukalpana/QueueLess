package config

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

const (
	defaultPort        = "8080"
	defaultTimezone    = "Asia/Colombo"
	defaultFrontendURL = "http://localhost:5173"
	envFile            = "../.env"
)

// Config holds the settings read from environment variables.
type Config struct {
	Port        string
	Location    *time.Location
	FrontendURL string
	DatabaseURL string
}

// Load reads the configuration from the environment.
func Load() (Config, error) {
	// Production has no .env file; the host provides the variables.
	if err := godotenv.Load(envFile); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("read %s: %w", envFile, err)
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	timezone := getEnv("APP_TIMEZONE", defaultTimezone)

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return Config{}, fmt.Errorf("load time zone %q: %w", timezone, err)
	}

	return Config{
		Port:        getEnv("PORT", defaultPort),
		Location:    location,
		FrontendURL: getEnv("FRONTEND_URL", defaultFrontendURL),
		DatabaseURL: databaseURL,
	}, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
