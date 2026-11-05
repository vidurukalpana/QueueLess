package config

import (
	"fmt"
	"os"
	"time"
)

const (
	defaultPort        = "8080"
	defaultTimezone    = "Asia/Colombo"
	defaultFrontendURL = "http://localhost:5173"
)

// Config holds the settings read from environment variables.
type Config struct {
	Port        string
	Location    *time.Location
	FrontendURL string
}

// Load reads the configuration from the environment.
func Load() (Config, error) {
	timezone := getEnv("APP_TIMEZONE", defaultTimezone)

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return Config{}, fmt.Errorf("load time zone %q: %w", timezone, err)
	}

	return Config{
		Port:        getEnv("PORT", defaultPort),
		Location:    location,
		FrontendURL: getEnv("FRONTEND_URL", defaultFrontendURL),
	}, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
