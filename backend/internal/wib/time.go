// ============================================================
// WIB — Western Indonesian Time helpers
// ============================================================
package wib

import (
	"fmt"
	"time"
)

var jakartaLoc *time.Location

func init() {
	var err error
	jakartaLoc, err = time.LoadLocation("Asia/Jakarta")
	if err != nil {
		panic(fmt.Sprintf("failed to load Asia/Jakarta timezone: %v", err))
	}
}

// Now returns current time in WIB.
func Now() time.Time {
	return time.Now().In(jakartaLoc)
}

// Format formats a time in WIB with millisecond precision.
// Output: "2006-01-02 15:04:05.000"
func Format(t time.Time) string {
	return t.In(jakartaLoc).Format("2006-01-02 15:04:05.000")
}

// FormatISO formats a time in WIB as ISO 8601 with timezone.
// Output: "2006-01-02T15:04:05.000+07:00"
func FormatISO(t time.Time) string {
	return t.In(jakartaLoc).Format("2006-01-02T15:04:05.000+07:00")
}

// Location returns the Asia/Jakarta location.
func Location() *time.Location {
	return jakartaLoc
}

// UnixMsToTime converts Unix milliseconds to time.Time.
func UnixMsToTime(ms int64) time.Time {
	return time.UnixMilli(ms).In(jakartaLoc)
}

// TimeToUnixMs converts time.Time to Unix milliseconds.
func TimeToUnixMs(t time.Time) int64 {
	return t.UnixMilli()
}

// ComputeOffset computes the offset between server and client time in ms.
// offset = server_ms - client_ms
func ComputeOffset(serverTime time.Time, clientTimeMs int64) int64 {
	return serverTime.UnixMilli() - clientTimeMs
}
