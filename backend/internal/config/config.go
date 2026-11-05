package config

import (
	"fmt"
	"os"
	"time"
)

const (
	defaultPort     = "8080"
	defaultTimezone = "Asia/Colombo"
)

// Config holds the settings read from environment variables.
type Config struct {
	Port     string
	Location *time.Location
}

// Load reads the configuration from the environment.
func Load() (Config, error) {
	timezone := getEnv("APP_TIMEZONE", defaultTimezone)

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return Config{}, fmt.Errorf("load time zone %q: %w", timezone, err)
	}

	return Config{
		Port:     getEnv("PORT", defaultPort),
		Location: location,
	}, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
