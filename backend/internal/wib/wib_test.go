// ============================================================
// WIB — Unit Tests
// ============================================================
package wib

import (
	"testing"
	"time"
)

func TestNow_ReturnsWIBTimezone(t *testing.T) {
	now := Now()
	zoneName, offset := now.Zone()
	if offset != 7*3600 {
		t.Errorf("expected UTC+7 offset (25200s), got %d (%s)", offset, zoneName)
	}
}

func TestFormat_OutputFormat(t *testing.T) {
	// 2025-01-15 10:30:45.123 WIB
	loc := Location()
	input := time.Date(2025, 1, 15, 10, 30, 45, 123_000_000, loc)
	result := Format(input)
	expected := "2025-01-15 10:30:45.123"
	if result != expected {
		t.Errorf("Format() = %q, want %q", result, expected)
	}
}

func TestFormatISO_OutputFormat(t *testing.T) {
	loc := Location()
	input := time.Date(2025, 6, 20, 14, 5, 30, 500_000_000, loc)
	result := FormatISO(input)
	expected := "2025-06-20T14:05:30.500+07:00"
	if result != expected {
		t.Errorf("FormatISO() = %q, want %q", result, expected)
	}
}

func TestFormatISO_ConvertsUTCToWIB(t *testing.T) {
	// 03:00 UTC = 10:00 WIB
	utcTime := time.Date(2025, 3, 1, 3, 0, 0, 0, time.UTC)
	result := FormatISO(utcTime)
	expected := "2025-03-01T10:00:00.000+07:00"
	if result != expected {
		t.Errorf("FormatISO(UTC 03:00) = %q, want %q", result, expected)
	}
}

func TestLocation_ReturnsJakarta(t *testing.T) {
	loc := Location()
	if loc == nil {
		t.Fatal("Location() returned nil")
	}
	if loc.String() != "Asia/Jakarta" {
		t.Errorf("Location() = %q, want %q", loc.String(), "Asia/Jakarta")
	}
}

func TestUnixMsToTime_RoundTrip(t *testing.T) {
	original := int64(1700000000000) // Nov 14, 2023 ~22:13 WIB
	result := UnixMsToTime(original)
	roundTripped := TimeToUnixMs(result)
	if roundTripped != original {
		t.Errorf("round-trip failed: got %d, want %d", roundTripped, original)
	}
}

func TestTimeToUnixMs(t *testing.T) {
	loc := Location()
	// 2025-01-01 00:00:00 WIB = 2024-12-31 17:00:00 UTC
	input := time.Date(2025, 1, 1, 0, 0, 0, 0, loc)
	ms := TimeToUnixMs(input)
	if ms <= 0 {
		t.Errorf("TimeToUnixMs returned non-positive value: %d", ms)
	}
}

func TestComputeOffset(t *testing.T) {
	serverTime := time.UnixMilli(1700000001000)
	clientTimeMs := int64(1700000000000)
	offset := ComputeOffset(serverTime, clientTimeMs)
	if offset != 1000 {
		t.Errorf("ComputeOffset() = %d, want 1000", offset)
	}
}

func TestComputeOffset_ClientAhead(t *testing.T) {
	serverTime := time.UnixMilli(1700000000000)
	clientTimeMs := int64(1700000001000)
	offset := ComputeOffset(serverTime, clientTimeMs)
	if offset != -1000 {
		t.Errorf("ComputeOffset() = %d, want -1000", offset)
	}
}
