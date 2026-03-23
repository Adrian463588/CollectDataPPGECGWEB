// ============================================================
// Config — Unit Tests
// ============================================================
package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	// Clear env to test defaults
	os.Unsetenv("PORT")
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("ADMIN_API_KEY")
	os.Unsetenv("CORS_ORIGINS")
	os.Unsetenv("RATE_LIMIT_RPS")
	os.Unsetenv("ENABLE_DEV_CONTROLS")

	cfg := Load()

	if cfg.Port != "8081" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8081")
	}
	if cfg.DatabaseURL != "postgres://expctrl:expctrl@localhost:5432/expctrl?sslmode=disable" {
		t.Errorf("DatabaseURL = %q, want default", cfg.DatabaseURL)
	}
	if cfg.AdminAPIKey != "change-me-in-production" {
		t.Errorf("AdminAPIKey = %q, want default", cfg.AdminAPIKey)
	}
	if len(cfg.CORSOrigins) != 1 || cfg.CORSOrigins[0] != "http://localhost:3000" {
		t.Errorf("CORSOrigins = %v, want [http://localhost:3000]", cfg.CORSOrigins)
	}
	if cfg.RateLimitRPS != 100 {
		t.Errorf("RateLimitRPS = %d, want 100", cfg.RateLimitRPS)
	}
	if cfg.EnableDevControls {
		t.Error("EnableDevControls should default to false")
	}
}

func TestLoad_EnvOverrides(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("ADMIN_API_KEY", "secret-key")
	os.Setenv("CORS_ORIGINS", "http://a.com,http://b.com")
	os.Setenv("RATE_LIMIT_RPS", "50")
	os.Setenv("ENABLE_DEV_CONTROLS", "true")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("ADMIN_API_KEY")
		os.Unsetenv("CORS_ORIGINS")
		os.Unsetenv("RATE_LIMIT_RPS")
		os.Unsetenv("ENABLE_DEV_CONTROLS")
	}()

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("Port = %q, want %q", cfg.Port, "9090")
	}
	if cfg.AdminAPIKey != "secret-key" {
		t.Errorf("AdminAPIKey = %q, want %q", cfg.AdminAPIKey, "secret-key")
	}
	if len(cfg.CORSOrigins) != 2 {
		t.Errorf("CORSOrigins len = %d, want 2", len(cfg.CORSOrigins))
	}
	if cfg.RateLimitRPS != 50 {
		t.Errorf("RateLimitRPS = %d, want 50", cfg.RateLimitRPS)
	}
	if !cfg.EnableDevControls {
		t.Error("EnableDevControls should be true")
	}
}

func TestGetEnv_Fallback(t *testing.T) {
	os.Unsetenv("TEST_NONEXISTENT_KEY")
	val := getEnv("TEST_NONEXISTENT_KEY", "default_value")
	if val != "default_value" {
		t.Errorf("getEnv() = %q, want %q", val, "default_value")
	}
}

func TestGetEnv_EnvSet(t *testing.T) {
	os.Setenv("TEST_KEY", "env_value")
	defer os.Unsetenv("TEST_KEY")

	val := getEnv("TEST_KEY", "default_value")
	if val != "env_value" {
		t.Errorf("getEnv() = %q, want %q", val, "env_value")
	}
}

func TestGetEnvInt_Fallback(t *testing.T) {
	os.Unsetenv("TEST_INT_KEY")
	val := getEnvInt("TEST_INT_KEY", 42)
	if val != 42 {
		t.Errorf("getEnvInt() = %d, want %d", val, 42)
	}
}

func TestGetEnvInt_ValidInt(t *testing.T) {
	os.Setenv("TEST_INT_KEY", "99")
	defer os.Unsetenv("TEST_INT_KEY")

	val := getEnvInt("TEST_INT_KEY", 42)
	if val != 99 {
		t.Errorf("getEnvInt() = %d, want %d", val, 99)
	}
}

func TestGetEnvInt_InvalidInt_UsesFallback(t *testing.T) {
	os.Setenv("TEST_INT_KEY", "not_a_number")
	defer os.Unsetenv("TEST_INT_KEY")

	val := getEnvInt("TEST_INT_KEY", 42)
	if val != 42 {
		t.Errorf("getEnvInt() = %d, want fallback %d", val, 42)
	}
}
