// ============================================================
// Middleware — Admin auth
// ============================================================
package server

import (
	"encoding/json"
	"net/http"
)

// AdminAuth middleware checks for valid admin API key.
func AdminAuth(apiKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get("X-Admin-Key")
			if key == "" || key != apiKey {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]string{
						"code":    "UNAUTHORIZED",
						"message": "Invalid or missing X-Admin-Key header",
					},
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// DevControlsGuard middleware blocks requests when dev controls are disabled.
func DevControlsGuard(enabled bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !enabled {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]string{
						"code":    "DEV_CONTROLS_DISABLED",
						"message": "Development controls are disabled in this environment",
					},
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

