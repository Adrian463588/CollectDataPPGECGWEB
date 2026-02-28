// ============================================================
// Config — Environment-based configuration
// ============================================================
package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port              string
	DatabaseURL       string
	AdminAPIKey       string
	CORSOrigins       []string
	RateLimitRPS      int
	EnableDevControls bool
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://expctrl:expctrl@localhost:5432/expctrl?sslmode=disable"),
		AdminAPIKey:       getEnv("ADMIN_API_KEY", "change-me-in-production"),
		CORSOrigins:       strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		RateLimitRPS:      getEnvInt("RATE_LIMIT_RPS", 100),
		EnableDevControls: getEnv("ENABLE_DEV_CONTROLS", "false") == "true",
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}
